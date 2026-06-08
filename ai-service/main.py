import uvicorn
import os
import json
import logging
import base64
import tempfile
import edge_tts
from faster_whisper import WhisperModel
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional
import ollama
from pydub import AudioSegment

logging.basicConfig(level=logging.INFO)

load_dotenv()

# Load Faster-Whisper model globally to avoid loading on every request
try:
    print("Loading Faster-Whisper Model (Base) ...")
    whisper_model = WhisperModel("base", device="auto", compute_type="int8")
    print("Faster-Whisper Model Loaded Successfully")
except Exception as e:
    print(f"Failed to load whisper model: {e}")
    whisper_model = None

AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", 8000))
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "mistral")

app = FastAPI(title="AI Interviewer Microservice", version="1.0")

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionResquest(BaseModel):
    role:str="MERN Stack Developer"
    level:str="Junior"
    count:int=5
    interview_type:str="coding-mix"


class QuestionResponse(BaseModel):
    questions:list[str]
    model_used:str

class EvaluationRequest(BaseModel):
    question:str
    question_type:str
    role:str
    level:str
    user_answer:Optional[str]=None
    user_code:Optional[str]=None

class EvaluationResponse(BaseModel):
    technicalScore:int
    confidenceScore:int
    aiFeedback:str
    idealAnswer:str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: Optional[str] = None  # current question context

class ChatResponse(BaseModel):
    reply: str
    model_used: str

class QuizRequest(BaseModel):
    role: str
    difficulty: str
    topic: str
    count: int = 5
    type: str

class QuizResponse(BaseModel):
    questions: list[dict]
    model_used: str

class SimulationChatRequest(BaseModel):
    config: dict
    resumeText: str
    history: list[dict]

class SimulationChatResponse(BaseModel):
    reply: str
    audioBase64: str | None = None
    model_used: str

class SimulationReportRequest(BaseModel):
    config: dict
    resumeText: str
    history: list[dict]

class SimulationReportResponse(BaseModel):
    report: dict
    model_used: str

@app.get("/")
async def root():
    return {"message":"Hello from AI Interviewer Microservice !","model":OLLAMA_MODEL_NAME}


@app.post("/generate-questions",response_model=QuestionResponse)
async def generate_questions(request:QuestionResquest):
   
    try:
        if request.interview_type=="coding-mix":
            coding_count=int(request.count*0.2)
            oral_oral=int(request.count)-int(coding_count)

            intruction=(
                f"The first {coding_count} questions MUST be coding challenge requiring function implementation."
                f"The remaining {oral_oral} questions MUST be conceptual oral questions."
            )
        else :
            intruction="All questions MUST be conceptual oral questions. Do Not generate any coding or implementation challenges."

        system_prompt=(
            "You are a professional technical interviewer. "
            "Task: Generate interview questions. No conversational text or numbering. "
            f"Crucial : {intruction}"
            "Output exactly one question per line. "
        )

        user_prompt=(
            f"Generate exactly {request.count} unique interview questions for a {request.level}  level {request.role} "
        )
        response=ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=user_prompt,
            system=system_prompt,
            options={"temperature":0.6}
        )

        raw_text=response['response'].strip()
        questions=[q.strip() for q in raw_text.split('\n') if q.strip()]
        return QuestionResponse(questions=questions[:request.count],model_used=OLLAMA_MODEL_NAME)

    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))
    
@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    try:
        system_prompt = (
            "You are a strict technical quiz generator. "
            "Output MUST be a valid JSON array of objects. Do not wrap in markdown or backticks. "
            "Each object MUST have the following keys: 'question', 'options' (array of 4 strings), 'correctAnswer' (string, exact match from options), 'explanation' (string). "
        )

        user_prompt = (
            f"Generate exactly {request.count} Multiple Choice Questions (MCQs) for a {request.difficulty} level {request.role} focusing strictly on {request.topic}. "
            f"Quiz type is {request.type}. "
        )

        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=user_prompt,
            system=system_prompt,
            format="json",
            options={"temperature": 0.4}
        )

        raw_text = response['response'].strip()
        
        try:
            questions_data = json.loads(raw_text)
            # if the model returned an object with a 'questions' key instead of a raw array, handle it
            if isinstance(questions_data, dict) and 'questions' in questions_data:
                questions_data = questions_data['questions']
            if not isinstance(questions_data, list):
                raise ValueError("AI did not return a JSON array.")
        except json.JSONDecodeError:
            import re
            fixed_text = re.sub(r'[\r\n\t]', ' ', raw_text)
            try:
                questions_data = json.loads(fixed_text)
                if isinstance(questions_data, dict) and 'questions' in questions_data:
                    questions_data = questions_data['questions']
            except:
                raise HTTPException(status_code=500, detail="Failed to parse AI response into JSON array.")

        # Ensure correct formatting
        formatted_questions = []
        for q in questions_data[:request.count]:
            if 'question' in q and 'options' in q and 'correctAnswer' in q:
                formatted_questions.append({
                    "question": str(q.get('question', '')),
                    "options": [str(opt) for opt in q.get('options', [])],
                    "correctAnswer": str(q.get('correctAnswer', '')),
                    "explanation": str(q.get('explanation', ''))
                })

        return QuizResponse(questions=formatted_questions, model_used=OLLAMA_MODEL_NAME)

    except Exception as e:
        print("Quiz Gen Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/transcribe")
