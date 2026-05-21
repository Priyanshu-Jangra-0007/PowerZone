"""
AI Nutrition Analyzer - Flask Backend
======================================
How to run:
    1. pip install -r requirements.txt
    2. Add your GOOGLE_API_KEY to the .env file
    3. python server.py
    4. Open http://localhost:5000 in your browser
"""

from dotenv import load_dotenv
load_dotenv()

import os
import re
import time
import traceback
from google import genai
from google.genai import types
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# ── Configuration ────────────────────────────────────────────────────────────
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
app = Flask(__name__)
CORS(app)

# ── System Prompt ─────────────────────────────────────────────────────────────
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
- Interesting facts (1–2 detailed sentences about nutrition, benefits, or concerns)

After listing all items, provide:

- TOTAL_CALORIES (sum of all items, number only)
- Suggestion (2–3 detailed interesting sentences about overall meal quality)
- OVERALL_MODEL_CONFIDENCE (0–100)

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

OVERALL_MODEL_CONFIDENCE: <0–100>
"""

# ── Parsing Helper ────────────────────────────────────────────────────────────
def safe_float(val, default=0.0):
    try:
        return float(re.sub(r"[^\d.]", "", str(val)))
    except Exception:
        return default


def parse_gemini_response(raw_text: str) -> dict:
    """
    Parse the structured text from Gemini into a clean dict.
    Falls back gracefully if format deviates.
    """
    items = []

    # Split into numbered item blocks + tail
    # Each block starts with a digit + period at beginning of line
    blocks = re.split(r"\n(?=\d+\.\s)", raw_text.strip())

    # Separate footer block (contains TOTAL_CALORIES etc.)
    item_blocks = []
    footer_text = ""
    for block in blocks:
        if re.match(r"^\d+\.\s", block.strip()):
            item_blocks.append(block)
        else:
            footer_text += block + "\n"

    for block in item_blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue

        # First line: "1. Food Name"
        name_match = re.match(r"^\d+\.\s*(.+)", lines[0].strip())
        name = name_match.group(1).strip() if name_match else "Unknown"

        def extract(pattern, text, cast=str):
            m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if m:
                val = m.group(1).strip()
                if cast in (int, float):
                    return safe_float(val, 0)
                return val
            return None

        block_text = "\n".join(lines[1:])

        item = {
            "name": name,
            "calories": int(safe_float(extract(r"\*\s*Calories:\s*([\d.]+)", block_text), 0)),
            "portion": extract(r"\*\s*Portion:\s*(.+)", block_text) or "",
            "carbs_g": safe_float(extract(r"\*\s*Carbs_g:\s*([\d.]+)", block_text), 0),
            "protein_g": safe_float(extract(r"\*\s*Protein_g:\s*([\d.]+)", block_text), 0),
            "fat_g": safe_float(extract(r"\*\s*Fat_g:\s*([\d.]+)", block_text), 0),
            "category": extract(r"\*\s*Category:\s*(.+)", block_text) or "other",
            "health_risk_flags": extract(r"\*\s*Health_Risk_Flags:\s*(.+?)(?=\n\s*\*|\Z)", block_text) or "None",
            "interesting_facts": extract(r"\*\s*Interesting facts:\s*(.+?)(?=\n\s*\*|\Z)", block_text, str) or "",
        }
        # Clean up "none" variants for health flags
        if item["health_risk_flags"].lower() in ("none", "none.", "n/a", ""):
            item["health_risk_flags"] = "None"

        items.append(item)

    # Footer parsing
    def extract_footer(pattern, text, cast=str):
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            val = m.group(1).strip()
            if cast in (int, float):
                return safe_float(val, 0)
            return val
        return None

    full_text = raw_text  # search entire text for footer fields
    total_cal_raw = extract_footer(r"TOTAL_CALORIES\s*:\s*([\d.]+)", full_text, float)
    total_calories = int(safe_float(total_cal_raw, sum(i["calories"] for i in items)))

    suggestion = extract_footer(r"Suggestion\s*:\s*(.+?)(?=\n\s*OVERALL_MODEL_CONFIDENCE|\Z)", full_text) or ""
    confidence_raw = extract_footer(r"OVERALL_MODEL_CONFIDENCE\s*:\s*([\d.]+)", full_text, float)
    confidence = min(100, max(0, int(safe_float(confidence_raw, 0))))

    return {
        "items": items,
        "total_calories": total_calories,
        "suggestion": suggestion.strip(),
        "confidence": confidence,
        "raw": raw_text,
    }


# ── Model Cascade (primary → fallbacks) ──────────────────────────────────────
MODEL_CASCADE = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]
MAX_RETRIES   = 3          # retries per model
BACKOFF_BASE  = 2          # seconds — doubles each retry (2s, 4s, 8s)


def call_gemini_with_retry(image_bytes: bytes, mime_type: str, user_prompt: str) -> str:
    """
    Try each model in MODEL_CASCADE.
    For each model, retry up to MAX_RETRIES times on 503/429 with
    exponential back-off.  Returns the raw text from the first success.
    Raises the last exception if all attempts fail.
    """
    last_exc = None

    for model_name in MODEL_CASCADE:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                image_part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Content(parts=[
                            types.Part.from_text(text=INPUT_PROMPT),
                            image_part,
                            types.Part.from_text(text=user_prompt or ""),
                        ])
                    ],
                )
                print(f"[OK] model={model_name} attempt={attempt}")
                return response.text          # ✅ success

            except Exception as exc:
                last_exc = exc
                err_str   = str(exc)
                is_retry  = any(code in err_str for code in ("503", "429", "UNAVAILABLE", "ResourceExhausted"))

                print(f"[WARN] model={model_name} attempt={attempt} error={err_str[:120]}")

                if is_retry and attempt < MAX_RETRIES:
                    wait = BACKOFF_BASE ** attempt        # 2s, 4s, 8s
                    print(f"[WAIT] Retrying in {wait}s…")
                    time.sleep(wait)
                else:
                    # Non-retryable error or out of retries — try next model
                    break

    raise last_exc  # all models & retries exhausted


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    user_prompt = request.form.get("prompt", "").strip()

    try:
        image_bytes = file.read()
        mime_type   = file.mimetype or "image/jpeg"

        raw_text = call_gemini_with_retry(image_bytes, mime_type, user_prompt)
        result   = parse_gemini_response(raw_text)
        return jsonify(result), 200

    except Exception as e:
        traceback.print_exc()
        err_str = str(e)

        # Detect overload vs real error so the frontend can show the right UI
        if any(code in err_str for code in ("503", "UNAVAILABLE")):
            return jsonify({
                "error": "Google's servers are temporarily overloaded. All retry attempts exhausted. Please wait 30 seconds and try again.",
                "error_type": "overload",
            }), 503
        if any(code in err_str for code in ("429", "ResourceExhausted")):
            return jsonify({
                "error": "API rate limit reached. Please wait a moment and try again.",
                "error_type": "rate_limit",
            }), 429

        return jsonify({
            "error": err_str,
            "error_type": "server_error",
            "detail": traceback.format_exc(),
        }), 500


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)
