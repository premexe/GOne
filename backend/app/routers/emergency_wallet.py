from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.schemas.emergency_wallet import (
    EmergencyWalletResponse,
    EmergencyWalletUpdate
)

from app.services.emergency_wallet_service import (
    EmergencyWalletService
)

from app.security.dependencies import get_current_user


router = APIRouter(
    prefix="/wallet",
    tags=["Emergency Wallet"]
)


@router.get(
    "/{user_id}",
    response_model=EmergencyWalletResponse
)
def get_wallet(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.user_id != user_id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to access this wallet."
        )

    return EmergencyWalletService.get_wallet(
        db,
        user_id
    )


@router.put(
    "/{user_id}",
    response_model=EmergencyWalletResponse
)
def update_wallet(
    user_id: int,
    wallet_data: EmergencyWalletUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    if current_user.user_id != user_id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this wallet."
        )

    return EmergencyWalletService.update_wallet(
        db,
        user_id,
        wallet_data
    )