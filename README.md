# ChartFlow

An intelligent dental charting application that leverages AI to streamline clinical workflows, manage patient records, and generate comprehensive clinical notes.

## Overview

ChartFlow is a full-stack application designed for dental professionals to efficiently manage patient charts, convert audio recordings into clinical notes, and analyze dental examination data using AI-powered tools. The platform combines a modern React frontend with a Python FastAPI backend powered by Google Gemini LLM.

## Features

- **Intelligent Chart Analysis** - AI-powered analysis of dental examination charts
- **Audio-to-Notes** - Convert clinical audio recordings to structured notes using speech-to-text
- **Chart Extraction** - Automatically extract chart data from clinical notes
- **Note Generation** - AI-assisted generation of comprehensive clinical notes
- **Secure Authentication** - JWT-based authentication via Supabase
- **Patient Dashboard** - Overview of patient statistics and recent activity
- **File Management** - Upload and manage patient files
- **Real-time Updates** - Live synchronization with Supabase database

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Supabase JS Client** - Database and auth
- **React Dropzone** - File upload handling
- **React Odontogram** - Dental chart visualization

### Backend
- **FastAPI** - Web framework
- **Python 3.x** - Runtime
- **LangChain** - LLM orchestration
- **Google Gemini API** - Large language model
- **Deepgram SDK** - Speech-to-text processing
- **Supabase** - Database and auth backend
- **spaCy & Presidio** - NLP and PII anonymization

## Project Structure

```
project/
├── chartflow/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── audio/        # Audio input handling
│   │   │   ├── file_upload/  # File upload components
│   │   │   ├── layout/       # Header, Sidebar
│   │   │   └── notes/        # Note editor
│   │   ├── pages/            # Page components
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ChartsPage.jsx
│   │   │   ├── NotesPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── Login.jsx
│   │   ├── lib/              # Utilities (Supabase client)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── agent/                     # Python backend
│   ├── app.py                # FastAPI application
│   ├── agent.py              # AI agent orchestration
│   ├── requirements.txt       # Python dependencies
│   └── tools/
│       ├── chart_parser.py   # Chart analysis tools
│       └── note_generator.py # Note generation tools
├── make_audio.py             # Audio generation utility
├── previewConfig.json        # Preview configuration
└── README.md
```

## Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn
- Supabase account
- Google Gemini API key
- Deepgram API key

### Backend Setup

1. Navigate to the agent directory:
```bash
cd agent
```

2. Create and activate a Python virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the agent directory with the following variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

5. Start the backend server:
```bash
uvicorn app:app --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the chartflow directory:
```bash
cd chartflow
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the chartflow directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Running the Application

### Development Mode

**Terminal 1 (Backend):**
```bash
cd agent
source .venv/bin/activate
uvicorn app:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd chartflow
npm run dev
```

### Production Build

**Frontend:**
```bash
cd chartflow
npm run build
npm run preview
```

**Backend:**
```bash
cd agent
uvicorn app:app --host 0.0.0.0 --port 8000
```

## API Endpoints

The backend provides REST API endpoints for chart analysis, note generation, and chart extraction. All endpoints require JWT authentication.

Key endpoints:
- `POST /analyze-chart` - Analyze a dental chart
- `POST /extract-chart` - Extract chart data from clinical notes
- `POST /generate-notes` - Generate clinical notes from chart data
- `POST /upload` - Upload patient files
- `GET /dashboard` - Retrieve dashboard statistics

## Environment Variables

### Backend (.env in `/agent`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `GEMINI_API_KEY` - Google Gemini API key
- `DEEPGRAM_API_KEY` - Deepgram API key

### Frontend (.env in `/chartflow`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

## Database Schema

The application uses Supabase PostgreSQL database with the following primary tables:
- `profiles` - User profiles
- `notes` - Clinical notes
- `charts` - Dental charts
- `patients` - Patient information

## Authentication

Authentication is handled through Supabase Auth with JWT tokens. The backend validates tokens using Supabase's JWT public key endpoint.

## Development

### Linting

**Frontend:**
```bash
cd chartflow
npm run lint
```

### Code Style

The project uses ESLint and Tailwind CSS for code quality and styling consistency.

## Common Tasks

### Adding a New Tool

1. Create a new tool file in `agent/tools/`
2. Define the tool function following the LangChain format
3. Import and register the tool in `app.py`

### Adding a New Frontend Page

1. Create a new component in `chartflow/src/pages/`
2. Add the route in `App.jsx`
3. Update the navigation in `Sidebar.jsx`

### Configuring Audio Processing

Edit `make_audio.py` to test audio generation and text-to-speech functionality.

## Troubleshooting

**Backend won't start:**
- Ensure all environment variables are set
- Verify Python dependencies are installed: `pip install -r requirements.txt`
- Check that port 8000 is available

**Frontend won't connect to backend:**
- Verify the backend is running on `http://localhost:8000`
- Check CORS configuration in `app.py`
- Ensure JWT tokens are being sent with requests

**Supabase connection errors:**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check your Supabase project is active

