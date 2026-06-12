@echo off
echo Starting AI Interviewer Services...

REM ===============================
REM Start Backend
REM ===============================
start cmd /k "cd backend && npm run dev"

REM ===============================
REM Start Ollama + qwen2.5:1.5b
REM ===============================
start cmd /k "ollama run qwen2.5:1.5b"

REM ===============================
REM Start AI Service (FastAPI)
REM ===============================
start cmd /k "cd ai-service && venv\Scripts\activate && python main.py"

REM ===============================
REM Start Frontend
REM ===============================
start cmd /k "cd frontend && npm run dev"

echo All services launched 🚀
pause
