import os
import tempfile
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Import the specialized tool directly instead of the conversational agent
from tools.chart_parser import analyze_dental_chart 

app = FastAPI()

# ================= CORS CONFIGURATION =================
# This is required so your React app (e.g., localhost:5173) can make POST requests here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change "*" to your actual React app domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ======================================================

# Initialize Supabase Python Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    print("WARNING: Supabase credentials not found in environment variables.")
    
supabase: Client = create_client(supabase_url, supabase_key)

class ChartProcessRequest(BaseModel):
    chart_id: str
    file_path: str

@app.post("/api/process-chart")
async def process_chart(request: ChartProcessRequest):
    temp_dir = tempfile.gettempdir()
    file_name = request.file_path.split('/')[-1]
    temp_file_path = os.path.join(temp_dir, file_name)
    
    try:
        # 1. Download the uploaded file directly from your Supabase bucket
        file_data = supabase.storage.from_("chart-uploads").download(request.file_path)
        
        with open(temp_file_path, "wb") as f:
            f.write(file_data)
            
        # 2. Trigger the Specialized Tool directly
        # This returns the clean dict: {"status": "success", "data": {...}}
        result = analyze_dental_chart.invoke({"file_path": temp_file_path})
        
        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result.get("message"))
            
        # This is your perfectly structured Chart Pydantic dictionary
        extracted_data = result["data"]
        
        # 3. Format the output to match your 'chart_teeth' database schema
        teeth_to_upsert = []
        
        # Updated to use the new 'teeth' key from our Pydantic model
        for tooth in extracted_data.get("teeth", []):
            teeth_to_upsert.append({
                "chart_id": request.chart_id,
                "tooth_id": tooth["tooth_id"], # Updated to match 'teeth-X' format
                "surfaces": tooth.get("surfaces") or {},
                "conditions": tooth.get("conditions", []),
                "notes": tooth.get("notes", "Extracted by AI Agent")
            })
            
        # 4. Save directly to Supabase
        if teeth_to_upsert:
            supabase.table("chart_teeth").upsert(
                teeth_to_upsert, 
                on_conflict="chart_id,tooth_id"
            ).execute()
            
        # Update the chart upload status to 'completed'
        supabase.table("chart_uploads").update({"status": "completed"}).eq("file_path", request.file_path).execute()

        return {"status": "success", "message": "Chart processed successfully"}

    except Exception as e:
        # Mark upload as failed in database if something goes wrong
        supabase.table("chart_uploads").update({
            "status": "failed", 
            "error_message": str(e)
        }).eq("file_path", request.file_path).execute()
        
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# ================= RUN SERVER =================
if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)