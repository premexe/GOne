import hmac

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.users import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserLogin
from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token


class UserService:

    @staticmethod
    def create_user(db: Session, user_data: UserCreate):

        # Check if email already exists
        existing_user = UserRepository.get_by_email(db, user_data.email)

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )

        # Hash password
        hashed_password = hash_password(user_data.password)

        # Create SQLAlchemy object
        new_user = User(
            full_name=user_data.full_name,
            email=user_data.email,
            phone_number=user_data.phone_number,
            password_hash=hashed_password,
            # Never retain a newly created user's raw password.
            plain_password=None,
            date_of_birth=user_data.date_of_birth,
            gender=user_data.gender,
            blood_group=user_data.blood_group,
            profile_photo=user_data.profile_photo
        )

        try:
            return UserRepository.create(db, new_user)
        except IntegrityError as exc:
            db.rollback()
            # Email and phone number are unique at the database level. Handle a
            # concurrent/duplicate signup as a user-safe validation error.
            constraint = str(getattr(exc, 'orig', '')).lower()
            message = (
                'This phone number is already registered.'
                if 'phone' in constraint
                else 'An account with this email address already exists.'
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc

    @staticmethod
    def get_all_users(db):
        return UserRepository.get_all(db)

    @staticmethod
    def get_user_by_id(db: Session, user_id: int):

        user = UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        return user

    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdate):

        user = UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        if user_data.full_name is not None:
            user.full_name = user_data.full_name

        if user_data.phone_number is not None:
            user.phone_number = user_data.phone_number

        if user_data.date_of_birth is not None:
            user.date_of_birth = user_data.date_of_birth

        if user_data.gender is not None:
            user.gender = user_data.gender

        if user_data.blood_group is not None:
            user.blood_group = user_data.blood_group

        if user_data.profile_photo is not None:
            user.profile_photo = user_data.profile_photo

        return UserRepository.update(db, user)

    @staticmethod
    def delete_user(db: Session, user_id: int):

        user = UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        UserRepository.delete(db, user)

        return {
            "message": "User deleted successfully."
        }

    @staticmethod
    def login_user(db: Session, login_data: UserLogin):

        # Find user by email
        user = UserRepository.get_by_email(db, login_data.email)

        # Invalid email
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        password_is_valid = verify_password(login_data.password, user.password_hash or "")

        # One-time recovery for accounts restored from older application backups.
        # Those rows may contain a legacy plain_password value while their bcrypt
        # hash was omitted or damaged. On the first successful legacy login, make
        # the account secure immediately and erase the raw legacy value.
        if not password_is_valid and user.plain_password:
            password_is_valid = hmac.compare_digest(login_data.password, user.plain_password)
            if password_is_valid:
                user.password_hash = hash_password(login_data.password)
                user.plain_password = None
                db.commit()

        if not password_is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        # Create JWT token
        access_token = create_access_token(
            data={
                "sub": str(user.user_id),
                "email": user.email
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
