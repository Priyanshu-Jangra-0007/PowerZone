from io import BytesIO
import os
import re
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")
load_dotenv(PROJECT_ROOT / "AI Food Scanner" / ".env")

INPUT_PROMPT = """You are an expert nutritionist. Analyze the food items in the image and give the output in a clear, structured, and detailed format.

For each food item, provide the following fields in order:

- Item
- Calories (number only)
- Portion (describe size clearly)
- Macronutrients:
     Carbs_g
     Protein_g
     Fat_g
- Category (e.g., vegetable, grain, dairy, meat, seafood, fruit, snack)
- Health_Risk_Flags (if any)
- Interesting facts (1-2 detailed sentences about nutrition, benefits, or concerns)

After listing all items, provide:

- TOTAL_CALORIES (sum of all items, number only)
- Suggestion (2-3 detailed interesting sentences about overall meal quality)
- OVERALL_MODEL_CONFIDENCE (0-100)

Format your output EXACTLY like this:

1. <name>
   * Calories: <number>
   * Portion: <text>
   * Carbs_g: <number>
   * Protein_g: <number>
   * Fat_g: <number>
   * Category: <text>
   * Health_Risk_Flags: <text or none>
   * Interesting facts: <detailed text>

TOTAL_CALORIES: <number>

Suggestion :<detailed text>

OVERALL_MODEL_CONFIDENCE: <0-100>
"""

MODEL_CASCADE = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]
MAX_RETRIES = 3
BACKOFF_BASE = 2

app = FastAPI(title="PowerZone AI Food Scanner API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client = None
_active_model_name = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


def _safe_float(val, default=0.0):
    try:
        return float(re.sub(r"[^\d.]", "", str(val)))
    except Exception:
        return default


def _extract(pattern: str, text: str, cast=str):
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    value = match.group(1).strip()
    if cast in (int, float):
        return _safe_float(value, 0)
    return value


def parse_gemini_response(raw_text: str) -> dict:
    items = []
    blocks = re.split(r"\n(?=\d+\.\s)", raw_text.strip())

    for block in blocks:
        if not re.match(r"^\d+\.\s", block.strip()):
            continue

        lines = block.strip().splitlines()
        if not lines:
            continue

        name_match = re.match(r"^\d+\.\s*(.+)", lines[0].strip())
        name = name_match.group(1).strip() if name_match else "Unknown"
        block_text = "\n".join(lines[1:])

        item = {
            "name": name,
            "calories": int(_safe_float(_extract(r"\*\s*Calories:\s*([\d.]+)", block_text), 0)),
            "portion": _extract(r"\*\s*Portion:\s*(.+?)(?=\n\s*\*|\Z)", block_text) or "",
            "carbs_g": _safe_float(_extract(r"\*\s*Carbs_g:\s*([\d.]+)", block_text), 0),
            "protein_g": _safe_float(_extract(r"\*\s*Protein_g:\s*([\d.]+)", block_text), 0),
            "fat_g": _safe_float(_extract(r"\*\s*Fat_g:\s*([\d.]+)", block_text), 0),
            "category": _extract(r"\*\s*Category:\s*(.+?)(?=\n\s*\*|\Z)", block_text) or "other",
            "health_risk_flags": _extract(r"\*\s*Health_Risk_Flags:\s*(.+?)(?=\n\s*\*|\Z)", block_text) or "None",
            "interesting_facts": _extract(r"\*\s*Interesting facts:\s*(.+?)(?=\n\s*\*|\Z)", block_text) or "",
        }

        if item["health_risk_flags"].lower() in {"none", "none.", "n/a", ""}:
            item["health_risk_flags"] = "None"

        items.append(item)

    total_calories = int(
        _safe_float(
            _extract(r"TOTAL_CALORIES\s*:\s*([\d.]+)", raw_text, float),
            sum(item["calories"] for item in items),
        )
    )
    suggestion = _extract(r"Suggestion\s*:\s*(.+?)(?=\n\s*OVERALL_MODEL_CONFIDENCE|\Z)", raw_text) or ""
    confidence_score = int(
        min(100, max(0, _safe_float(_extract(r"OVERALL_MODEL_CONFIDENCE\s*:\s*([\d.]+)", raw_text, float), 0)))
    )

    total_protein = round(sum(item["protein_g"] for item in items), 1)
    total_carbs = round(sum(item["carbs_g"] for item in items), 1)
    total_fat = round(sum(item["fat_g"] for item in items), 1)

    return {
        "items": items,
        "total_calories": total_calories,
        "total_protein_g": total_protein,
        "total_carbs_g": total_carbs,
        "total_fat_g": total_fat,
        "suggestion": suggestion.strip(),
        "confidence_score": confidence_score,
        "confidence": round(confidence_score / 100, 4),
        "raw": raw_text,
    }


def call_gemini_with_retry(image_bytes: bytes, mime_type: str, user_prompt: str = "") -> str:
    global _active_model_name
    client = _get_client()
    last_exc = None

    for model_name in MODEL_CASCADE:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Content(
                            parts=[
                                types.Part.from_text(text=INPUT_PROMPT),
                                image_part,
                                types.Part.from_text(text=user_prompt),
                            ]
                        )
                    ],
                )
                _active_model_name = model_name
                return response.text or ""
            except Exception as exc:
                last_exc = exc
                err_text = str(exc)
                should_retry = any(code in err_text for code in ("503", "429", "UNAVAILABLE", "ResourceExhausted"))
                if should_retry and attempt < MAX_RETRIES:
                    time.sleep(BACKOFF_BASE ** attempt)
                    continue
                break

    raise last_exc or RuntimeError("Gemini request failed.")


@app.get("/health")
def health():
    return {
        "ok": True,
        "google_api_key_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "active_model": _active_model_name,
        "fallback_models": MODEL_CASCADE,
    }


def build_scan_response(result: dict) -> dict:
    primary_item = result["items"][0] if result["items"] else {}

    return {
        "calories_kcal": result["total_calories"],
        "total_calories": result["total_calories"],
        "predicted_label": primary_item.get("name", "Unknown"),
        "confidence": result["confidence"],
        "confidence_score": result["confidence_score"],
        "confidence_percent": result["confidence_score"],
        "model_used": _active_model_name or "gemini",
        "top_predictions": [
            {
                "label": item["name"],
                "confidence": result["confidence"],
            }
            for item in result["items"][:3]
        ],
        "items": result["items"],
        "items_count": len(result["items"]),
        "total_protein_g": result["total_protein_g"],
        "total_carbs_g": result["total_carbs_g"],
        "total_fat_g": result["total_fat_g"],
        "suggestion": result["suggestion"],
        "raw": result["raw"],
    }


@app.post("/")
@app.post("/api/analyze")
@app.post("/api/scan-food")
@app.post("/api/scan")
async def scan_food(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    try:
        raw = await file.read()
        Image.open(BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.") from exc

    try:
        raw_text = call_gemini_with_retry(raw, file.content_type or "image/jpeg")
        result = parse_gemini_response(raw_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        err_text = str(exc)
        if any(code in err_text for code in ("503", "UNAVAILABLE")):
            raise HTTPException(
                status_code=503,
                detail="Google's servers are temporarily overloaded. Please wait a bit and try again.",
            ) from exc
        if any(code in err_text for code in ("429", "ResourceExhausted")):
            raise HTTPException(
                status_code=429,
                detail="API rate limit reached. Please wait a moment and try again.",
            ) from exc
        raise HTTPException(status_code=500, detail=err_text) from exc

    return build_scan_response(result)
