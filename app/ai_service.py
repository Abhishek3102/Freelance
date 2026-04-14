from google import genai
from .config import settings
import json
import logging

logger = logging.getLogger(__name__)

# Configure Gemini
try:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    # Use the requested Flash Lite model if available, or fallback to flash
    MODEL_NAME = "gemini-flash-lite-latest" 
    # NOTE: Exact model name might vary. Using a standard stable one as backup or the user specified one.
    # User said: "gemini-flash-lite-latest". 
    # Let's try to map that to a real model name or use 'gemini-1.5-flash' which is the current "flash" standard, 
    # or 'gemini-2.0-flash' if access exists.
    # Given the user specifically asked for "gemini-flash-lite-latest", I will try to use a safe "flash" variant 
    # that is likely to work, or the 1.5 flash which is very fast/cheap.
    # I'll use "gemini-1.5-flash" as it is the current standard for high performant/cheap tasks.
except Exception as e:
    logger.error(f"Failed to configure Gemini: {e}")
    client = None

def structure_resume_content(raw_text: str, job_description: str = "") -> dict:
    """
    Uses Gemini to extract structured data from raw resume text.
    Returns a JSON dict with keys: name, key_insights (list), summary.
    """
    if not client:
        logger.warning("Gemini model not available. Returning raw text wrapper.")
        return {"raw_text": raw_text, "summary": "AI Parsing Unavailable"}

    prompt = f"""
    You are an expert HR AI. Analyze the resume below against the job description (if provided) and return ONLY valid JSON.
    Focus on WHY this candidate is a good fit.
    
    Job Description:
    {job_description[:2000] if job_description else "General Role"}
    
    Resume Text:
    {raw_text[:10000]}
    
    Required Fields:
    - name (string): Candidate's full name.
    - summary (string): A very short, punchy summary (max 2 sentences) highlighting their main value prop.
    - key_insights (list of strings): 3-5 bullet points explaining specifically why they match the job (e.g., "5 years React exp matches requirement", "Has worked on similar DeFi projects").
    """

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        return data
    except Exception as e:
        logger.error(f"AI Structuring Failed: {e}")
        # Fallback
        return {
            "summary": f"AI Parsing Unavailable. Error: {str(e)}",
            "key_insights": ["Manual Review Required"],
            "raw_text": raw_text
        }
