#!/usr/bin/env python3
"""
Flask service to serve a Keras (.h5) image classification model for MERN apps.

- Loads a model from MODEL_PATH (default: epoch_10_valacc_0.96.h5)
- /health  : heal        # Print confidence scores for all classes
        print(f"DEBUG: Full predictions probabilities:")
        for i, cls in enumerate(CLASS_LABELS):
            if i < len(probs[0]):
                print(f"  {cls}: {float(probs[0][i]):.4f}")
        
        # Debug logging for the highest prediction
        print(f"DEBUG: Original prediction = '{best_label}'")
        print(f"DEBUG: Normalized to lowercase = '{best_label_lower}'")
        
        # Store confidences in variables for manual analysis
        confidence_pothole = float(probs[0][CLASS_LABELS.index("pothole")]) if "pothole" in CLASS_LABELS else 0
        confidence_manhole = float(probs[0][CLASS_LABELS.index("manhole")]) if "manhole" in CLASS_LABELS else 0
        confidence_garbage = float(probs[0][CLASS_LABELS.index("Garbage")]) if "Garbage" in CLASS_LABELS else 0
        
        print(f"DEBUG: Confidence scores - pothole: {confidence_pothole:.4f}, manhole: {confidence_manhole:.4f}, garbage: {confidence_garbage:.4f}")
        
        # Check if pothole and manhole confidences are close - if so, assume pothole
        # This helps overcome model confusion between these similar classes
        if confidence_pothole > 0.2 and confidence_manhole > 0.2 and abs(confidence_pothole - confidence_manhole) < 0.3:
            print(f"DEBUG: Pothole and manhole confidences are close - defaulting to pothole")
            best_label = "pothole"
            best_label_lower = "pothole"
            best_prob = confidence_pothole
        
        if "manhole" in best_label_lower:
            category = "Sanitation"
            priority = "high"
            print("DEBUG: Detected as manhole → Sanitation category")
        elif "garbage" in best_label_lower:
            category = "Sanitation"
            priority = "medium"
            print("DEBUG: Detected as garbage → Sanitation category")
        elif "pothole" in best_label_lower:
            category = "Road Issues"
            priority = "high"
            print("DEBUG: Detected as pothole → Road Issues category")
        else:
            category = "Other"
            priority = "medium"
            print(f"DEBUG: Could not categorize '{best_label_lower}' → Other category"): POST multipart/form-data with 'file' (or 'image') -> returns prediction
"""

import os
import io
import time
import json
import traceback
from typing import List

import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os

# Import speech to text
from speech_to_text import SpeechToText

# Attempt to import TensorFlow/Keras and MobileNetV2 preprocessing.
# If TF is not available, we raise a clear error on startup.
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mnv2_preprocess

# ---------------------------
# Config
# ---------------------------
MODEL_PATH = os.environ.get("MODEL_PATH", "my_trained_model.h5")
PORT = int(os.environ.get("ML_PORT", "5002"))
HOST = os.environ.get("ML_HOST", "0.0.0.0")
# Comma-separated class labels (can be overridden via env var).
CLASS_LABELS = os.environ.get("CLASS_LABELS", "Garbage,manhole,pothole").split(",")
INPUT_SIZE = int(os.environ.get("INPUT_SIZE", "224"))  # assumes square input
TOP_K = int(os.environ.get("TOP_K", "3"))

# ---------------------------
# App
# ---------------------------
app = Flask(__name__)
CORS(app)

start_time = time.time()
model = None

def _build_fallback_architecture(num_classes: int) -> keras.Model:
    """Builds a MobileNetV2-based classifier if we only have weights .h5 (not a full saved model)."""
    base = keras.applications.MobileNetV2(
        input_shape=(INPUT_SIZE, INPUT_SIZE, 3),
        include_top=False,
        weights="imagenet"
    )
    base.trainable = False
    x = keras.layers.GlobalAveragePooling2D()(base.output)
    x = keras.layers.Dense(128, activation="relu")(x)
    x = keras.layers.Dropout(0.3)(x)
    outputs = keras.layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs=base.input, outputs=outputs)

def load_model(model_path: str, class_labels: List[str]) -> keras.Model:
    """
    Try loading a full Keras saved model first. If that fails, build the fallback
    architecture and load the weights.
    """
    # 1) Try as a full SavedModel / full .h5 model
    try:
        m = keras.models.load_model(model_path, compile=False)
        # Optional sanity check: last layer units should match classes
        last = m.layers[-1]
        units = getattr(last, "units", None)
        if units and units != len(class_labels):
            print(f"[WARN] Last dense units ({units}) != number of class labels ({len(class_labels)}).")
        print("[OK] Loaded full model.")
        return m
    except Exception as e:
        print(f"[INFO] load_model() failed, will try as weights-only. Reason: {e}")

    # 2) Fallback: build architecture and load weights
    try:
        m = _build_fallback_architecture(len(class_labels))
        m.load_weights(model_path)
        print("[OK] Built MobileNetV2 head and loaded weights.")
        return m
    except Exception as e:
        raise RuntimeError(f"Could not load weights into fallback architecture: {e}")

