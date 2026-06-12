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
import io
import re

try:
    from pydub import AudioSegment
    HAS_PYDUB = True
except ImportError:
    AudioSegment = None
    HAS_PYDUB = False
    print("Warning: pydub not available, old transcribe endpoint will not work")

logging.basicConfig(level=logging.INFO)

load_dotenv()

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
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: Optional[str] = None

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
    videoBase64: str | None = None
    model_used: str

class SimulationReportRequest(BaseModel):
    config: dict
    resumeText: str
    history: list[dict]

class SimulationReportResponse(BaseModel):
    report: dict
    model_used: str

class SimulationNotesRequest(BaseModel):
    config: dict
    history: list[dict]

class SimulationNotesResponse(BaseModel):
    notes: list[str]
    summary: str

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-IN-NeerjaNeural"

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
        else:
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
            if isinstance(questions_data, dict) and 'questions' in questions_data:
                questions_data = questions_data['questions']
            if not isinstance(questions_data, list):
                raise ValueError("AI did not return a JSON array.")
        except json.JSONDecodeError:
            fixed_text = re.sub(r'[\r\n\t]', ' ', raw_text)
            try:
                questions_data = json.loads(fixed_text)
                if isinstance(questions_data, dict) and 'questions' in questions_data:
                    questions_data = questions_data['questions']
            except:
                raise HTTPException(status_code=500, detail="Failed to parse AI response into JSON array.")

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
async def transcribe_audio_old(file:UploadFile=File(...)):
    if not HAS_PYDUB:
        raise HTTPException(status_code=500, detail="pydub not available for audio conversion")
    try:
        audio_bytes=await file.read()
        audio_in_memory=io.BytesIO(audio_bytes)
        audio_segment=AudioSegment.from_file(audio_in_memory)
        with tempfile.NamedTemporaryFile(delete=False,suffix=".mp3") as tmp:
            temp_audio_path=tmp.name
            audio_segment.export(temp_audio_path,format="mp3")
        if not whisper_model:
            raise HTTPException(status_code=503,detail="Whisper Model is not loaded")

        segments, _ = whisper_model.transcribe(temp_audio_path)
        text = " ".join([segment.text for segment in segments])

        os.remove(temp_audio_path)
        return {"transcription": text.strip()}

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
            fixed_text=re.sub(r'[\r\n\t]',' ',response_text)
            try:
                evaluation_data=json.loads(fixed_text)
                if 'idealAnswer' in evaluation_data and not isinstance(evaluation_data['idealAnswer'],str):
                    evaluation_data['idealAnswer']=json.dumps(evaluation_data['idealAnswer'])
                return EvaluationResponse(**evaluation_data)
            except:
                print(f"Failed to parse response: {response_text}")
                return EvaluationResponse(technicalScore=0,confidenceScore=0,aiFeedback="Failed to parse response",idealAnswer="Failed to parse response")

    except Exception as e:
        print(f"Failed to generate response: {e}")
        raise HTTPException(status_code=500,detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """IntervBot - an AI helper for interview prep questions."""
    try:
        system_prompt = (
            "You are IntervBot, a friendly and expert AI assistant built into the IntervAI interview preparation platform. "
            "Your role is to help candidates understand coding concepts, explain algorithms, review approaches, "
            "and answer any technical questions during their interview practice session. "
            "Be concise, clear, and encouraging. Use code examples where helpful. "
            "If someone pastes code, review it and explain improvements. "
            "Never give direct answers to interview questions - instead, guide the user to think through the solution."
        )
        if request.context:
            system_prompt += f"\n\nCurrent interview question context:\n{request.context}"

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
        resume = request.resumeText[:1500] if request.resumeText else "No resume provided"
        company = config.get('companyContext', 'No company context')
        jd = config.get('jobDescription', 'No job description')
        focus = config.get('focusAreas', '')
        target_role = config.get('targetRole', 'Developer')
        exp_level = config.get('experienceLevel', 'Mid-Level')
        interview_type = config.get('interviewType', 'Technical')
        personality = config.get('personality', 'Interviewer')
        gender = config.get('gender', 'Female')
        interviewer_name = config.get('interviewerName') or personality
        interviewer_title = config.get('interviewerTitle') or f"{interview_type.lower()} interviewer"
        candidate_name = config.get('candidateName', 'there')

        # Build context with memory of previous answers
        history = request.history
        transcript_text = ""
        for msg in history:
            transcript_text += f"{msg['role'].upper()}: {msg['content']}\n"

        is_first_message = len(history) <= 1

        if is_first_message:
            system_prompt = (
                f"You are {interviewer_name}, a professional {interviewer_title} at a leading technology company. "
                f"You are conducting a {exp_level} {target_role} interview with {candidate_name}. "
                f"\n\nCOMPANY CONTEXT: {company}"
                f"\nJOB DESCRIPTION: {jd}"
                f"\nFOCUS AREAS: {focus}"
                f"\n\nABOUT THE CANDIDATE (from resume): {resume}"
                f"\n\nCRITICAL BEHAVIORAL RULES:"
                f"\n1. This is a LIVE VIDEO INTERVIEW. Speak naturally - do NOT use markdown, bullet points, or code blocks."
                f"\n2. Introduce yourself naturally: say 'Hello, I'm {interviewer_name}, and I'll be your {interviewer_title} today.' Then welcome {candidate_name}."
                f"\n3. Reference the candidate's background from their resume to show you've prepared."
                f"\n4. Your voice is warm, professional, and confident. Sound like a real human interviewer."
                f"\n5. End by asking if they are ready to begin."
                f"\n6. Keep your introduction to 4-5 sentences maximum."
            )
        else:
            system_prompt = (
                f"You are {interviewer_name}, a professional {interviewer_title}. "
                f"\n\nCONTEXT: You are interviewing {candidate_name} for {target_role} ({exp_level})."
                f"\nCompany: {company}"
                f"\nFocus Areas: {focus}"
                f"\nCandidate Resume: {resume}"
                f"\n\nTRANSCRIPT SO FAR:\n{transcript_text}"
                f"\n\nCRITICAL BEHAVIORAL RULES:"
                f"\n1. This is a LIVE VIDEO INTERVIEW. Speak naturally like a real human. DO NOT use markdown, bullet points, or code blocks."
                f"\n2. REACT TO THE CANDIDATE'S LAST ANSWER FIRST. Acknowledge it naturally before moving on."
                f"\n3. Use human conversational fillers and reactions (e.g., 'Interesting.', 'That's a good answer.', 'I noticed you mentioned...', 'Let's go deeper into that.')."
                f"\n4. NEVER behave like an AI chatbot. Be a strict but friendly human interviewer."
                f"\n5. NEVER jump randomly between topics. Ask ONE highly contextual follow-up question related to their previous answer."
                f"\n6. If they mentioned a specific technology or project, DRILL DEEPER into it."
                f"\n7. Keep responses concise (2-3 sentences max). This is a fast-paced spoken conversation."
                f"\n8. Never interrupt or talk over the candidate."
            )

        ollama_messages = [{"role": "system", "content": system_prompt}]

        for msg in request.history:
            role = "assistant" if msg["role"] == "assistant" else "user"
            ollama_messages.append({"role": role, "content": msg["content"]})

        if len(request.history) == 0:
            ollama_messages.append({"role": "user", "content": "I have just joined the interview room. Please introduce yourself and start the interview."})

        response = ollama.chat(model=OLLAMA_MODEL_NAME, messages=ollama_messages)
        reply = response['message']['content']

        # Clean up reply - remove markdown formatting
        reply = re.sub(r'\*\*(.*?)\*\*', r'\1', reply)
        reply = re.sub(r'__(.*?)__', r'\1', reply)
        reply = re.sub(r'`(.*?)`', r'\1', reply)
        reply = re.sub(r'#+\s*', '', reply)
        reply = reply.strip()

        # Generate Voice via Edge-TTS
        voice = "en-IN-NeerjaNeural" if gender == "Female" else "en-IN-PrabhatNeural"
        audio_base64 = None

        try:
            communicate = edge_tts.Communicate(reply, voice=voice)
            audio_path = tempfile.mktemp(suffix=".mp3")
            await communicate.save(audio_path)

            with open(audio_path, "rb") as f:
                audio_bytes = f.read()

            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            os.remove(audio_path)
        except Exception as tts_err:
            print(f"Edge-TTS Error: {tts_err}")

        return {
            "reply": reply,
            "audioBase64": audio_base64,
            "videoBase64": None,
            "model_used": OLLAMA_MODEL_NAME
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-tts")
async def generate_tts(request: TTSRequest):
    try:
        communicate = edge_tts.Communicate(request.text, voice=request.voice)
        audio_path = tempfile.mktemp(suffix=".mp3")
        await communicate.save(audio_path)

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        os.remove(audio_path)
        return {"audioBase64": audio_base64}
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

        transcript_text = ""
        for msg in request.history:
            transcript_text += f"{msg['role'].upper()}: {msg['content']}\n"

        system_prompt = (
            "You are an expert technical recruiter analyzing an interview transcript. "
            "Output MUST be a valid JSON object matching this structure EXACTLY: "
            "{ 'overallScore': number 0-100, 'technicalScore': number 0-100, 'communicationScore': number 0-100, "
            "'confidenceScore': number 0-100, 'problemSolvingScore': number 0-100, "
            "'strengths': [string], 'weaknesses': [string], 'missedOpportunities': [string], "
            "'suggestedBetterAnswers': [string], 'hiringRecommendation': string (2-3 sentences), "
            "'learningPlan': [string] (5 items, each a specific learning recommendation), "
            "'interviewerFeedback': string (2-3 sentences of overall feedback from the interviewer's perspective)}. "
            "Do NOT wrap in markdown blocks. Output only raw JSON."
        )

        user_prompt = (
            f"Analyze this transcript for a {config.get('targetRole')} role at {'a company focusing on ' + config.get('companyContext', 'a tech company')}.\n"
            f"Interview type: {config.get('interviewType', 'Technical')}, "
            f"Difficulty: {config.get('difficulty', 'Medium')}, "
            f"Experience level: {config.get('experienceLevel', 'Mid-Level')}.\n\n"
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

@app.post("/simulation-update-notes", response_model=SimulationNotesResponse)
async def simulation_update_notes(request: SimulationNotesRequest):
    try:
        config = request.config
        transcript_text = ""
        for msg in request.history:
            transcript_text += f"{msg['role'].upper()}: {msg['content']}\n"

        if not transcript_text.strip():
            return SimulationNotesResponse(notes=[], summary="Waiting for the interview to begin...")

        system_prompt = (
            "You are an AI interviewer's background assistant. Your job is to analyze the ongoing interview transcript "
            "and generate live, real-time notes about the candidate's performance.\n"
            "Output MUST be a valid JSON object matching this structure EXACTLY:\n"
            "{\n"
            "  \"notes\": [\"Note 1\", \"Note 2\", \"Note 3\"],\n"
            "  \"summary\": \"A 2-3 sentence live summary of the candidate's performance so far.\"\n"
            "}\n"
            "Keep the notes concise, focusing on strengths, weaknesses, or specific skills demonstrated. "
            "Do NOT wrap in markdown blocks. Output only raw JSON."
        )

        user_prompt = (
            f"Role: {config.get('targetRole', 'Candidate')}\n"
            f"Transcript So Far:\n{transcript_text}"
        )

        response = ollama.generate(
            model=OLLAMA_MODEL_NAME,
            prompt=f"{system_prompt}\n\n{user_prompt}",
            format='json',
            options={"temperature": 0.3}
        )

        raw_text = response['response'].strip()
        data = json.loads(raw_text)

        notes = data.get("notes", [])
        if len(notes) > 5:
            notes = notes[-5:]  # Keep only the latest 5 notes

        summary = data.get("summary", "Analyzing the candidate's responses...")

        return SimulationNotesResponse(notes=notes, summary=summary)

    except Exception as e:
        print(f"Error generating notes: {str(e)}")
        # Fallback response so frontend doesn't crash
        return SimulationNotesResponse(notes=["Analyzing candidate responses..."], summary="Interview is in progress...")

if __name__=="__main__":
    uvicorn.run(app,host="0.0.0.0",port=AI_SERVICE_PORT)
