from flask import Flask, request, jsonify
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
model_path = "/mnt/Main Drive/Codes/Machine Learning/Personal/model_checkpoints_final/epoch_15_valacc_0.99.h5"
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
    confidence = np.max(pred)
    
    return predicted_class, float(confidence)

# -----------------------------
# 6️⃣ Define API routes
# -----------------------------
@app.route('/')
def home():
    return "🚀 Flask MobileNetV2 API is running!"

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    # Save the uploaded file temporarily
    temp_path = os.path.join("temp_image.jpg")
    file.save(temp_path)
    
    # Make prediction
    predicted_class, confidence = predict_image(temp_path)
    
    # Remove temp file
    os.remove(temp_path)
    
    return jsonify({
        "predicted_class": predicted_class,
        "confidence": f"{confidence:.2%}"
    })

# -----------------------------
# 7️⃣ Run the Flask app
# -----------------------------
if __name__ == '__main__':
    app.run(debug=True)