def preprocess_image(file_stream: io.BytesIO) -> np.ndarray:
    """Read an image from file stream, resize, preprocess for MobileNetV2, and add batch dimension."""
    img = Image.open(file_stream).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.array(img, dtype=np.float32)
    arr = mnv2_preprocess(arr)           # MobileNetV2 preprocessing
    arr = np.expand_dims(arr, axis=0)    # [1, H, W, 3]
    return arr

def top_k_from_probs(probs: np.ndarray, labels: List[str], k: int):
    """Return top-k class names and probabilities from a softmax output (shape [1, C])."""
    k = min(k, probs.shape[1])
    idx = np.argsort(probs[0])[::-1][:k]
    return [
        {
            "label": labels[i] if i < len(labels) else f"class_{i}",
            "prob": float(probs[0, i])
        } for i in idx
    ]

@app.route("/health", methods=["GET"])
def health():
    uptime = time.time() - start_time
    return jsonify({
        "status": "ok" if model is not None else "model_not_loaded",
        "model_path": os.path.abspath(MODEL_PATH),
        "classes": CLASS_LABELS,
        "uptime_sec": round(uptime, 2),
        "tf_version": tf.__version__,
        "keras_version": keras.__version__
    })

@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    # Check if file was uploaded
    if "file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # Save the uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, "temp_audio.wav")
        file.save(temp_path)
        
        # Initialize speech to text
        stt = SpeechToText()
        
        # Perform transcription
        result = stt.transcribe(temp_path)
        
        # Clean up
        stt.cleanup_audio(temp_path)
        try:
            os.rmdir(temp_dir)
        except:
            pass
            
        if result["success"]:
            return jsonify({
                "success": True,
                "text": result["text"]
            })
        else:
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    # Accept multipart/form-data: file field name can be 'file' or 'image'
    file = request.files.get("file") or request.files.get("image")
    if not file:
        return jsonify({"error": "No file provided. Send multipart/form-data with field 'file' (or 'image')."}), 400

    try:
        # Preprocess
        arr = preprocess_image(file.stream)
        # Predict
        probs = model.predict(arr)
        # Top-1
        best_idx = int(np.argmax(probs[0]))
        best_label = CLASS_LABELS[best_idx] if best_idx < len(CLASS_LABELS) else f"class_{best_idx}"
        best_prob = float(probs[0, best_idx])
        # Top-k
        topk = top_k_from_probs(probs, CLASS_LABELS, TOP_K)

        # Force specific categories regardless of prediction
        # This ensures we always map to a valid category
        best_label_lower = best_label.lower()
        print(f"DEBUG: Original prediction = '{best_label}'")
        print(f"DEBUG: Normalized to lowercase = '{best_label_lower}'")
        
        if "manhole" in best_label_lower:
            category = "Sanitation"
            priority = "high"
            print("DEBUG: Detected as manhole → Sanitation category")
        elif "garbage" in best_label_lower:
            category = "Sanitation"
            priority = "medium"
            print("DEBUG: Detected as garbage → Sanitation category")
        elif "pothole" in best_label_lower:
            category = "Road Issues"
            priority = "high"
            print("DEBUG: Detected as pothole → Road Issues category")
        else:
            category = "Other"
            priority = "medium"
            print(f"DEBUG: Could not categorize '{best_label_lower}' → Other category")
        
        # Debug logging - print everything for troubleshooting
        print(f"DEBUG: ML prediction raw = '{best_label}' (confidence: {best_prob:.2f})")
        print(f"DEBUG: best_label.lower() = '{best_label.lower()}'")
        print(f"DEBUG: Mapped category = '{category}'")
        print(f"DEBUG: Mapped priority = '{priority}'")
        print(f"DEBUG: Full response being sent:")

        # Map the predicted class to the appropriate category
        if best_label_lower == "manhole":
            category = "Sanitation"
            priority = "high"
        elif best_label_lower == "garbage":
            category = "Sanitation"
            priority = "medium"
        elif best_label_lower == "pothole":
            category = "Road Issues"
            priority = "high"
        else:
            category = "Other"
            priority = "medium"
        
        print(f"DEBUG: Image classified as {best_label_lower}, mapped to {category}")
        
        response = {
            "predicted_class": best_label,
            "confidence": best_prob,
            "topk": topk,
            "category": category,  # Use the mapped category
            "priority": priority,
            "caption": f"Image appears to show a {best_label.lower()}"
        }
        
        print(f"DEBUG: SENDING RESPONSE: {response}")
        return jsonify(response)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def main():
    global model
    print("=" * 60)
    print("Starting Flask ML API")
    print(f"Model path : {os.path.abspath(MODEL_PATH)}")
    print(f"Input size : {INPUT_SIZE}x{INPUT_SIZE}")
    print(f"Class labels: {CLASS_LABELS}")
    print("=" * 60)
    # Load model at startup
    model = load_model(MODEL_PATH, CLASS_LABELS)
    app.run(host=HOST, port=PORT, debug=False)

if __name__ == "__main__":
    main()
