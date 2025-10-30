import os
import numpy as np
from PIL import Image
import tensorflow as tf

MODEL_PATH = 'my_trained_model1.h5'
INPUT_SIZE = 224
CLASS_LABELS = ['Garbage','manhole','pothole']

print('Loading model:', MODEL_PATH)
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print('Model loaded.')
model.summary()

# Directory with test images (put a few labelled images here with filenames indicating true label)
TEST_DIR = 'test_images'
if not os.path.isdir(TEST_DIR):
    print('Test directory not found:', TEST_DIR)
    print('Create a folder "test_images" and add some sample images named like garbage1.jpg, manhole1.jpg, pothole1.jpg')
    exit(1)

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mnv2_preprocess

for fname in os.listdir(TEST_DIR):
    path = os.path.join(TEST_DIR, fname)
    if not os.path.isfile(path):
        continue
    try:
        img = Image.open(path).convert('RGB').resize((INPUT_SIZE, INPUT_SIZE))
        arr = np.array(img, dtype=np.float32)
        arr = mnv2_preprocess(arr)
        arr = np.expand_dims(arr, axis=0)
        preds = model.predict(arr)
        probs = preds[0]
        topk_idx = probs.argsort()[::-1]
        print('\nImage:', fname)
        print('Raw probs:', probs)
        print('Topk:')
        for i in topk_idx[:3]:
            label = CLASS_LABELS[i] if i < len(CLASS_LABELS) else f'class_{i}'
            print(f' - {label}: {probs[i]:.6f}')
    except Exception as e:
        print('Failed for', fname, e)
