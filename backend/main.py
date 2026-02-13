from io import BytesIO

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification


MODEL_NAME = "Maheentouqeer1/food-classifier-efficientnet"

# Approximate calories per serving (kcal) for common labels.
# Extend this map as your model label set grows.
CALORIE_BY_LABEL = {
    "burger": 354,
    "pizza": 285,
    "biryani": 290,
    "fried_rice": 238,
    "pasta": 221,
    "sandwich": 250,
    "samosa": 262,
    "dosa": 168,
    "idli": 58,
    "paneer_butter_masala": 340,
    "butter_chicken": 438,
    "chole_bhature": 427,
    "chak_hao_kheer": 220,
}

app = FastAPI(title="PowerZone ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_processor = None
_model = None
_device = "cuda" if torch.cuda.is_available() else "cpu"


def _load_model_once():
    global _processor, _model
    if _processor is None or _model is None:
        _processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        _model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
        _model.to(_device)
        _model.eval()


def _estimate_calories_from_label(label: str) -> int:
    key = label.strip().lower()
    if key in CALORIE_BY_LABEL:
        return CALORIE_BY_LABEL[key]

    # Fallback estimate when class is not in map yet.
    return 250


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": _model is not None, "device": _device}


@app.post("/api/scan-food")
async def scan_food(file: UploadFile = File(...)):
    _load_model_once()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    try:
        raw = await file.read()
        image = Image.open(BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.") from exc

    inputs = _processor(images=image, return_tensors="pt")
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = _model(**inputs)

    logits = outputs.logits
    predicted_idx = logits.argmax(-1).item()
    predicted_label = _model.config.id2label[predicted_idx]
    calories_kcal = _estimate_calories_from_label(predicted_label)

    return {
        "calories_kcal": calories_kcal,
    }
