from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserLogin,
    Token
)
from app.services.user_service import UserService
from app.security.dependencies import get_current_user
from fastapi import APIRouter, Depends, status, HTTPException, File, UploadFile
from pathlib import Path
from uuid import uuid4

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    return UserService.create_user(db, user)

from typing import List

@router.post(
    "/login",
    response_model=Token
)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    return UserService.login_user(db, login_data)

@router.get(
    "/",
    response_model=List[UserResponse]
)
def get_all_users(
    db: Session = Depends(get_db)
):
    return UserService.get_all_users(db)

@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to access this user."
        )

    return current_user

@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to update this user.")
    return UserService.update_user(db, user_id, user)

@router.post("/{user_id}/profile-photo", response_model=UserResponse)
def upload_profile_photo(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to update this user.")
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, or WebP image.")
    data = file.file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Profile photos must be 5 MB or smaller.")
    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
    target = Path("uploads/profile-photos") / f"user-{user_id}-{uuid4().hex}{suffix}"
    target.write_bytes(data)
    current_user.profile_photo = f"/uploads/profile-photos/{target.name}"
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to delete this user.")
    return UserService.delete_user(db, user_id)

