from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


# ==========================
# Create User
# ==========================
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: str
    password: str

    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    profile_photo: Optional[str] = None

# ==========================
# Login User
# ==========================
class UserLogin(BaseModel):
    email: EmailStr
    password: str  


# ==========================
# Update User
# ==========================
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    profile_photo: Optional[str] = None


# ==========================
# Response Model
# ==========================
class UserResponse(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    phone_number: str

    date_of_birth: Optional[date]
    gender: Optional[str]
    blood_group: Optional[str]
    profile_photo: Optional[str]

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str