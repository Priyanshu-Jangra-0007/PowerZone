from io import BytesIO

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification


INDIAN_MODEL_NAME = "Maheentouqeer1/food-classifier-efficientnet"
GLOBAL_MODEL_NAME = "nateraw/food"

# Prefer global model for clearly global-food classes when confidence is strong.
GLOBAL_PRIORITY_LABELS = {
    "pizza",
    "hamburger",
    "hot_dog",
    "sandwich",
    "french_fries",
}

# Prefer Indian model for common local dishes when confidence is decent.
INDIAN_PRIORITY_LABELS = {
    "chapati",
    "naan",
    "biryani",
    "dal_tadka",
    "dal_makhani",
    "paneer_butter_masala",
    "butter_chicken",
    "poha",
}

# Approximate calories per serving (kcal) for common labels.
# Covers the current model's class labels plus a few extra aliases.
CALORIE_BY_LABEL = {
    "aloo_gobi": 180,
    "aloo_matar": 190,
    "aloo_methi": 170,
    "aloo_shimla_mirch": 165,
    "aloo_tikki": 220,
    "anarsa": 150,
    "bandar_laddu": 190,
    "basundi": 280,
    "bhatura": 310,
    "bhindi_masala": 170,
    "burger": 354,
    "hamburger": 354,
    "pizza": 285,
    "hot_dog": 290,
    "french_fries": 365,
    "biryani": 290,
    "boondi": 170,
    "butter_chicken": 438,
    "chak_hao_kheer": 220,
    "cham_cham": 160,
    "chana_masala": 210,
    "chapati": 120,
    "chhena_kheeri": 250,
    "chicken_razala": 330,
    "chicken_tikka": 260,
    "chicken_tikka_masala": 320,
    "chikki": 150,
    "chole_bhature": 427,
    "daal_baati_churma": 420,
    "daal_puri": 270,
    "dal_makhani": 300,
    "dal_tadka": 220,
    "doodhpak": 260,
    "dosa": 168,
    "double_ka_meetha": 360,
    "dum_aloo": 230,
    "fried_rice": 238,
    "gajar_ka_halwa": 320,
    "gulab_jamun": 175,
    "idli": 58,
    "jalebi": 200,
    "kachori": 270,
    "kadai_paneer": 320,
    "kadhi_pakoda": 250,
    "kalakand": 185,
    "karela_bharta": 150,
    "kofta": 290,
    "lassi": 180,
    "makki_di_roti_sarson_da_saag": 360,
    "malapua": 260,
    "misi_roti": 140,
    "misti_doi": 210,
    "mysore_pak": 210,
    "naan": 260,
    "navrattan_korma": 300,
    "palak_paneer": 290,
    "paneer_butter_masala": 340,
    "pasta": 221,
    "phirni": 230,
    "poha": 180,
    "poornalu": 220,
    "qubani_ka_meetha": 240,
    "rabri": 330,
    "ras_malai": 180,
    "rasgulla": 125,
    "samosa": 262,
    "sandwich": 250,
    "sheer_korma": 300,
    "sheera": 280,
    "shrikhand": 220,
    "sohan_halwa": 380,
    "sohan_papdi": 185,
    "sutar_feni": 320,
}

