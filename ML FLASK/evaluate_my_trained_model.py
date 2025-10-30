import os
import argparse
import glob
from collections import defaultdict

import numpy as np
from PIL import Image
from tensorflow import keras

# Configuration - adjust if your model expects different labels/order
MODEL_PATH_DEFAULT = "my_trained_model.h5"
TEST_DIR_DEFAULT = "split_data/test"
CLASS_LABELS = ["Garbage", "manhole", "pothole"]
INPUT_SIZE = 224


def preprocess_image(img_path, input_size=INPUT_SIZE):
    img = Image.open(img_path).convert("RGB").resize((input_size, input_size))
    arr = np.array(img, dtype=np.float32)
    # MobileNetV2 style preprocessing used elsewhere in this repo
    arr = arr / 127.5 - 1.0
    return arr


def gather_images(test_dir):
    """Return list of (image_path, true_label) found under test_dir/class/*"""
    images = []
    if not os.path.isdir(test_dir):
        raise FileNotFoundError(f"Test directory not found: {test_dir}")

    for class_name in os.listdir(test_dir):
        class_path = os.path.join(test_dir, class_name)
        if not os.path.isdir(class_path):
            continue
        # map folder name to label index by case-insensitive match
        true_label = None
        for i, lab in enumerate(CLASS_LABELS):
            if lab.lower() == class_name.lower():
                true_label = lab
                break
        if true_label is None:
            # skip unknown folders but warn
            print(f"Warning: folder '{class_name}' does not match any known class labels; skipping")
            continue

        patterns = [os.path.join(class_path, "*.jpg"), os.path.join(class_path, "*.jpeg"), os.path.join(class_path, "*.png")]
        for pat in patterns:
            for p in glob.glob(pat):
                images.append((p, true_label))

    return images


def evaluate(model_path, test_dir, batch_size=16, verbose=False):
    print(f"Loading model from: {model_path}")
    model = keras.models.load_model(model_path, compile=False)

    # Detect if the model expects multiple inputs
    try:
        n_model_inputs = len(model.inputs) if isinstance(model.inputs, (list, tuple)) else 1
    except Exception:
        n_model_inputs = 1
    if n_model_inputs > 1:
        print(f"Model expects {n_model_inputs} input tensors. The evaluator will duplicate the image input for each model input as a fallback.")

    images = gather_images(test_dir)
    if len(images) == 0:
        print("No test images found. Check your `split_data/test/` directory structure.")
        return

    n_classes = len(CLASS_LABELS)
    label_to_idx = {lab: i for i, lab in enumerate(CLASS_LABELS)}

    # confusion matrix: rows=true, cols=pred
    conf = np.zeros((n_classes, n_classes), dtype=int)

    misclassified_samples = []

    # process in batches to be memory friendly
    for i in range(0, len(images), batch_size):
        batch = images[i : i + batch_size]
        batch_X = np.stack([preprocess_image(p) for p, _ in batch], axis=0)
        # If model requires multiple inputs, duplicate the same image batch for each input.
        if n_model_inputs <= 1:
            predict_input = batch_X
        else:
            # create a list of inputs; naive fallback: same tensor for each required input
            predict_input = [batch_X for _ in range(n_model_inputs)]

        # predictions: softmax probabilities or logits depending on model
        probs = model.predict(predict_input, verbose=0)
        preds = np.argmax(probs, axis=1)

        for (img_path, true_label), pred_idx in zip(batch, preds):
            true_idx = label_to_idx[true_label]
            conf[true_idx, int(pred_idx)] += 1
            if int(pred_idx) != true_idx:
                misclassified_samples.append((img_path, true_label, CLASS_LABELS[int(pred_idx)], float(np.max(probs))))

    # Print confusion matrix
    print('\nConfusion matrix (rows=true, cols=pred):')
    header = ' ' * 12 + ''.join([f"{lab:12}" for lab in CLASS_LABELS])
    print(header)
    for i, lab in enumerate(CLASS_LABELS):
        row = ''.join([f"{conf[i,j]:12d}" for j in range(n_classes)])
        print(f"{lab:10} {row}")

    total = conf.sum()
    correct = np.trace(conf)
    overall_acc = correct / total if total else 0.0
    print(f"\nTotal images: {total}")
    print(f"Correct predictions: {correct}")
    print(f"Overall accuracy: {overall_acc:.4f}")

    # per-class accuracy
    print('\nPer-class accuracy:')
    for i, lab in enumerate(CLASS_LABELS):
        true_count = conf[i].sum()
        correct_count = conf[i, i]
        acc = correct_count / true_count if true_count else 0.0
        print(f"  {lab:10}: {correct_count}/{true_count} -> {acc:.4f}")

    if verbose and misclassified_samples:
        print('\nSample misclassified images (up to 20):')
        for s in misclassified_samples[:20]:
            img_path, true_label, pred_label, conf_score = s
            print(f"  {img_path}  true={true_label}  pred={pred_label}  top_conf={conf_score:.4f}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate my_trained_model.h5 on a test folder structure (split_data/test/<class>/images)")
    parser.add_argument('--model', default=MODEL_PATH_DEFAULT, help='Path to model file (.h5)')
    parser.add_argument('--test-dir', default=TEST_DIR_DEFAULT, help='Root test directory containing class subfolders')
    parser.add_argument('--batch-size', type=int, default=16)
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    try:
        evaluate(args.model, args.test_dir, batch_size=args.batch_size, verbose=args.verbose)
    except Exception as e:
        print(f"Error during evaluation: {e}")


if __name__ == '__main__':
    main()
