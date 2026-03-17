import os
import tempfile
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Import the standalone tools for programmatic extraction
from tools.chart_parser import analyze_dental_chart, extract_chart_from_note
# Import the conversational agent orchestrator
from agent import build_agent 

load_dotenv()

app = FastAPI()

# Compile the agent once on startup
dental_agent = build_agent()

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

# ================= MODELS =================
class ChartProcessRequest(BaseModel):
    chart_id: str
    file_path: str

class NoteToChartRequest(BaseModel):
    user_id: str
    patient_name: str
    date: str
    note_text: str

class ChatRequest(BaseModel):
    message: str
    thread_id: str

# ================= ENDPOINTS =================

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

# --- Chatting with Master Agent ---
@app.post("/api/chat")
async def chat_with_agent(request: ChatRequest):
    """
    This endpoint utilizes your full LangGraph agent. 
    You can send a message like "Can you parse the chart uploaded at /tmp/file.pdf?"
    and the agent will autonomously decide to use the tool, execute it, and reply.
    """
    try:
        config = {"configurable": {"thread_id": request.thread_id}}
        
        # Pass the user's message into the agent's state
        response = dental_agent.invoke(
            {"messages": [("user", request.message)]}, 
            config=config
        )
        
        # Get the final textual response from the agent
        agent_reply = response["messages"][-1].content
        return {"status": "success", "reply": agent_reply}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= RUN SERVER =================
if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)