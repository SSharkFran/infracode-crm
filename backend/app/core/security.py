from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
auth_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_reference_password_hash() -> str:
    return pwd_context.hash(settings.crm_password)


def verify_password(plain_password: str) -> bool:
    return pwd_context.verify(plain_password, get_reference_password_hash())


def authenticate_user(email: str, password: str) -> bool:
    return email.lower() == settings.crm_email.lower() and verify_password(password)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode: dict[str, Any] = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expire.timestamp())}
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido.") from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao obrigatoria.")

    payload = decode_token(credentials.credentials)
    subject = payload.get("sub")
    if subject is None or subject.lower() != settings.crm_email.lower():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido.")

    return {"email": subject}
