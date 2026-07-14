import base64
import hashlib
import hmac
import os
import secrets


def _secret() -> bytes:
    configured = os.environ.get("PROVIDER_KEYS_SECRET") or os.environ.get("AUTH_SECRET")
    if not configured:
        raise RuntimeError("PROVIDER_KEYS_SECRET or AUTH_SECRET is required to store provider keys.")
    return configured.encode()


def _keystream(key: bytes, salt: bytes, length: int) -> bytes:
    out = b""
    counter = 0
    while len(out) < length:
        out += hmac.new(key, salt + counter.to_bytes(4, "big"), hashlib.sha256).digest()
        counter += 1
    return out[:length]


def encrypt_secret(value: str) -> str:
    """Small stdlib authenticated encryption helper for BYOK storage.

    It avoids adding a heavyweight dependency in this project. Set PROVIDER_KEYS_SECRET
    to a stable, high-entropy value in production; changing it makes saved keys unreadable.
    """
    raw = value.encode()
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", _secret(), salt, 200_000, dklen=32)
    ciphertext = bytes(a ^ b for a, b in zip(raw, _keystream(key, salt, len(raw))))
    tag = hmac.new(key, salt + ciphertext, hashlib.sha256).digest()
    return "v1." + base64.urlsafe_b64encode(salt + tag + ciphertext).decode()


def decrypt_secret(value: str) -> str:
    if not value.startswith("v1."):
        raise ValueError("Unsupported encrypted secret format")
    blob = base64.urlsafe_b64decode(value[3:].encode())
    salt, tag, ciphertext = blob[:16], blob[16:48], blob[48:]
    key = hashlib.pbkdf2_hmac("sha256", _secret(), salt, 200_000, dklen=32)
    expected = hmac.new(key, salt + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("Encrypted secret failed authentication")
    raw = bytes(a ^ b for a, b in zip(ciphertext, _keystream(key, salt, len(ciphertext))))
    return raw.decode()


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    prefix = value[:4]
    suffix = value[-4:] if len(value) >= 4 else value
    return f"{prefix}••••{suffix}"
