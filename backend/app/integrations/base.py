from abc import ABC, abstractmethod
from typing import Any


class BaseIntegration(ABC):
    name: str

    @abstractmethod
    async def call(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
