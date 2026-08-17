from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.emergency_contact import EmergencyContact
from app.repositories.emergency_contact_repository import (
    EmergencyContactRepository
)
from app.schemas.emergency_contact import (
    EmergencyContactCreate,
    EmergencyContactUpdate
)


class EmergencyContactService:

    @staticmethod
    def create_contact(
        db: Session,
        user_id: int,
        contact_data: EmergencyContactCreate
    ):

        # If this contact is primary,
        # remove primary status from existing contacts
        if contact_data.is_primary:

            existing_contacts = (
                EmergencyContactRepository.get_by_user(
                    db,
                    user_id
                )
            )

            for contact in existing_contacts:
                contact.is_primary = False

        # Create new contact
        new_contact = EmergencyContact(
            user_id=user_id,
            name=contact_data.name,
            phone_number=contact_data.phone_number,
            relationship=contact_data.relationship,
            is_primary=contact_data.is_primary
        )

        return EmergencyContactRepository.create(
            db,
            new_contact
        )

    @staticmethod
    def get_contacts(
        db: Session,
        user_id: int
    ):

        return EmergencyContactRepository.get_by_user(
            db,
            user_id
        )

    @staticmethod
    def update_contact(
        db: Session,
        user_id: int,
        contact_id: int,
        contact_data: EmergencyContactUpdate
    ):

        # Find contact
        contact = EmergencyContactRepository.get_by_id(
            db,
            contact_id
        )

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found."
            )

        # Make sure contact belongs to current user
        if contact.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to update this contact."
            )

        # Update fields
        if contact_data.name is not None:
            contact.name = contact_data.name

        if contact_data.phone_number is not None:
            contact.phone_number = contact_data.phone_number

        if contact_data.relationship is not None:
            contact.relationship = contact_data.relationship

        # Handle primary contact
        if contact_data.is_primary is True:

            existing_contacts = (
                EmergencyContactRepository.get_by_user(
                    db,
                    user_id
                )
            )

            for existing_contact in existing_contacts:
                existing_contact.is_primary = False

            contact.is_primary = True

        elif contact_data.is_primary is False:
            contact.is_primary = False

        return EmergencyContactRepository.update(
            db,
            contact
        )

    @staticmethod
    def delete_contact(
        db: Session,
        user_id: int,
        contact_id: int
    ):

        # Find contact
        contact = EmergencyContactRepository.get_by_id(
            db,
            contact_id
        )

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency contact not found."
            )

        # Make sure contact belongs to current user
        if contact.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not allowed to delete this contact."
            )

        EmergencyContactRepository.delete(
            db,
            contact
        )

        return {
            "message": "Emergency contact deleted successfully."
        }