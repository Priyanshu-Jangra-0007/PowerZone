import os
import re
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="PowerZone Franchise Application API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FranchiseApplication(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=6, max_length=30)
    email: str = Field(min_length=5, max_length=254)
    city: str = Field(min_length=2, max_length=120)
    gym_name: str = Field(min_length=2, max_length=160)
    gym_area_sqft: int = Field(gt=0, le=500000)
    current_setup: str = Field(default="", max_length=3000)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError("Please enter a valid email address.")
        return email


def _env_flag(name: str, default: bool = False) -> bool:
    value = str(os.getenv(name, "")).strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def _smtp_settings() -> dict:
    host = os.getenv("SMTP_HOST", "").strip()
    port_raw = os.getenv("SMTP_PORT", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or username
    from_name = os.getenv("SMTP_FROM_NAME", "PowerZone").strip() or "PowerZone"

    if not host or not port_raw or not username or not password or not from_email:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured. Please set SMTP environment variables.",
        )

    try:
        port = int(port_raw)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="SMTP_PORT must be a valid number.") from exc

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": _env_flag("SMTP_USE_TLS", True),
        "use_ssl": _env_flag("SMTP_USE_SSL", False),
    }


def _send_message(message: EmailMessage, settings: dict) -> None:
    smtp_cls = smtplib.SMTP_SSL if settings["use_ssl"] else smtplib.SMTP

    try:
        with smtp_cls(settings["host"], settings["port"], timeout=20) as server:
            if settings["use_tls"] and not settings["use_ssl"]:
                server.starttls()
            server.login(settings["username"], settings["password"])
            server.send_message(message)
    except smtplib.SMTPException as exc:
        raise HTTPException(
            status_code=502,
            detail="Application received, but email delivery failed. Please try again in a moment.",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the email server. Please try again shortly.",
        ) from exc


def _build_confirmation_email(application: FranchiseApplication, settings: dict) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = "PowerZone partnership application received"
    message["From"] = f'{settings["from_name"]} <{settings["from_email"]}>'
    message["To"] = application.email

    current_setup = application.current_setup.strip() or "Not provided"
    message.set_content(
        "\n".join(
            [
                f"Hi {application.full_name},",
                "",
                "We have received your PowerZone partnership application.",
                "Our partnership team will review your details and contact you soon.",
                "",
                "Your submitted details:",
                f"- Full Name: {application.full_name}",
                f"- Phone Number: {application.phone_number}",
                f"- Email: {application.email}",
                f"- City: {application.city}",
                f"- Gym Name: {application.gym_name}",
                f"- Gym Area (sqft): {application.gym_area_sqft}",
                f"- Current Setup: {current_setup}",
                "",
                "Thank you for your interest in partnering with PowerZone.",
            ]
        )
    )
    return message


def _build_admin_email(application: FranchiseApplication, settings: dict, admin_email: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = f"New PowerZone franchise application: {application.gym_name}"
    message["From"] = f'{settings["from_name"]} <{settings["from_email"]}>'
    message["To"] = admin_email
    message["Reply-To"] = application.email

    current_setup = application.current_setup.strip() or "Not provided"
    message.set_content(
        "\n".join(
            [
                "A new PowerZone franchise application has been submitted.",
                "",
                f"Full Name: {application.full_name}",
                f"Phone Number: {application.phone_number}",
                f"Email: {application.email}",
                f"City: {application.city}",
                f"Gym Name: {application.gym_name}",
                f"Gym Area (sqft): {application.gym_area_sqft}",
                f"Current Setup: {current_setup}",
            ]
        )
    )
    return message


@app.get("/health")
def health() -> dict:
    admin_email = os.getenv("FRANCHISE_ADMIN_EMAIL", "").strip()
    return {
        "ok": True,
        "email_configured": bool(
            os.getenv("SMTP_HOST") and os.getenv("SMTP_PORT") and os.getenv("SMTP_USERNAME") and os.getenv("SMTP_PASSWORD")
        ),
        "admin_notification_configured": bool(admin_email),
    }


@app.post("/")
@app.post("/api/franchise-application")
def submit_franchise_application(application: FranchiseApplication) -> dict:
    settings = _smtp_settings()
    admin_email = os.getenv("FRANCHISE_ADMIN_EMAIL", "").strip()
    admin_notification_sent = False

    _send_message(_build_confirmation_email(application, settings), settings)
    if admin_email:
        try:
            _send_message(_build_admin_email(application, settings, admin_email), settings)
            admin_notification_sent = True
        except HTTPException:
            admin_notification_sent = False

    return {
        "ok": True,
        "message": "Application submitted successfully.",
        "confirmation_email_sent_to": application.email,
        "admin_notification_sent": admin_notification_sent,
    }
