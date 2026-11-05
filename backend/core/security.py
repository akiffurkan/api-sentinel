import secrets
from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from backend.config import Settings, get_settings


def mask_secret(secret: Optional[str]) -> str:
    """Safely mask secrets for logging or inspection (never expose raw token)."""
    if not secret:
        return "Not Configured"
    if len(secret) <= 8:
        return "***"
    return f"{secret[:4]}...{secret[-4:]}"


def verify_admin_token(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> bool:
    """
    Validate administrative access using constant-time comparison.
    Supports either 'Authorization: Bearer <token>' or 'X-API-Key: <token>'.
    Fails securely if ADMIN_TOKEN is not configured or token does not match.
    """
    if not settings.ADMIN_TOKEN:
        # Secure default: if admin token is not set, fail closed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_TOKEN is not configured on the server. Please set ADMIN_TOKEN in the environment."
        )

    provided_token: Optional[str] = None

    if x_api_key:
        provided_token = x_api_key.strip()
    elif authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_token = parts[1]
        elif len(parts) == 1:
            provided_token = parts[0]

    if not provided_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Provide 'Authorization: Bearer <token>' or 'X-API-Key'.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Constant-time comparison prevents timing attacks
    if not secrets.compare_digest(provided_token.encode("utf-8"), settings.ADMIN_TOKEN.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return True
