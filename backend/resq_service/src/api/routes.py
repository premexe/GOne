from fastapi import APIRouter, File, HTTPException, UploadFile
from src.patient.provider import MockPatientProvider
from src.protocols.registry import ProtocolRegistry
from src.stt.groq_stt import GroqSTTProvider
from src.stt.sarvam_stt import SarvamSTTProvider

router = APIRouter(prefix="/api/v1")
patient_provider = MockPatientProvider()
protocol_registry = ProtocolRegistry()

@router.get("/patients")
async def list_patients():
    return [p.model_dump() for p in patient_provider._database.values()]

@router.get("/protocols")
async def list_protocols():
    return {k: v.model_dump() for k, v in protocol_registry._protocols.items()}

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "G-ONE ResQ"}


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe a short voice turn without storing the raw audio."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio is required.")
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio must be 25 MB or smaller.")

    filename = audio.filename or "voice.webm"
    transcript, language = await SarvamSTTProvider().transcribe(audio_bytes, filename)
    provider = "sarvam"
    if not transcript:
        transcript, language = await GroqSTTProvider().transcribe(audio_bytes, filename)
        provider = "groq-whisper"
    if not transcript:
        raise HTTPException(status_code=503, detail="Speech transcription is unavailable. Use text input and try again.")
    return {"text": transcript, "language": language or "auto", "provider": provider}
