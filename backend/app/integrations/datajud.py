from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations.base import BaseIntegration
from app.models.models import Integration, IntegrationEvent, IntegrationEventDirection, IntegrationEventStatus, IntegrationStatus


class DataJudIntegration(BaseIntegration):
    name = "datajud"
    base_url = "https://api-publica.datajud.cnj.jus.br"
    default_endpoint_path = "api_publica_tjsp/_search"

    def __init__(self, db: AsyncSession, integration: Integration) -> None:
        self.db = db
        self.integration = integration

    async def _save_event(self, payload: dict[str, Any], status_value: IntegrationEventStatus) -> None:
        self.integration.last_event_at = datetime.now(UTC)
        self.integration.status = IntegrationStatus.ATIVA if status_value == IntegrationEventStatus.OK else IntegrationStatus.ERRO
        self.db.add(
            IntegrationEvent(
                integration_id=self.integration.id,
                direction=IntegrationEventDirection.OUTBOUND,
                payload=payload,
                status=status_value,
            )
        )
        await self.db.commit()

    async def query_process(self, numero_cnj: str, endpoint_path: str | None = None) -> dict[str, Any]:
        request_payload = {
            "size": 10,
            "query": {
                "bool": {
                    "should": [
                        {"match": {"numeroProcesso": numero_cnj}},
                        {"match": {"dadosBasicos.numero": numero_cnj}},
                    ],
                    "minimum_should_match": 1,
                }
            },
        }
        target_path = (endpoint_path or self.default_endpoint_path).lstrip("/")
        headers = {
            "Authorization": f"APIKey {settings.datajud_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=30.0) as client:
                response = await client.post(f"/{target_path}", headers=headers, json=request_payload)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as exc:
            error_payload = {
                "request": {"numero_cnj": numero_cnj, "endpoint_path": target_path},
                "error": str(exc),
            }
            await self._save_event(error_payload, IntegrationEventStatus.ERRO)
            raise

        event_payload = {
            "request": {"numero_cnj": numero_cnj, "endpoint_path": target_path},
            "response": payload,
        }
        await self._save_event(event_payload, IntegrationEventStatus.OK)
        return payload

    async def call(self, payload: dict[str, Any]) -> dict[str, Any]:
        numero_cnj = str(payload.get("numero_cnj", "")).strip()
        if not numero_cnj:
            raise ValueError("numero_cnj e obrigatorio.")
        return await self.query_process(numero_cnj, payload.get("endpoint_path"))

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        return payload
