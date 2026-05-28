from io import BytesIO

import cv2
import numpy as np
from PIL import Image


def load_image_bytes(content: bytes) -> Image.Image:
    image = Image.open(BytesIO(content)).convert("RGB")
    return image


def apply_paper_preprocessing(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image_array = np.array(image)
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    resized = cv2.resize(gray, size, interpolation=cv2.INTER_AREA).astype(np.uint8)
    blurred = cv2.GaussianBlur(resized, (5, 5), 0)
    laplacian = cv2.Laplacian(blurred, cv2.CV_32F)
    enhanced = np.clip(blurred + 0.10 * laplacian, 0, 255).astype(np.uint8)
    stacked = np.stack([enhanced, enhanced, enhanced], axis=-1)
    return Image.fromarray(stacked)


def extract_mri_features(image: Image.Image, size: tuple[int, int] = (224, 224)) -> dict:
    image_array = np.array(image)
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    resized = cv2.resize(gray, size, interpolation=cv2.INTER_AREA).astype(np.float32)

    blurred = cv2.GaussianBlur(resized, (5, 5), 0)
    laplacian = cv2.Laplacian(blurred, cv2.CV_32F)
    normalized = blurred / 255.0
    edge_map = np.abs(laplacian) / max(float(np.max(np.abs(laplacian))), 1.0)

    mean_intensity = float(normalized.mean())
    std_intensity = float(normalized.std())
    high_signal_ratio = float((normalized > 0.75).mean())
    edge_density = float((edge_map > 0.35).mean())
    laplacian_variance = float(laplacian.var())

    features = {
        "mean_intensity": mean_intensity,
        "std_intensity": std_intensity,
        "high_signal_ratio": high_signal_ratio,
        "edge_density": edge_density,
        "laplacian_variance": laplacian_variance,
        "size": list(size),
    }
    return features


def prepare_model_tensor(image: Image.Image, size: int, channels: int = 3) -> np.ndarray:
    preprocessed = apply_paper_preprocessing(image=image, size=(size, size))
    resized = preprocessed.resize((size, size))
    image_array = np.array(resized).astype(np.float32) / 255.0

    if channels == 1:
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        return gray[np.newaxis, np.newaxis, :, :].astype(np.float32)

    chw = np.transpose(image_array, (2, 0, 1))
    return chw[np.newaxis, :, :, :].astype(np.float32)


def preprocess_for_mri_model(image: Image.Image, size: tuple[int, int] = (224, 224)) -> tuple[np.ndarray, dict]:
    tensor = prepare_model_tensor(image, size=size[0], channels=1)
    features = extract_mri_features(image, size=size)
    return tensor, features
