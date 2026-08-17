from sqlalchemy.orm import Session

from app.models.emergency_wallet import EmergencyWallet


class EmergencyWalletRepository:

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int
    ):
        return (
            db.query(EmergencyWallet)
            .filter(
                EmergencyWallet.user_id == user_id
            )
            .first()
        )

    @staticmethod
    def create(
        db: Session,
        wallet: EmergencyWallet
    ):
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

        return wallet

    @staticmethod
    def update(
        db: Session,
        wallet: EmergencyWallet
    ):
        db.commit()
        db.refresh(wallet)

        return wallet