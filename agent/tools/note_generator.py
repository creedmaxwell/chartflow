from langchain_core.tools import tool

from typing import TypedDict

# take in appointment transcription
# generate summarized note, outputted into particular fields for UI
# INPUT: transcription: str
# OUTPUT: {"chief_complaint": "Tooth hurt", "subjective": "yuh", etc....}
# patient names have to be omitted

class Note(TypedDict):
    chief_complaint: str
    subjective: str
    objective: str
    assessment: str
    plan: str

@tool
def note_generator(transcription: str) -> Note:
    """Take all important details from an audio transcription and output into structured data.
    
    Args:
        transcription: Given audio transcription
    """
    pass