## Dataset Overview

This project includes a local brain MRI classification dataset under `datasets/brain-tumor-mri/`.

### Structure

```text
datasets/
  brain-tumor-mri/
    Training/
      glioma/
      meningioma/
      notumor/
      pituitary/
    Testing/
      glioma/
      meningioma/
      notumor/
      pituitary/
```

### Intended Use

- `Training/`: reference data for future model training or offline evaluation
- `Testing/`: holdout examples for local validation and demos
- Current app runtime: not required for upload inference, but useful for experiments, benchmarking, and future ONNX model replacement

### Notes

- Source imported from `C:\Users\KIIT0001\Desktop\marksheets\archive`
- Approximate size: 7,200 images total
- Class labels:
  - `glioma`
  - `meningioma`
  - `notumor`
  - `pituitary`

### Recommendation

If you later train or convert a real classifier, keep any preprocessing scripts and label metadata in `scripts/` or `datasets/metadata/` rather than mixing them into the raw image folders.
