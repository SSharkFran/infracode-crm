import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


fernet_error_message = "FERNET_KEY invalida. Gere uma chave com Fernet.generate_key()."


def get_fernet() -> Fernet:
    try:
        return Fernet(settings.fernet_key.encode())
    except Exception as exc:  # pragma: no cover - defensive branch
        raise RuntimeError(fernet_error_message) from exc


def encrypt_config(config: dict[str, Any]) -> dict[str, str]:
    token = get_fernet().encrypt(json.dumps(config).encode()).decode()
    return {"_encrypted": token}


def decrypt_config(raw_config: Any) -> dict[str, Any]:
    if isinstance(raw_config, dict) and "_encrypted" in raw_config:
        token = raw_config["_encrypted"]
        try:
            decrypted = get_fernet().decrypt(token.encode()).decode()
            return json.loads(decrypted)
        except (InvalidToken, json.JSONDecodeError) as exc:
            raise RuntimeError("Nao foi possivel descriptografar a configuracao da integracao.") from exc
    if isinstance(raw_config, dict):
        return raw_config
    return {}
