import hashlib
import hmac
import logging
import os
import secrets
import time

log = logging.getLogger("roadmap.auth")

TOKEN_TTL_S = 30 * 24 * 3600
_ITERATIONS = 200_000

_secret: bytes | None = None


def _get_secret() -> bytes:
    global _secret
    if _secret is None:
        configured = os.environ.get("AUTH_SECRET")
        if configured:
            _secret = configured.encode()
        else:
            _secret = secrets.token_bytes(32)
            log.warning("AUTH_SECRET not set — sessions will not survive a restart")
    return _secret


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, digest = stored.split("$")
        check = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        )
        return hmac.compare_digest(check.hex(), digest)
    except (ValueError, TypeError):
        return False


def create_token(user_id: str) -> str:
    payload = f"{user_id}.{int(time.time()) + TOKEN_TTL_S}"
    sig = hmac.new(_get_secret(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def verify_token(token: str) -> str | None:
    """Returns the user id for a valid, unexpired token."""
    try:
        user_id, expires, sig = token.rsplit(".", 2)
        payload = f"{user_id}.{expires}"
        expected = hmac.new(_get_secret(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected) or time.time() > int(expires):
            return None
        return user_id
    except (ValueError, TypeError):
        return None
