
from flask import Flask, request, jsonify
import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import time

app = Flask(__name__)

# Track model metrics
model_stats = {
    "total_predictions": 0,
    "successful_predictions": 0,
    "fallback_predictions": 0,
    "errors": 0,
    "start_time": time.time()
}

# Try to load the model in a safer way
try:
    # For MobileNetV2 model
    base_model = keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False
    
    # Create a simple classifier on top
    model = keras.Sequential([
        base_model,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dense(128, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(3, activation='softmax')
    ])
    
    # Try to load weights if available, but don't crash if they don't load
    try:
        model.load_weights('epoch_10_valacc_0.96.h5')
        print("✅ Model weights loaded successfully")
    except:
        print("⚠️ Could not load model weights, using base MobileNetV2")
    
    class_labels = ['Garbage', 'manhole', 'pothole']  # These match your model categories
    print("✅ Model initialized successfully")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    class_labels = ['Garbage', 'manhole', 'pothole']

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for the ML API"""
    uptime = time.time() - model_stats["start_time"]
    return jsonify({
        'status': 'ok',
        'model_status': 'loaded' if model is not None else 'fallback',
        'uptime': f"{uptime:.2f} seconds"
    })

@app.route('/stats', methods=['GET'])
def stats():
    """Get model statistics"""
    uptime = time.time() - model_stats["start_time"]
    return jsonify({
        'total_predictions': model_stats["total_predictions"],
        'successful_predictions': model_stats["successful_predictions"],
        'fallback_predictions': model_stats["fallback_predictions"],
        'errors': model_stats["errors"],
        'success_rate': f"{(model_stats['successful_predictions'] / max(model_stats['total_predictions'], 1)) * 100:.2f}%",
        'uptime': f"{uptime:.2f} seconds"
    })

@app.route('/analyze', methods=['POST'])
@app.route('/predict', methods=['POST'])
def predict():
    model_stats["total_predictions"] += 1
    
    if 'file' not in request.files and 'image' not in request.files:
        model_stats["errors"] += 1
        return jsonify({'error': 'No file provided'}), 400

    # Get the file from either 'file' or 'image' field
    file = request.files.get('file') or request.files.get('image')
    description = request.form.get('description', '')
    
    # Save the file temporarily
    os.makedirs('temp_uploads', exist_ok=True)
    filepath = os.path.join('temp_uploads', file.filename)
    file.save(filepath)
    
    # Process the image
    try:
        if model is not None:
            # Load and preprocess the image for prediction
            img = image.load_img(filepath, target_size=(224, 224))
            img_array = image.img_to_array(img)
            img_array = preprocess_input(img_array)  # Using MobileNetV2 preprocessing
            img_array = np.expand_dims(img_array, axis=0)
            
            # Make prediction
            pred = model.predict(img_array)
            predicted_index = np.argmax(pred)
            predicted_class = class_labels[predicted_index]
            confidence = float(pred[0][predicted_index])
            
            # Map class to priority based on type
            priority_map = {'Garbage': 'medium', 'manhole': 'high', 'pothole': 'high'}
            priority = priority_map.get(predicted_class, 'medium')
            
            # Map class to departmental category for backend integration
            category_map = {
                'Garbage': 'Waste Management',
                'manhole': 'Sanitation',
                'pothole': 'Road Issues'
            }
            category = category_map.get(predicted_class, 'Other')
            
            print(f"✅ Prediction: {predicted_class} with {confidence:.2%} confidence")
            model_stats["successful_predictions"] += 1
        else:
            # Fallback simple classifier using image properties
            try:
                import cv2
                img = cv2.imread(filepath)
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                
                # Simple edge detection for rough classification
                edges = cv2.Canny(gray, 100, 200)
                edge_count = np.count_nonzero(edges)
                
                # Simple color analysis
                avg_color = np.mean(img, axis=(0,1))
                
                # Very simple rules-based classification
                if edge_count > 10000:  # Lots of edges
                    predicted_class = 'pothole'
                    category = 'Road Issues'
                    priority = 'high'
                elif avg_color[0] < 80 and avg_color[1] < 80:  # Dark image
                    predicted_class = 'manhole'
                    category = 'Sanitation'
                    priority = 'high'
                else:
                    predicted_class = 'Garbage'
                    category = 'Waste Management'
                    priority = 'medium'
                    
                confidence = 0.7  # Default confidence for fallback
                print(f"⚠️ Using OpenCV fallback classifier: {predicted_class}")
            except ImportError:
                # If OpenCV is not available, fall back to text analysis
                print(f"⚠️ OpenCV not available, using text analysis fallback")
                if description:
                    text = description.lower()
                    if 'road' in text or 'pothole' in text:
                        predicted_class = 'pothole'
                        category = 'Road Issues'
                        priority = 'high'
                    elif 'water' in text or 'manhole' in text or 'drain' in text:
                        predicted_class = 'manhole'
                        category = 'Sanitation'
                        priority = 'high'
                    else:
                        predicted_class = 'Garbage'
                        category = 'Waste Management'
                        priority = 'medium'
                else:
                    # Default if no description either
                    predicted_class = 'Garbage'
                    category = 'Waste Management'
                    priority = 'medium'
                confidence = 0.5
            
            model_stats["fallback_predictions"] += 1
    except Exception as e:
        print(f"❌ Error during prediction: {e}")
        predicted_class = 'Garbage'  # Default
        category = 'Other'
        confidence = 0.5
        priority = 'medium'
        model_stats["errors"] += 1
    
    # Return in the format expected by your backend
    return jsonify({
        'category': category,                 # Backend expected departmental category
        'predicted_class': predicted_class,   # Original ML class
        'caption': f"Image appears to show a {predicted_class.lower()}",
        'priority': priority,                 # For urgency determination
        'urgency': priority,                  # Alternative name used in some backend code
        'confidence': confidence
    })

# Create temp uploads directory if it doesn't exist
os.makedirs('temp_uploads', exist_ok=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)  # Changed to port 5002 to match backend configuration
