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
from fastapi import APIRouter, Depends, status, HTTPException

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
    db: Session = Depends(get_db)
):
    return UserService.update_user(db, user_id, user)

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    return UserService.delete_user(db, user_id)

