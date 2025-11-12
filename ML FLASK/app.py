from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.models import load_model
import numpy as np
import json
import os

# -----------------------------
# 1️⃣ Initialize Flask app
# -----------------------------
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# -----------------------------
# 2️⃣ Load class mapping
# -----------------------------
with open("class_indices.json", "r") as f:
    class_indices = json.load(f)
class_labels = list(class_indices.keys())
print("✅ Classes:", class_labels)

img_height, img_width = 224, 224

# -----------------------------
# 4️⃣ Load saved weights
# -----------------------------
model_path = os.path.join("models", "epoch_15_valacc_0.99.h5")
model = load_model(model_path)
print("✅ Weights loaded successfully!")

# -----------------------------
# 5️⃣ Define prediction helper
# -----------------------------
def predict_image(img_path):
    img = image.load_img(img_path, target_size=(img_height, img_width))
    img_array = image.img_to_array(img)
    img_array = preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    
    pred = model.predict(img_array)[0]
    predicted_index = np.argmax(pred)
    predicted_class = class_labels[predicted_index]
    confidence = float(np.max(pred))
    
    # Basic category and urgency mapping
    category = 'Road Issues' if predicted_class in ['pothole', 'manhole'] else 'Sanitation' if predicted_class == 'garbage_overflowing' else 'Other'
    urgency = 'high' if predicted_class in ['pothole', 'manhole'] else 'medium'
    
    return predicted_class, confidence, category, urgency

# -----------------------------
# 6️⃣ Define API routes
# -----------------------------
@app.route('/')
def home():
    return "🚀 Flask MobileNetV2 API is running!"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "message": "ML API is running",
        "model_loaded": model is not None,
        "classes": class_labels
    })

@app.route('/predict', methods=['POST'])
@app.route('/complaints/analyze-image', methods=['POST'])
def predict():
    temp_path = None
    try:
        # Log request details
        print("Received prediction request")
        print("Files in request:", list(request.files.keys()) if request.files else "No files")
        
        # Check if file exists in request
        if not request.files:
            return jsonify({"success": False, "error": "No files in request"}), 400
        
        # Try both 'file' and 'photo' fields
        file = request.files.get('file') or request.files.get('photo')
        if not file:
            return jsonify({"success": False, "error": "No file or photo found in request"}), 400
        
        if file.filename == '':
            return jsonify({"success": False, "error": "Empty filename"}), 400
        
        print(f"Processing file: {file.filename}")
        
        # Save the uploaded file temporarily
        temp_path = os.path.join("temp_image.jpg")
        file.save(temp_path)
        
        try:
            # Make prediction
            predicted_class, confidence, category, urgency = predict_image(temp_path)
            
            # Format the response as expected by the frontend
            results = {
                "success": True,
                "results": {
                    "predicted_class": predicted_class,
                    "confidence": f"{confidence:.2%}",
                    "predictedCategory": category,
                    "predictedUrgency": urgency,
                    "caption": f"Detected {predicted_class.replace('_', ' ')} with {confidence:.1%} confidence"
                },
                "message": "Analysis completed successfully"
            }
            
            print("Prediction results:", results)
            return jsonify(results)
            
        except Exception as e:
            print(f"Error in prediction: {str(e)}")
            return jsonify({
                "success": False,
                "error": f"Prediction failed: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Request processing failed: {str(e)}"
        }), 500
        
    finally:
        # Clean up temp file in all cases
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Warning: Failed to remove temp file: {str(e)}")

@app.route('/stats', methods=['GET'])
def stats():
    # Surface minimal model metadata for diagnostics
    return jsonify({
        "model_path": model_path,
        "num_classes": len(class_labels),
        "classes": class_labels
    })

# -----------------------------
# 7️⃣ Run the Flask app
# -----------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
