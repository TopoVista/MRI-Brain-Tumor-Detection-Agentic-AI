# Paper Alignment Check

Reference paper: [A Deep Analysis of Brain Tumor Detection from MR Images Using Deep Learning Networks](https://www.mdpi.com/1999-4893/16/4/176)

## What the paper actually does

The paper is a **4-class MRI classification study**, not an agent framework. It compares:

- a proposed CNN
- ResNet-50
- VGG16
- Inception V3

on four classes:

- `glioma`
- `meningioma`
- `notumor`
- `pituitary`

The paper also describes:

- preprocessing with normalization plus Gaussian/Laplacian filtering
- augmentation
- training/validation/testing workflow
- metrics such as accuracy, recall, AUC, and loss

## What this repo now implements

### Directly aligned

- four class labels matching the paper
- one algorithm agent per paper model:
  - `cnn_agent`
  - `resnet50_agent`
  - `vgg16_agent`
  - `inception_v3_agent`
- one `orchestration_agent` that aggregates model votes into a final class
- preprocessing agent using normalization, Gaussian smoothing, and Laplacian-derived features
- report + retrieval + verification agents layered on top of the classifier flow
- dataset added locally under `datasets/brain-tumor-mri/`
- training/export script for paper-style model training in `scripts/train_paper_models.py`

### Important limitation

If you do **not** train/export the models yet, the four algorithm agents run in **demo heuristic mode** rather than true learned inference. That means the orchestration pattern is implemented, but the actual classifier quality depends on whether trained ONNX weights are supplied.

## Do you need to train models?

### Yes, if you want paper-style classification behavior

You should train models if you want:

- real learned predictions
- model comparison similar to the paper
- meaningful multi-agent voting across actual algorithms

### No, if you only want a workflow demo

You do not need training if your goal is only:

- demonstrating upload to orchestration flow
- UI and agent workflow demos
- backend integration tests

## Required model files for real inference

Set these in `backend/.env` after training/export:

```env
CNN_MODEL_PATH=../artifacts/models/cnn.onnx
RESNET50_MODEL_PATH=../artifacts/models/resnet50.onnx
VGG16_MODEL_PATH=../artifacts/models/vgg16.onnx
INCEPTION_V3_MODEL_PATH=../artifacts/models/inception_v3.onnx
```

You can also keep `MRI_MODEL_PATH` pointed at the CNN export for backward compatibility.

## Training command examples

Install training dependencies:

```bash
pip install -r scripts/requirements-train.txt
```

Train the proposed CNN and export ONNX:

```bash
python scripts/train_paper_models.py --model cnn --epochs 10 --export-onnx --cpu-only
```

Train ResNet-50:

```bash
python scripts/train_paper_models.py --model resnet50 --epochs 10 --export-onnx --cpu-only
```

Repeat similarly for:

- `vgg16`
- `inception_v3`

## Honest summary

Before this update, the repo was an agentic MRI support system but **not** a faithful implementation of your “each algorithm as an agent” request.

After this update, the repo now matches that minimum architecture:

- each paper algorithm is represented as a separate agent
- an orchestration agent combines them
- real training/export is supported

The remaining gap is simply whether you train and plug in actual weights.
