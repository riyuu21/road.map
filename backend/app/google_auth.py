"""Google OAuth helpers.

The FastAPI routes for Google auth live in main.py; this module holds the
Google-specific pieces so they sit next to auth.py (email/password) in a
consistent layout. Nothing here logs secrets.
"""

import os
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException

from .auth import create_token
from .repository import get_repository


def google_login_url() -> str:
    """Build the Google authorization URL the frontend uses to start the flow."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")
    if not client_id or not redirect_uri:
        raise HTTPException(503, "Google login is not configured.")
    params = urlencode({
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
    return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"


async def exchange_google_code(client: httpx.AsyncClient, code: str) -> dict:
    """Exchange an OAuth authorization code for Google tokens."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(503, "Google login is not configured.")
    res = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=12.0,
    )
    if res.status_code != 200:
        raise HTTPException(401, "Google authorization failed.")
    return res.json()


async def fetch_google_userinfo(client: httpx.AsyncClient, access_token: str) -> dict:
    """Load the authenticated user's profile from Google."""
    res = await client.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=12.0,
    )
    if res.status_code != 200:
        raise HTTPException(401, "Google profile could not be loaded.")
    return res.json()


async def google_session(info: dict) -> dict:
    """Create or update the user from Google profile info and issue a session.

    `info` is the decoded id_token claims (from tokeninfo) or the userinfo
    payload. Returns the same shape as email/password auth so the frontend
    handles every login path identically.
    """
    email = str(info.get("email") or "").strip().lower()
    sub = str(info.get("sub") or "").strip()
    if not email or not sub or info.get("email_verified") in {False, "false", "False"}:
        raise HTTPException(401, "Google account email could not be verified.")
    user = await get_repository().create_or_update_google_user(email, sub)
    settings = await get_repository().get_provider_settings(user.id)
    has_key = any(p.enabled and p.encryptedApiKey for p in settings.providers)
    return {
        "token": create_token(user.id),
        "email": user.email,
        "needsProviderOnboarding": str(not has_key).lower(),
    }
