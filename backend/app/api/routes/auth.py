from fastapi import APIRouter, Form, HTTPException, status

from app.schemas.auth import TokenResponse
from app.services.auth import authenticate_user, create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse)
async def issue_token(username: str = Form(...), password: str = Form(...)) -> TokenResponse:
    if not authenticate_user(username, password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    return TokenResponse(access_token=create_access_token(username))
