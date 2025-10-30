from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
import json

# --- Load class mapping ---
with open("class_indices.json", "r") as f:
    class_indices = json.load(f)
class_labels = list(class_indices.keys())
print("✅ Classes:", class_labels)

# --- Rebuild the model architecture ---
img_height, img_width = 224, 224

base_model = MobileNetV2(
    input_shape=(img_height, img_width, 3),
    include_top=False,
    weights='imagenet'
)

for layer in base_model.layers[:-20]:
    layer.trainable = False
for layer in base_model.layers[-20:]:
    layer.trainable = True

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.4),
    layers.Dense(len(class_labels), activation='softmax')
])

model.compile(
    optimizer=Adam(learning_rate=1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# --- Load saved weights ---
model.load_weights("my_trained_model_fixed.weights.h5")
print("✅ Weights loaded successfully!")

# --- Predict local image ---
img_path = "test.jpg"  # Replace with your image
img = image.load_img(img_path, target_size=(img_height, img_width))
img_array = image.img_to_array(img)
img_array = preprocess_input(img_array)
img_array = np.expand_dims(img_array, axis=0)

pred = model.predict(img_array)[0]
predicted_index = np.argmax(pred)
predicted_class = class_labels[predicted_index]
confidence = np.max(pred)

print(f"\nPredicted Class: {predicted_class}")
print(f"Confidence: {confidence:.2%}")
