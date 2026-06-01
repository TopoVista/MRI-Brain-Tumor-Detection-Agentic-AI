# Architecture

## System View

```mermaid
flowchart TD
  U[Browser] --> F[Next.js frontend]
  F --> B[FastAPI backend]
  B --> P[Preprocess image]
  P --> M1[CNN vote]
  M1 --> M2[ResNet-50 vote]
  M2 --> M3[VGG16 vote]
  M3 --> M4[Inception V3 vote]
  M4 --> C[Combine votes]
  C --> R[Show result]
  C --> X[Optional extra steps]
```

## Request Flow

1. The user uploads one MRI image in the frontend.
2. The frontend sends the file to the backend.
3. The backend stores the image.
4. The backend prepares the image for inference.
5. The four model votes run one after another.
6. The backend combines the votes into one result.
7. The backend builds the plain summary, class probabilities, and image signals.
8. The result is sent back to the UI.

## Modes

### Local Mode

- uses the four local ONNX files in `artifacts/models/`
- is meant for development on your machine
- should use the real model path when the files are present

### Hosted Mode

- runs on Vercel and Render
- can still work if the model files are missing
- falls back safely instead of breaking the upload flow

## Storage

- MRI uploads: `storage/uploads/`
- SQLite database: `storage/mri_copilot.db`
- Optional vector store: `chroma/`
- Optional model cache: `storage/model-cache/`

## Notes

- The main path stays focused on upload, preprocess, vote, and combine.
- Extra steps are available, but they are not required for the basic flow.
- The UI and API are meant to stay simple enough for local use and hosted use.
