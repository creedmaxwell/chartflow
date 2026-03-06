import os
import pandas as pd
import base64
import fitz
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from typing_extensions import Self

from langchain_core.tools import tool
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# ====================================== SCHEMAS ======================================

ConditionType = Literal[
    'cavity', 'filling', 'crown', 'root_canal', 'missing', 
    'implant', 'bridge', 'sealant', 'watch', 'fracture', 'extraction_planned'
]

class SurfaceDetail(BaseModel):
    date: datetime = Field(description="The date and time the condition was recorded")
    condition: ConditionType = Field(description="The diagnosed condition for this surface")

class ToothSurfaces(BaseModel):
    buccal: Optional[SurfaceDetail] = Field(default=None, description="Surface towards the cheek")
    distal: Optional[SurfaceDetail] = Field(default=None, description="Surface away from the center of the mouth")
    mesial: Optional[SurfaceDetail] = Field(default=None, description="Surface towards the center of the mouth")
    lingual: Optional[SurfaceDetail] = Field(default=None, description="Surface towards the tongue")
    occlusal: Optional[SurfaceDetail] = Field(default=None, description="Chewing surface of the tooth")

class Tooth(BaseModel):
    tooth_id: str = Field(
        description="The unique identifier for the tooth, formatted exactly as 'teeth-X' (e.g., 'teeth-26').",
        pattern=r"^teeth-\d{1,2}$" 
    )
    
    surfaces: Optional[ToothSurfaces] = Field(
        default=None, 
        description="Populate this ONLY if the chart specifies conditions on exact surfaces (buccal, distal, etc.)."
    )
    
    conditions: List[ConditionType] = Field(
        default_factory=list,
        description="A list of general conditions for the whole tooth. Populate this ONLY if no specific surfaces are mentioned."
    )
    
    notes: Optional[str] = Field(
        default="",
        description="Any specific notes, observations, or text written about this specific tooth."
    )

    @field_validator('tooth_id')
    @classmethod
    def validate_tooth_number(cls, v: str) -> str:
        tooth_num = int(v.split('-')[1])
        if not (1 <= tooth_num <= 32):
            raise ValueError(f"Invalid tooth number: {tooth_num}. Must be between 1 and 32.")
        return v

    @model_validator(mode='after')
    def enforce_mutually_exclusive_conditions(self) -> Self:
        has_surfaces = False
        if self.surfaces:
             if any([self.surfaces.buccal, self.surfaces.distal, self.surfaces.mesial, self.surfaces.lingual, self.surfaces.occlusal]):
                 has_surfaces = True
                 
        has_general_conditions = len(self.conditions) > 0

        if has_surfaces and has_general_conditions:
            self.conditions = []
        return self

class Chart(BaseModel):
    teeth: List[Tooth] = Field(
        default_factory=list,
        description="A comprehensive list of all teeth that have recorded conditions, surfaces, or notes in the document."
    )

# ====================================== PREPROCESSING ======================================

def encode_image_to_base64(image_bytes):
    return base64.b64encode(image_bytes).decode('utf-8')

def parse_document(file_path: str) -> dict:
    """Reads the file and returns a dictionary tailored for the LLM node."""
    ext = file_path.split('.')[-1].lower()

    if ext in ['txt', 'json', 'xml', 'csv']:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"type": "text", "content": content}

    elif ext in ['xls', 'xlsx']:
        df = pd.read_excel(file_path)
        markdown_table = df.to_markdown(index=False)
        return {"type": "text", "content": markdown_table}

    elif ext in ['jpg', 'jpeg', 'png']:
        with open(file_path, "rb") as f:
            base64_img = encode_image_to_base64(f.read())
        return {"type": "image", "content": [base64_img]}

    elif ext == 'pdf':
        base64_pages = []
        pdf_document = fitz.open(file_path)
        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            base64_pages.append(encode_image_to_base64(pix.tobytes("png")))
        pdf_document.close()
        return {"type": "image", "content": base64_pages}

    else:
        raise ValueError(f"Unsupported file type: {ext}")

# ====================================== TOOL DEFINITION ======================================

@tool
def analyze_dental_chart(file_path: str) -> dict:
    """
    Parses a patient's dental chart file (PDF, Image, Text, Excel) and extracts the structured dental records.
    Provide the absolute file path to the document to be analyzed.
    """
    try:
        # 1. Parse the document based on its extension
        parsed_data = parse_document(file_path)
        
        # 2. Initialize the LLM specifically for this extraction task
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
        structured_llm = llm.with_structured_output(Chart)
        
        prompt_text = "Extract the patient dental chart data from the provided document. Follow the exact JSON schema."
        
        # 3. Build the multimodal or text message
        if parsed_data["type"] == "text":
            message = HumanMessage(content=f"{prompt_text}\n\nDocument Content:\n{parsed_data['content']}")
            
        elif parsed_data["type"] == "image":
            content_parts = [{"type": "text", "text": prompt_text}]
            for base64_img in parsed_data["content"]:
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{base64_img}"}
                })
            message = HumanMessage(content=content_parts)
        else:
            return {"error": "Invalid parsed data type."}

        # 4. Invoke the LLM
        result = structured_llm.invoke([message])
        
        # 5. Return the clean dictionary (Pydantic V2 syntax)
        return {"status": "success", "data": result.model_dump(mode="json")}

    except Exception as e:
        # Returning the error ensures the LangGraph agent doesn't crash, 
        # but instead sees the error and can tell the user what went wrong.
        return {"status": "error", "message": str(e)}