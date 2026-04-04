from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate

from typing import TypedDict

# take in appointment transcription
# generate summarized note, outputted into particular fields for UI
# INPUT: transcription: str
# OUTPUT: {"chief_complaint": "Tooth hurt", "subjective": "yuh", etc....}

class Note(TypedDict):
    chief_complaint: str
    patient_history: str
    subjective: str
    objective: str
    assessment: str
    plan: str
    additional_notes: str

def create_note_generator_tool(llm):
    """
    Wraps the tool so you can inject your Gemini LLM from agent.py 
    without causing circular import errors.
    """
    
    @tool
    def note_generator(transcription: str) -> Note:
        """Take all important details from an audio transcription and output into structured data.
        
        Args:
            transcription: Given audio transcription
        """
        # Bind the TypedDict to your existing Gemini LLM to force JSON output
        structured_llm = llm.with_structured_output(Note)
        
        system_prompt = """You are an expert dental scribe. Analyze the following appointment transcription and extract the information into a structured clinical note. 
        
        If a specific section is not mentioned in the transcript, return an empty string ("") for that field. Do not make up information.

        CRITICAL RULE: Completely ignore any technical transcription artifacts, timecodes, or bracketed text (e.g., [DURATION_1], [silence]). Do not include them in your output.
        
        Structure your output strictly according to these definitions:
        - chief_complaint: The primary reason for the patient's visit.
        - patient_history: Relevant medical or dental history mentioned.
        - subjective: Patient's reported symptoms, pain levels, feelings, and experiences.
        - objective: Clinical findings, exact tooth numbers, measurements, and observable facts by the dentist.
        - assessment: The dentist's diagnosis or interpretation of the problem.
        - plan: Proposed treatment, next steps, prescriptions, or referrals.
        - additional_notes: Any other remarks, follow-up instructions, or patient preferences."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Transcription: {transcription}")
        ])
        
        chain = prompt | structured_llm
        
        return chain.invoke({"transcription": transcription})
        
    return note_generator