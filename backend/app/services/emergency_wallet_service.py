from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.emergency_wallet import EmergencyWallet
from app.repositories.emergency_wallet_repository import (
    EmergencyWalletRepository
)
from app.schemas.emergency_wallet import (
    EmergencyWalletUpdate
)


class EmergencyWalletService:

    @staticmethod
    def get_wallet(
        db: Session,
        user_id: int
    ):

        wallet = EmergencyWalletRepository.get_by_user(
            db,
            user_id
        )

        # Create an empty wallet if one does not exist
        if not wallet:

            wallet = EmergencyWallet(
                user_id=user_id
            )

            wallet = EmergencyWalletRepository.create(
                db,
                wallet
            )

        return wallet

    @staticmethod
    def update_wallet(
        db: Session,
        user_id: int,
        wallet_data: EmergencyWalletUpdate
    ):

        wallet = EmergencyWalletRepository.get_by_user(
            db,
            user_id
        )

        # Create wallet if it doesn't exist yet
        if not wallet:

            wallet = EmergencyWallet(
                user_id=user_id
            )

            db.add(wallet)
            db.flush()

        # Update only fields supplied by the user
        update_data = wallet_data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(wallet, field, value)

        return EmergencyWalletRepository.update(
            db,
            wallet
        )