# Paper Alignment Check

Reference paper: [A Deep Analysis of Brain Tumor Detection from MR Images Using Deep Learning Networks](https://www.mdpi.com/1999-4893/16/4/176)

## What the paper actually specifies

The paper defines a **4-class MRI classification core**:

- proposed CNN
- ResNet-50
- VGG16
- Inception V3

with classes:

- `glioma`
- `meningioma`
- `notumor`
- `pituitary`

The methodology also states:

- preprocessing with normalization, Gaussian filtering, and Laplacian filtering
- augmentation with mirroring, rotation, width/height shifting, and zooming
- Adam optimizer
- learning rate `0.01`
- batch size `18`
- `80` epochs

## How the backend is now split

### Default: paper-core workflow

The default backend path is now:

`storage -> preprocessing_agent -> cnn_agent -> resnet50_agent -> vgg16_agent -> inception_v3_agent -> orchestration_agent`

This is the strict paper-faithful classification core:

- one AI agent per paper algorithm
- one thin orchestration AI agent
- no retrieval, report, verifier, or memory steps in the default workflow
- no heuristic fallback in strict mode

If a required ONNX weight is missing, the default workflow fails explicitly.

### Optional: extended support workflow

The repo still keeps the broader product agents:

- `retrieval_agent`
- `report_agent`
- `verification_agent`
- `memory`

These are now available only through the **extended workflow** and are not part of the default paper-core path.

## Inference alignment

The model agent metadata now reflects the paper-aligned runtime sizes:

- proposed CNN: `32x32`
- ResNet-50: `224x224`
- VGG16: `224x224`
- Inception V3: `299x299`

The inference path applies paper-aligned preprocessing before tensor preparation.

## Training alignment

The training script now defaults to:

- `--epochs 80`
- `--batch-size 18`
- `--learning-rate 0.01`
- proposed CNN architecture aligned to the paper description
- augmentation limited to paper-aligned transforms

### Split inconsistency resolution

The paper text contains both:

- a methodology statement of `80/10/10 train/validation/test`
- a holdout description of `80/20 train/test`

This repo resolves that by:

- using `80/10/10` as the default training configuration
- providing an optional `--split-mode holdout_80_20` for reproduction experiments

## Current operational model status

The backend is operational right now and uses these paper-core model artifacts:

- refreshed under the stricter paper-aligned retraining pass:
  - `cnn`
  - `resnet50`
- reused from the earlier completed training/export pass:
  - `vgg16`
  - `inception_v3`

This means the default paper-core workflow is runnable with all four algorithm agents plus orchestration, but only `cnn` and `resnet50` were refreshed under the latest stricter retraining pass.

### Why `vgg16` and `inception_v3` were not refreshed in the same pass

The stricter paper-default retraining sequence for `vgg16` and `inception_v3` is prohibitively slow on CPU-only hardware for the current deadline window. To keep the backend usable immediately, the project keeps:

- new paper-aligned `cnn`
- new paper-aligned `resnet50`
- existing earlier `vgg16`
- existing earlier `inception_v3`

This is an operational compromise, not a claim that all four models were freshly retrained under the same final configuration.

## Honest summary

Before this refactor, the backend was **paper-inspired but product-first**.

After this refactor:

- the **default backend** is strict to the paper's classification task
- each algorithm is an AI agent
- orchestration is a separate AI agent
- non-paper product agents remain optional and explicitly separated

### Honest operational note

As of the current runnable state:

- the paper-core backend architecture is strict
- the four-class label space is strict
- preprocessing and orchestration are strict
- `cnn` and `resnet50` were refreshed in the stricter retraining pass
- `vgg16` and `inception_v3` are temporarily served from earlier completed artifacts so the system can be used immediately
