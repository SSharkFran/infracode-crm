from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.integrations import decrypt_config
from app.integrations.whatsapp import WhatsAppIntegration
from app.models.models import Integration, IntegrationEvent, IntegrationEventDirection, IntegrationEventStatus, IntegrationStatus


router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/{integration_name}")
async def receive_webhook(
    integration_name: str,
    payload: Any,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(select(Integration).where(Integration.name == integration_name))
    integration = result.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integracao nao encontrada.")

    normalized_payload = payload if isinstance(payload, dict) else {"payload": payload}
    config = decrypt_config(integration.config)
    provider = str(config.get("provider", "")).lower()

    if "whatsapp" in integration.name.lower() or provider == "whatsapp":
        handler = WhatsAppIntegration(db, integration)
        result_payload = await handler.handle_webhook(normalized_payload)
        return {"status": "ok", "result": result_payload}

    integration.last_event_at = datetime.now(UTC)
    integration.status = IntegrationStatus.ATIVA
    db.add(
        IntegrationEvent(
            integration_id=integration.id,
            direction=IntegrationEventDirection.INBOUND,
            payload=normalized_payload,
            status=IntegrationEventStatus.OK,
        )
    )
    await db.commit()
    return {"status": "ok", "received": True}