async def transcribe_audio(file:UploadFile=File(...)):
    try:
        audio_bytes=await file.read()
        audio_in_memory=io.BytesIO(audio_bytes)
        audio_segment=AudioSegment.from_file(audio_in_memory)
        with tempfile.NamedTemporaryFile(delete=False,suffix=".mp3") as tmp:
            temp_audio_path=tmp.name
            audio_segment.export(temp_audio_path,format="mp3")
        if not WHISPER_MODEL:
            raise HTTPException(status_code=503,detail="Whisper Model is not loaded")
        
        result=WHISPER_MODEL.transcribe(temp_audio_path)
                
        os.remove(temp_audio_path)
        return {"transcription":result["text"].strip()}

    except Exception as e:
        if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500,detail=str(e))

@app.post("/evaluate",response_model=EvaluationResponse)
async def evaluate(request:EvaluationRequest):
    try:
        if request.question_type=="oral":
            assessment_intruction=(
                "This is a conceptual oral question. Focus purely on candidate's veral explanation. "
                "Ignore any code blocks. "
                "CRITICAL: If the transcript is empty, nonsense (e.g. 'blah blah','testing') or irrelevent to the question, SCORE 0."
            )
        else:
            assessment_intruction=(
                "This is a coding challenge question. Evaluate the code logic and efficiency. "
                "Use the transcription only for insight into their thought process. "
                "CRITICAL: If the code is 'udefined',empty, just random comments, or random characters, SCORE 0."
            )
        
        system_prompt=(
            "You are a sstrict technical interviewer. "
            "Do NOT hallucinate positive reviews for bad input. "
            "RULE 1: If the answer is gibberish, irrelevant, or missing, return 'technicalScore':0 and 'confidenceScore':0. "
            "RULE 2: For 'idealAnswer', provide a clean Markdown string.Do NOT return a nested JSON object. "
            f"Context:{assessment_intruction}"
            "Respond ONLY with a JSON object. "
            "Required keys: 'technicalScore' (0-100), 'confidenceScore' (0-100), 'aiFeedback', 'idealAnswer'. "
        )
        user_prompt=(
           
            f"Role: {request.role}\n"
            f"Question: {request.question}\n"
            f"Level: {request.level}\n"
            f"Verbal Answer: {request.user_answer or 'No verbal answer provided'}\n"
            f"Code Answer: {request.user_code or 'No code provided'}\n"
        )
        response=ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=user_prompt,
            system=system_prompt,
            format="json",
            options={"temperature":0.1}
        )
        response_text=response['response'].strip()
        try:
            evaluation_data=json.loads(response_text)
            if 'idealAnswer' in evaluation_data and not isinstance(evaluation_data['idealAnswer'],str):
                evaluation_data['idealAnswer']=json.dumps(evaluation_data['idealAnswer'])
            return EvaluationResponse(**evaluation_data)
        except json.JSONDecodeError:
            import re
            fixed_text=re.sub(r'[\r\n\t]',' ',response_text)
            try :
                evaluation_data=json.loads(fixed_text)
                if 'idealAnswer' in evaluation_data and not isinstance(evaluation_data['idealAnswer'],str):
                    evaluation_data['idealAnswer']=json.dumps(evaluation_data['idealAnswer'])
                return EvaluationResponse(**evaluation_data)
            except :
                print(f"Failed to parse response: {response_text}")
                return EvaluationResponse(technicalScore=0,confidenceScore=0,aiFeedback="Failed to parse response",idealAnswer="Failed to parse response")

    except Exception as e:
        print(f"Failed to generate response: {e}")
        raise HTTPException(status_code=500,detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """IntervBot – an AI helper for interview prep questions."""
    try:
        system_prompt = (
            "You are IntervBot, a friendly and expert AI assistant built into the IntervAI interview preparation platform. "
            "Your role is to help candidates understand coding concepts, explain algorithms, review approaches, "
            "and answer any technical questions during their interview practice session. "
            "Be concise, clear, and encouraging. Use code examples where helpful. "
            "If someone pastes code, review it and explain improvements. "
            "Never give direct answers to interview questions — instead, guide the user to think through the solution."
        )
        if request.context:
            system_prompt += f"\n\nCurrent interview question context:\n{request.context}"

        # Build a single prompt from conversation history (same pattern as working endpoints)
        conversation_prompt = ""
        for msg in request.messages:
            if msg.role == "user":
                conversation_prompt += f"User: {msg.content}\n"
            else:
                conversation_prompt += f"IntervBot: {msg.content}\n"
        conversation_prompt += "IntervBot:"

        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=conversation_prompt,
            system=system_prompt,
            options={"temperature": 0.7}
        )
        reply = response["response"].strip()
        return ChatResponse(reply=reply, model_used=OLLAMA_MODEL_NAME)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulation-chat", response_model=SimulationChatResponse)
