# ─────────────────────────────────────────────────────────────────────────────
#  Authentication Router (Standard JWT HS256 with Role-Based Access Control)
#  Roles: admin, chef, operator
# ─────────────────────────────────────────────────────────────────────────────
import base64
import hashlib
import hmac
import json
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = "bistro_robotique_secret_key_change_in_production"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode((s + padding).encode("ascii"))


def create_access_token(data: dict, expires_delta_sec: Optional[int] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    now = int(time.time())
    payload["iat"] = now
    payload["exp"] = now + (expires_delta_sec or ACCESS_TOKEN_EXPIRE_SECONDS)

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Signature mismatch")
    payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    if "exp" in payload and int(payload["exp"]) < int(time.time()):
        raise ValueError("Token expired")
    return payload


def hash_pw(pw: str) -> str:
    return hashlib.sha256(f"salt_{pw}".encode("utf-8")).hexdigest()


# Built-in demo accounts (password: "robot123")
DEMO_USERS = {
    "admin": {
        "username": "admin",
        "pw_hash": hash_pw("robot123"),
        "role": "admin",
        "full_name": "System Administrator",
    },
    "chef": {
        "username": "chef",
        "pw_hash": hash_pw("robot123"),
        "role": "chef",
        "full_name": "Head Chef",
    },
    "operator": {
        "username": "operator",
        "pw_hash": hash_pw("robot123"),
        "role": "operator",
        "full_name": "Robot Floor Operator",
    },
}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    username: str
    role: str
    full_name: str


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if username is None or username not in DEMO_USERS:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    return DEMO_USERS[username]


def require_role(allowed_roles: list[str]):
    def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {allowed_roles}",
            )
        return user
    return role_checker


@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest):
    user = DEMO_USERS.get(credentials.username)
    if not user or user["pw_hash"] != hash_pw(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
    }


@router.post("/token", response_model=Token)
async def token_endpoint(form_data: OAuth2PasswordRequestForm = Depends()):
    return await login(LoginRequest(username=form_data.username, password=form_data.password))


@router.get("/me", response_model=UserProfile)
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
    }
