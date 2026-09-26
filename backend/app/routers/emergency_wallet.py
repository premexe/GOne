from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import HTMLResponse
from html import escape
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
from app.models.users import User
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_wallet import EmergencyWallet


router = APIRouter(
    prefix="/wallet",
    tags=["Emergency Wallet"]
)

@router.get("/public/{user_id}", response_class=HTMLResponse, include_in_schema=False)
def public_emergency_card(user_id: int, db: Session = Depends(get_db)):
    """Responder-safe view intended for a patient-presented emergency QR code."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Emergency card not found")
    wallet = db.query(EmergencyWallet).filter(EmergencyWallet.user_id == user_id).first()
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()
    value = lambda item: escape(item or "Not provided")
    contacts_html = "".join(f"<li>{escape(c.name)} ({escape(c.relationship or 'Emergency contact')}): <a href='tel:{escape(c.phone_number)}'>{escape(c.phone_number)}</a></li>" for c in contacts) or "<li>No contact recorded</li>"
    return HTMLResponse(f"""<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>LifeLink Emergency Card</title><style>body{{font-family:system-ui;margin:0;background:#f4f7fa;color:#10243e}}main{{max-width:600px;margin:auto;padding:24px}}section{{background:white;border-radius:14px;padding:18px;margin:12px 0;box-shadow:0 2px 8px #0001}}h1{{margin:0}}h2{{font-size:15px;color:#0e7c86}}.blood{{font-size:28px;color:#c51e35;font-weight:800}}</style></head><body><main><p>LifeLink emergency medical card</p><h1>{value(user.full_name)}</h1><section><div class='blood'>Blood group: {value((wallet.blood_group if wallet else None) or user.blood_group)}</div><h2>Allergies</h2><p>{value(wallet.allergies if wallet else None)}</p><h2>Current medications</h2><p>{value(wallet.current_medications if wallet else None)}</p><h2>Conditions</h2><p>{value(wallet.chronic_conditions if wallet else None)}</p><h2>Emergency notes</h2><p>{value(wallet.emergency_notes if wallet else None)}</p></section><section><h2>Emergency contacts</h2><ul>{contacts_html}</ul></section></main></body></html>""")


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