async def simulation_chat(request: SimulationChatRequest):
    try:
        config = request.config
        
        system_prompt = (
            f"You are {config.get('personality', 'an Interviewer')}. "
            f"You are conducting a {config.get('interviewType', 'Technical')} interview for a {config.get('experienceLevel', 'Mid-Level')} {config.get('targetRole', 'Developer')}. "
            f"Company context: {config.get('companyContext', 'None provided')}. "
            f"Job Description: {config.get('jobDescription', 'None provided')}. "
            f"Candidate Resume Data: {request.resumeText[:1000]}... "
            "CRITICAL INSTRUCTIONS: "
            "1. You are speaking in a live video call. DO NOT output markdown, bullet points, or code blocks. Speak naturally. "
            "2. Keep your response short (1 to 3 sentences maximum). "
            "3. Ask ONLY ONE question at a time. "
            "4. Acknowledge their previous answer briefly, provide subtle feedback, and smoothly transition to the next question. "
            "5. If it's the very first message, introduce yourself naturally, reference their profile, and ask if they are ready."
        )

        ollama_messages = [{"role": "system", "content": system_prompt}]
        
        for msg in request.history:
            role = "assistant" if msg["role"] == "assistant" else "user"
            ollama_messages.append({"role": role, "content": msg["content"]})
            
        # If history is empty, the user just joined, so we should trigger the greeting.
        if len(request.history) == 0:
            ollama_messages.append({"role": "user", "content": "I have just joined the room. Please introduce yourself and start the interview."})

        response = ollama.chat(model=OLLAMA_MODEL_NAME, messages=ollama_messages)
        reply = response['message']['content']

        # Generate Voice via Edge-TTS
        voice = "en-IN-NeerjaNeural" if config.get("gender") == "Female" else "en-IN-PrabhatNeural"
        audio_base64 = None
        
        try:
            communicate = edge_tts.Communicate(reply, voice=voice)
            audio_path = tempfile.mktemp(suffix=".mp3")
            await communicate.save(audio_path)
            
            with open(audio_path, "rb") as f:
                audio_bytes = f.read()
            
            os.remove(audio_path)
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        except Exception as tts_err:
            print(f"Edge-TTS Error: {tts_err}")

        return SimulationChatResponse(
            reply=reply,
            audioBase64=audio_base64,
            model_used=OLLAMA_MODEL_NAME
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        if whisper_model is None:
            raise HTTPException(status_code=500, detail="Whisper model not loaded")

        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        content = await file.read()
        temp_audio.write(content)
        temp_audio.close()

        segments, info = whisper_model.transcribe(temp_audio.name, beam_size=5)
        os.remove(temp_audio.name)
        
        text = " ".join([segment.text for segment in segments])

        return {"text": text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulation-report", response_model=SimulationReportResponse)
async def simulation_report(request: SimulationReportRequest):
    try:
        config = request.config
        
        system_prompt = (
            "You are an expert technical recruiter analyzing an interview transcript. "
            "Output MUST be a valid JSON object matching this structure EXACTLY: "
            "{ 'overallScore': number 0-100, 'technicalScore': number 0-100, 'communicationScore': number 0-100, "
            "'confidenceScore': number 0-100, 'problemSolvingScore': number 0-100, "
            "'strengths': [string], 'weaknesses': [string], 'missedOpportunities': [string], "
            "'suggestedBetterAnswers': [string], 'hiringRecommendation': string, 'learningPlan': [string] }. "
            "Do NOT wrap in markdown blocks. Output only raw JSON."
        )

        transcript_text = ""
        for msg in request.history:
            transcript_text += f"{msg['role'].upper()}: {msg['content']}\n"

        user_prompt = (
            f"Analyze this transcript for a {config.get('targetRole')} role.\n\n"
            f"TRANSCRIPT:\n{transcript_text}"
        )

        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=f"{system_prompt}\n\n{user_prompt}",
            format='json'
        )
        
        raw_text = response['response'].strip()
        report_data = json.loads(raw_text)

        return SimulationReportResponse(
            report=report_data,
            model_used=OLLAMA_MODEL_NAME
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__=="__main__":
    uvicorn.run(app,host="0.0.0.0",port=AI_SERVICE_PORT)