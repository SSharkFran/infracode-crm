import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.base import BaseIntegration
from app.models.models import Client, Integration, IntegrationEvent, IntegrationEventDirection, IntegrationEventStatus, IntegrationStatus


class WhatsAppIntegration(BaseIntegration):
    name = "whatsapp"

    def __init__(self, db: AsyncSession, integration: Integration) -> None:
        self.db = db
        self.integration = integration

    @staticmethod
    def _normalize_phone(value: str | None) -> str:
        return re.sub(r"\D", "", value or "")

    def _extract_sender(self, payload: dict[str, Any]) -> str | None:
        sender = payload.get("sender")
        if sender:
            return str(sender)

        key = payload.get("key") or {}
        remote_jid = key.get("remoteJid")
        if isinstance(remote_jid, str):
            return remote_jid.split("@")[0]
        return None

    def _extract_message(self, payload: dict[str, Any]) -> str:
        message = payload.get("message")
        if isinstance(message, str):
            return message
        if isinstance(message, dict):
            if isinstance(message.get("conversation"), str):
                return message["conversation"]
            if isinstance(message.get("extendedTextMessage"), dict):
                return message["extendedTextMessage"].get("text", "")
            if isinstance(message.get("imageMessage"), dict):
                return message["imageMessage"].get("caption", "")
        return str(payload.get("body", ""))

    async def _match_client(self, sender: str | None) -> Client | None:
        normalized = self._normalize_phone(sender)
        if not normalized:
            return None

        result = await self.db.execute(select(Client).where(Client.phone.is_not(None)))
        clients = result.scalars().all()
        for client in clients:
            candidate = self._normalize_phone(client.phone)
            if not candidate:
                continue
            if candidate.endswith(normalized[-10:]) or normalized.endswith(candidate[-10:]):
                return client
        return None

    async def call(self, payload: dict[str, Any]) -> dict[str, Any]:
        return payload

    async def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        sender = self._extract_sender(payload)
        message = self._extract_message(payload)
        matched_client = await self._match_client(sender)
        timestamp = payload.get("messageTimestamp") or payload.get("timestamp")

        event_payload = {
            "sender": sender,
            "message": message,
            "timestamp": timestamp,
            "raw": payload,
        }

        self.integration.last_event_at = datetime.now(UTC)
        self.integration.status = IntegrationStatus.ATIVA
        self.db.add(
            IntegrationEvent(
                integration_id=self.integration.id,
                client_id=matched_client.id if matched_client else None,
                direction=IntegrationEventDirection.INBOUND,
                payload=event_payload,
                status=IntegrationEventStatus.OK,
            )
        )
        await self.db.commit()
        return {
            "matched_client": matched_client.name if matched_client else None,
            "sender": sender,
            "message": message,
        }
