from sqlalchemy.orm import Session

from app.models.users import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:

    @staticmethod
    def create(db: Session, user: User):
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_by_id(db: Session, user_id: int):
        return db.query(User).filter(User.user_id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_all(db: Session):
        return db.query(User).all()

    @staticmethod
    def update(db: Session, user: User):
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user: User):
        db.delete(user)
        db.commit()

    @staticmethod
    def get_all(db):
        return db.query(User).all()

    @staticmethod
    def update(db: Session, user: User):

        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def delete(db: Session, user: User):

        db.delete(user)
        db.commit()

        return True