app = FastAPI(title="PowerZone ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_indian_processor = None
_indian_model = None
_global_processor = None
_global_model = None
_device = "cuda" if torch.cuda.is_available() else "cpu"


def _load_models_once():
    global _indian_processor, _indian_model, _global_processor, _global_model
    if _indian_processor is None or _indian_model is None:
        _indian_processor = AutoImageProcessor.from_pretrained(INDIAN_MODEL_NAME)
        _indian_model = AutoModelForImageClassification.from_pretrained(INDIAN_MODEL_NAME)
        _indian_model.to(_device)
        _indian_model.eval()
    if _global_processor is None or _global_model is None:
        _global_processor = AutoImageProcessor.from_pretrained(GLOBAL_MODEL_NAME)
        _global_model = AutoModelForImageClassification.from_pretrained(GLOBAL_MODEL_NAME)
        _global_model.to(_device)
        _global_model.eval()


def _normalize_label(label: str) -> str:
    return label.strip().lower().replace(" ", "_").replace("-", "_")


def _estimate_calories_from_label(label: str) -> tuple[int, str]:
    key = _normalize_label(label)
    if key in CALORIE_BY_LABEL:
        return CALORIE_BY_LABEL[key], "mapped"

    # Fallback estimate when class is not in map yet.
    if any(token in key for token in ("halwa", "jamun", "jalebi", "kheer", "meetha", "rabri", "malai", "shrikhand", "laddu", "pak")):
        return 300, "heuristic"
    if any(token in key for token in ("roti", "naan", "puri", "bhatura", "kachori", "chapati")):
        return 240, "heuristic"
    if any(token in key for token in ("chicken", "paneer", "korma", "masala", "kofta", "makhani")):
        return 320, "heuristic"
    if any(token in key for token in ("dal", "daal", "poha", "gobi", "matar", "methi", "bhindi")):
        return 210, "heuristic"
    return 250, "heuristic"


def _predict_with_model(image: Image.Image, processor, model, model_name: str) -> dict:
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(_device) for k, v in inputs.items()}
    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    probs = torch.softmax(logits, dim=-1)[0]
    predicted_idx = logits.argmax(-1).item()
    predicted_label = model.config.id2label[predicted_idx]
    confidence = probs[predicted_idx].item()

    top_k = min(3, probs.shape[0])
    top_values, top_indices = torch.topk(probs, k=top_k)
    top_predictions = [
        {
            "label": model.config.id2label[int(idx)],
            "confidence": round(float(score), 4),
        }
        for score, idx in zip(top_values, top_indices)
    ]

    return {
        "model": model_name,
        "label": predicted_label,
        "confidence": float(confidence),
        "top_predictions": top_predictions,
    }


def _select_best_prediction(indian_pred: dict, global_pred: dict) -> dict:
    indian_label = _normalize_label(indian_pred["label"])
    global_label = _normalize_label(global_pred["label"])

    if indian_label in INDIAN_PRIORITY_LABELS and indian_pred["confidence"] >= 0.55:
        return indian_pred
    if global_label in GLOBAL_PRIORITY_LABELS and global_pred["confidence"] >= 0.75:
        return global_pred
    if indian_pred["confidence"] >= global_pred["confidence"] + 0.08:
        return indian_pred
    if global_pred["confidence"] >= indian_pred["confidence"] + 0.08:
        return global_pred
    return global_pred if global_pred["confidence"] > indian_pred["confidence"] else indian_pred


@app.get("/health")
def health():
    return {
        "ok": True,
        "indian_model_loaded": _indian_model is not None,
        "global_model_loaded": _global_model is not None,
        "device": _device,
    }


@app.post("/api/scan-food")
async def scan_food(file: UploadFile = File(...)):
    _load_models_once()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    try:
        raw = await file.read()
        image = Image.open(BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.") from exc

    indian_pred = _predict_with_model(image, _indian_processor, _indian_model, "indian")
    global_pred = _predict_with_model(image, _global_processor, _global_model, "global")
    selected_pred = _select_best_prediction(indian_pred, global_pred)
    calories_kcal, calories_source = _estimate_calories_from_label(selected_pred["label"])

    return {
        "calories_kcal": calories_kcal,
        "predicted_label": selected_pred["label"],
        "confidence": round(selected_pred["confidence"], 4),
        "calories_source": calories_source,
        "model_used": selected_pred["model"],
        "top_predictions": selected_pred["top_predictions"],
        "indian_prediction": {
            "label": indian_pred["label"],
            "confidence": round(indian_pred["confidence"], 4),
        },
        "global_prediction": {
            "label": global_pred["label"],
            "confidence": round(global_pred["confidence"], 4),
        },
    }
