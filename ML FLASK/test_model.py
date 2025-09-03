import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import argparse
import glob

# Model and preprocessing settings
MODEL_PATH = "my_trained_model.h5"
CLASS_LABELS = ["Garbage", "manhole", "pothole"]  # Make sure this matches your app.py
INPUT_SIZE = 224  # Assuming MobileNetV2 input size

# MobileNetV2 preprocessing
def preprocess_image(img_path):
    img = Image.open(img_path).convert("RGB").resize((INPUT_SIZE, INPUT_SIZE))
    arr = np.array(img, dtype=np.float32)
    # Apply MobileNetV2 preprocessing
    arr = arr / 127.5 - 1.0
    arr = np.expand_dims(arr, axis=0)  # Add batch dimension
    return arr

def main():
    parser = argparse.ArgumentParser(description="Test pothole/manhole classification")
    parser.add_argument("--image", help="Path to image file or directory to test")
    parser.add_argument("--verbose", action="store_true", help="Show detailed confidence scores")
    parser.add_argument("--override", action="store_true", help="Apply pothole override logic")
    args = parser.parse_args()
    
    # Load model
    print(f"Loading model from {MODEL_PATH}...")
    model = keras.models.load_model(MODEL_PATH, compile=False)
    
    # Handle directory or single file
    if os.path.isdir(args.image):
        image_paths = glob.glob(os.path.join(args.image, "*.jpg")) + glob.glob(os.path.join(args.image, "*.jpeg")) + glob.glob(os.path.join(args.image, "*.png"))
        print(f"Found {len(image_paths)} images in directory")
    else:
        image_paths = [args.image]
    
    # Process each image
    for img_path in image_paths:
        print(f"\nTesting image: {img_path}")
        
        # Preprocess
        arr = preprocess_image(img_path)
        
        # Predict
        probs = model.predict(arr, verbose=0)
        
        # Get class probabilities
        confidence_pothole = float(probs[0][CLASS_LABELS.index("pothole")])
        confidence_manhole = float(probs[0][CLASS_LABELS.index("manhole")])
        confidence_garbage = float(probs[0][CLASS_LABELS.index("Garbage")])
        
        # Top-1 prediction
        best_idx = int(np.argmax(probs[0]))
        best_label = CLASS_LABELS[best_idx]
        best_prob = float(probs[0][best_idx])
        
        # Print basic results
        print(f"Model prediction: {best_label} (confidence: {best_prob:.4f})")
        
        # Detailed confidences
        if args.verbose:
            print("All confidence scores:")
            for i, label in enumerate(CLASS_LABELS):
                print(f"  {label}: {float(probs[0][i]):.4f}")
        else:
            print(f"Pothole: {confidence_pothole:.4f}, Manhole: {confidence_manhole:.4f}, Garbage: {confidence_garbage:.4f}")
        
        # Apply override logic if requested
        if args.override:
            print("\nApplying override logic...")
            if confidence_pothole > 0.15:
                print(f"OVERRIDE: Pothole confidence ({confidence_pothole:.4f}) > 0.15, forcing pothole classification")
                final_class = "pothole"
                final_category = "Road Issues"
            elif confidence_pothole > 0.1 and confidence_manhole > 0.1 and abs(confidence_pothole - confidence_manhole) < 0.3:
                print(f"OVERRIDE: Pothole and manhole confidences are close, defaulting to pothole")
                final_class = "pothole"
                final_category = "Road Issues"
            else:
                final_class = best_label
                final_category = "Road Issues" if final_class == "pothole" else "Sanitation"
            
            print(f"Final classification: {final_class}")
            print(f"Final category: {final_category}")

if __name__ == "__main__":
    main()
