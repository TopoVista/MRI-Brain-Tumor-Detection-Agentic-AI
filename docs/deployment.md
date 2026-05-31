# Deployment Guide

This project is easiest to deploy for free as:

- `Frontend` on Vercel
- `Backend` on Render free tier

Because the trained ONNX weights are large and not committed to the repo, the free deployment path should be treated as an operational demo unless you host the model artifacts elsewhere and point the backend at them.

## 1. Deploy the backend on Render

Use the existing `render.yaml` or create a new Render web service from the `backend/` folder.

Recommended settings:

- `Runtime`: Python
- `Root directory`: `backend`
- `Python version`: set `PYTHON_VERSION=3.11.13` in Render, or keep the checked-in `backend/.python-version`
- `Build command`: `pip install -r requirements.txt`
- `Start command`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required environment variables:

- `APP_ENV=production`
- `API_PREFIX=/api`
- `JWT_SECRET=<generate-a-long-random-secret>`

Optional environment variables:

- `LLM_PROVIDER=local`
- `OPENAI_API_KEY=...`
- `GROQ_API_KEY=...`
- `GEMINI_API_KEY=...`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`

Model paths:

- Leave the model path variables empty for the free demo mode, or
- set either local paths or model URLs if you upload the ONNX files somewhere external

If you want the deployed app to actually use CNN, ResNet-50, VGG16, and Inception V3 on Render, host the four `.onnx` files somewhere public and set:

- `CNN_MODEL_URL`
- `RESNET50_MODEL_URL`
- `VGG16_MODEL_URL`
- `INCEPTION_V3_MODEL_URL`

The backend will download those files on first use and cache them under `storage/model-cache/`. If neither local paths nor URLs are configured, the backend still runs using its deterministic fallback logic.

For Render specifically, avoid the default Python 3.14 runtime. This project is pinned to Python 3.11.13 so `onnxruntime` installs cleanly.

## 2. Deploy the frontend on Vercel

Create a new Vercel project and set the `frontend/` directory as the project root.

Recommended settings:

- `Framework`: Next.js
- `Root directory`: `frontend`
- `Build command`: `npm run build`
- `Output`: default

Environment variables:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend>.onrender.com/api`

If you prefer, you can leave `NEXT_PUBLIC_API_BASE_URL` unset because the frontend now rewrites `/api/*` to your Render backend automatically.

## 3. Local example files

Use these as a reference for the production environment:

- [frontend/.env.production.example](</C:/Users/KIIT0001/Desktop/MRI agent/frontend/.env.production.example>)
- [frontend/.env.local.example](</C:/Users/KIIT0001/Desktop/MRI agent/frontend/.env.local.example>)
- [backend/.env.example](</C:/Users/KIIT0001/Desktop/MRI agent/backend/.env.example>)

## 4. Post-deploy checklist

1. Open the backend health endpoint and confirm it returns `ok`.
2. Open the frontend and upload one MRI image.
3. If the analysis page fails to call the backend, redeploy Vercel after the latest frontend changes. If you kept `NEXT_PUBLIC_API_BASE_URL` set, confirm it matches the Render URL.
4. If you later host real model weights externally, set the four `*_MODEL_PATH` values in the backend environment.

## Notes

- The Render free tier can sleep when idle.
- The Vercel frontend is free for personal projects.
- If you want fully model-backed inference instead of fallback mode, you need to host the ONNX files somewhere accessible to the backend.

## 5. Optional: host the ONNX models on Hugging Face

The easiest free place to host the four ONNX files is a public Hugging Face model repo. Hugging Face supports uploading large files through the web UI or the `hf` CLI, and individual files can be downloaded directly from the Hub or via `hf_hub_download()` URLs.

Recommended repo setup:

- Repo name: `topovista-mri-onnx`
- Visibility: `Public`
- Files:
  - `cnn.onnx`
  - `resnet50.onnx`
  - `vgg16.onnx`
  - `inception_v3.onnx`

After uploading, set these Render environment variables:

```env
CNN_MODEL_URL=https://huggingface.co/<your-username>/topovista-mri-onnx/resolve/main/cnn.onnx
RESNET50_MODEL_URL=https://huggingface.co/<your-username>/topovista-mri-onnx/resolve/main/resnet50.onnx
VGG16_MODEL_URL=https://huggingface.co/<your-username>/topovista-mri-onnx/resolve/main/vgg16.onnx
INCEPTION_V3_MODEL_URL=https://huggingface.co/<your-username>/topovista-mri-onnx/resolve/main/inception_v3.onnx
STRICT_PAPER_CORE=true
```

Keep `STRICT_PAPER_CORE=true` only after all four URLs are set and the files are public. The backend will download each file on first use and cache it in `storage/model-cache/`.

## 6. Optional: store uploads in Cloudinary

Right now, uploaded MRI images fall back to local storage on Render if no Cloudinary credentials are set. For a more durable free deployment, use Cloudinary so uploads are stored outside the Render filesystem.

What to create in Cloudinary:

- Account: free Cloudinary account
- Keep the default upload preset setup unless you already have one
- Copy these values from the Cloudinary dashboard:
  - `cloud_name`
  - `api_key`
  - `api_secret`

Then set these Render environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

After setting them, redeploy Render. The backend will automatically switch to Cloudinary uploads and only fall back to local disk if an upload request fails.
