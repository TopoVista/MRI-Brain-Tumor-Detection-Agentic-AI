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
- point them to hosted artifacts if you later upload the ONNX files somewhere external

If the model paths are empty, the backend still runs using its deterministic fallback logic.

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
