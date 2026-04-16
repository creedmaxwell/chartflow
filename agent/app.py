import os
import tempfile
import uvicorn
import re
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

# Import the standalone tools for programmatic extraction
from tools.chart_parser import create_analyze_chart_tool, create_extract_chart_tool
from tools.note_generator import create_note_generator_tool
# Import the conversational agent orchestrator
from agent import build_agent 

from deepgram import DeepgramClient

load_dotenv()

app = FastAPI()

# ================= 1. INITIALIZE SHARED LLM & TOOLS =================
api_key = os.getenv("GEMINI_API_KEY")
gemini_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=api_key, temperature=0)

analyze_dental_chart = create_analyze_chart_tool(gemini_llm)
extract_chart_from_note = create_extract_chart_tool(gemini_llm)
note_generator = create_note_generator_tool(gemini_llm)

tools_list = [analyze_dental_chart, extract_chart_from_note, note_generator]

# ================= 2. COMPILE AGENT =================
# We hand the initialized LLM and tools to the agent
dental_agent = build_agent(gemini_llm, tools_list)

# ================= CORS CONFIGURATION =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= SUPABASE =================
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url or "", supabase_key or "")

# ================== DEEPGRAM =================
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

deepgram_client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

# ================= MODELS =================
class ChartProcessRequest(BaseModel):
    chart_id: str
    file_path: str

class NoteToChartRequest(BaseModel):
    user_id: str
    patient_name: str
    date: str
    note_text: str

# ================= ENDPOINTS =================

@app.post("/api/process-transcript")
async def process_transcription(audio_file: UploadFile = File(...)):
    try:
        buffer_data = await audio_file.read()

        response = deepgram_client.listen.v1.media.transcribe_file(
            request=buffer_data,        #audio_file.read(),
            model="nova-3-medical",
            language="en",
            smart_format=True,
            redact=["pii"],
            filler_words=True,
        )

        transcript_text = response.results.channels[0].alternatives[0].transcript

        # This removes [DURATION_1], [DURATION_2], [SILENCE], etc.
        clean_transcript = re.sub(r'\[.*?\]', '', transcript_text).strip()

        structured_note = note_generator.invoke({"transcription": clean_transcript})

        return {
            "status": "success", 
            "raw_transcript": clean_transcript,
            "structured_note": structured_note
        }
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process audio")


@app.post("/api/process-chart")
async def process_chart(request: ChartProcessRequest):
    temp_dir = tempfile.gettempdir()
    file_name = request.file_path.split('/')[-1]
    temp_file_path = os.path.join(temp_dir, file_name)
    
    try:
        file_data = supabase.storage.from_("chart-uploads").download(request.file_path)
        with open(temp_file_path, "wb") as f:
            f.write(file_data)
            
        result = analyze_dental_chart.invoke({"file_path": temp_file_path})
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        extracted_data = result["data"]
        teeth_to_upsert = []
        
        for tooth in extracted_data.get("teeth", []):
            teeth_to_upsert.append({
                "chart_id": request.chart_id,
                "tooth_id": tooth["tooth_id"], 
                "surfaces": tooth.get("surfaces") or {},
                "conditions": tooth.get("conditions", []),
                "notes": tooth.get("notes", "Extracted by AI Agent")
            })
            
        if teeth_to_upsert:
            supabase.table("chart_teeth").upsert(teeth_to_upsert, on_conflict="chart_id,tooth_id").execute()
            
        supabase.table("chart_uploads").update({"status": "completed"}).eq("file_path", request.file_path).execute()
        return {"status": "success", "message": "Chart processed successfully"}

    except Exception as e:
        supabase.table("chart_uploads").update({"status": "failed", "error_message": str(e)}).eq("file_path", request.file_path).execute()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/api/chart-from-note")
async def generate_chart_from_note(request: NoteToChartRequest):
    try:
        # create chart record in database
        chart_response = supabase.table("charts").insert({
            "user_id": request.user_id,
            "patient_name": request.patient_name,
            "date": request.date,
            "status": "In Progress"
        }).execute()

        if not hasattr(chart_response, 'data') or not chart_response.data:
            raise HTTPException(status_code=500, detail="Failed to create chart record in database.")
        
        new_chart_id = chart_response.data[0]["id"]

        result = extract_chart_from_note.invoke({"note_text": request.note_text})
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        extracted_data = result["data"]
        
        teeth_to_upsert = []
        for tooth in extracted_data.get("teeth", []):
            teeth_to_upsert.append({
                "chart_id": new_chart_id,
                "tooth_id": tooth["tooth_id"],
                "surfaces": tooth.get("surfaces") or {},
                "conditions": tooth.get("conditions", []),
                "notes": tooth.get("notes", "Auto-extracted from clinical note.")
            })
            
        if teeth_to_upsert:
            supabase.table("chart_teeth").upsert(teeth_to_upsert, on_conflict="chart_id,tooth_id").execute()

        return {"status": "success", "chart_id": new_chart_id, "message": "Chart generated!"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= RUN SERVER =================
if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)