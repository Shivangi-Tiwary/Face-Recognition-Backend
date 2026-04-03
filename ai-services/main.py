from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from deepface import DeepFace
import cv2
import numpy as np
import logging
import os
import json
from typing import Dict
from scipy.spatial.distance import cosine
from functools import lru_cache

# ---------------- ENV CONFIG ----------------
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"
os.environ["TF_NUM_INTEROP_THREADS"] = "1"

# ---------------- APP SETUP ----------------
app = FastAPI()
logging.basicConfig(level=logging.INFO)

# ---------------- LAZY MODEL LOADING ----------------
@lru_cache()
def get_model():
    logging.info("Loading Facenet model...")
    return DeepFace.build_model("Facenet")

# ---------------- ROUTES ----------------
@app.post("/extract-embedding")
async def extract_embedding(
    image: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        model = get_model()

        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        result = DeepFace.represent(
            img_path=img,
            model=model,
            detector_backend="opencv",
            enforce_detection=False,
            align=True
        )

        if not result or "embedding" not in result[0]:
            raise ValueError("No embedding generated")

        return {
            "success": True,
            "embedding": result[0]["embedding"],
            "user_id": user_id
        }

    except Exception as e:
        logging.error(f"Embedding extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Face extraction failed")


@app.post("/compare-embeddings")
async def compare_embeddings(
    image: UploadFile = File(...),
    stored_embeddings: str = Form(...),
):
    try:
        model = get_model()

        try:
            stored_embeddings: Dict[str, list] = json.loads(stored_embeddings)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid stored embeddings format")

        if not stored_embeddings:
            raise HTTPException(status_code=404, detail="No enrolled faces found")

        img_bytes = await image.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        new_embedding = DeepFace.represent(
            img_path=img,
            model=model,
            detector_backend="opencv",
            enforce_detection=False,
            align=True
        )[0]["embedding"]

        best_match_id = None
        best_confidence = 0.0

        for uid, emb in stored_embeddings.items():
            distance = cosine(new_embedding, emb)
            confidence = round(1 - distance, 3)
            if confidence > best_confidence:
                best_confidence = confidence
                best_match_id = uid

        if best_confidence < 0.60:
            raise HTTPException(status_code=404, detail="Face not recognized")

        return {
            "user_id": best_match_id,
            "confidence": best_confidence
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Face comparison failed: {e}")
        raise HTTPException(status_code=500, detail="Face comparison failed")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "face-recognition",
        "model": "Facenet",
        "detector": "opencv"
    }