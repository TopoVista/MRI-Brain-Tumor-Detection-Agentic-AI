import json

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import ValidationError
from starlette.responses import StreamingResponse

from app.core.logging import get_logger
from app.schemas.analysis import AnalysisResponse, AnalysisSummary, CaseDetail
from app.services.case_repository import get_case, list_cases
from app.workflows.orchestrator import run_analysis_workflow, run_extended_analysis_workflow, stream_analysis_workflow


router = APIRouter(prefix="/analysis", tags=["analysis"])
logger = get_logger(__name__)


@router.post("/upload", response_model=AnalysisResponse)
async def upload_mri(file: UploadFile = File(...)) -> AnalysisResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    try:
        return await run_analysis_workflow(filename=file.filename or "scan.png", content=content)
    except ValidationError as exc:
        logger.exception("Validation error during MRI workflow")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {exc.errors()}") from exc
    except Exception as exc:
        logger.exception("Unhandled error during MRI workflow")
        raise HTTPException(status_code=500, detail=f"Workflow failed: {exc}") from exc


@router.post("/upload-extended", response_model=AnalysisResponse)
async def upload_mri_extended(file: UploadFile = File(...)) -> AnalysisResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    try:
        return await run_extended_analysis_workflow(filename=file.filename or "scan.png", content=content)
    except ValidationError as exc:
        logger.exception("Validation error during extended MRI workflow")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {exc.errors()}") from exc
    except Exception as exc:
        logger.exception("Unhandled error during extended MRI workflow")
        raise HTTPException(status_code=500, detail=f"Workflow failed: {exc}") from exc


@router.post("/upload-stream")
async def upload_mri_stream(file: UploadFile = File(...)) -> StreamingResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    async def event_generator():
        try:
            async for event in stream_analysis_workflow(filename=file.filename or "scan.png", content=content, extended=False):
                yield f"data: {json.dumps(event)}\n\n"
        except ValidationError as exc:
            logger.exception("Validation error during MRI workflow stream")
            yield f"data: {json.dumps({'type': 'error', 'detail': f'Workflow validation failed: {exc.errors()}'})}\n\n"
        except Exception as exc:
            logger.exception("Unhandled error during MRI workflow stream")
            yield f"data: {json.dumps({'type': 'error', 'detail': f'Workflow failed: {exc}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/upload-stream-extended")
async def upload_mri_stream_extended(file: UploadFile = File(...)) -> StreamingResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    async def event_generator():
        try:
            async for event in stream_analysis_workflow(filename=file.filename or "scan.png", content=content, extended=True):
                yield f"data: {json.dumps(event)}\n\n"
        except ValidationError as exc:
            logger.exception("Validation error during extended MRI workflow stream")
            yield f"data: {json.dumps({'type': 'error', 'detail': f'Workflow validation failed: {exc.errors()}'})}\n\n"
        except Exception as exc:
            logger.exception("Unhandled error during extended MRI workflow stream")
            yield f"data: {json.dumps({'type': 'error', 'detail': f'Workflow failed: {exc}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/cases", response_model=list[AnalysisSummary])
async def get_cases() -> list[AnalysisSummary]:
    return list_cases()


@router.get("/cases/{case_id}", response_model=CaseDetail)
async def get_case_by_id(case_id: str) -> CaseDetail:
    record = get_case(case_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Case not found.")
    return record
