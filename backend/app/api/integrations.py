from datetime import UTC, datetime
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.integrations import decrypt_config, encrypt_config
from app.integrations.datajud import DataJudIntegration
from app.models.models import Integration, IntegrationEvent, IntegrationType
from app.schemas.schemas import DataJudQueryRequest, IntegrationCreate, IntegrationEventPage, IntegrationEventRead, IntegrationRead, IntegrationUpdate


router = APIRouter(prefix="/integrations", tags=["integrations"], dependencies=[Depends(get_current_user)])


async def get_integration_or_404(db: AsyncSession, integration_id: UUID) -> Integration:
    result = await db.execute(select(Integration).where(Integration.id == integration_id))
    integration = result.scalar_one_or_none()
    if integration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integracao nao encontrada.")
    return integration


def serialize_integration(integration: Integration) -> IntegrationRead:
    return IntegrationRead.model_validate(integration).model_copy(update={"config": decrypt_config(integration.config)})


async def get_or_create_datajud_integration(db: AsyncSession) -> Integration:
    result = await db.execute(select(Integration).where(Integration.name == "datajud"))
    integration = result.scalar_one_or_none()
    if integration is not None:
        return integration

    integration = Integration(
        name="datajud",
        type=IntegrationType.API_OUT,
        config=encrypt_config({"endpoint_path": DataJudIntegration.default_endpoint_path}),
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return integration


@router.get("", response_model=list[IntegrationRead])
async def list_integrations(db: AsyncSession = Depends(get_db)) -> list[IntegrationRead]:
    result = await db.execute(select(Integration).order_by(Integration.name.asc()))
    integrations = result.scalars().all()
    return [serialize_integration(integration) for integration in integrations]


@router.post("", response_model=IntegrationRead, status_code=201)
async def create_integration(payload: IntegrationCreate, db: AsyncSession = Depends(get_db)) -> IntegrationRead:
    integration = Integration(
        name=payload.name,
        type=payload.type,
        config=encrypt_config(payload.config),
        status=payload.status,
    )
    db.add(integration)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nome de integracao ja existe.") from exc

    await db.refresh(integration)
    return serialize_integration(integration)


@router.put("/{integration_id}", response_model=IntegrationRead)
async def update_integration(
    integration_id: UUID,
    payload: IntegrationUpdate,
    db: AsyncSession = Depends(get_db),
) -> IntegrationRead:
    integration = await get_integration_or_404(db, integration_id)
    data = payload.model_dump(exclude_unset=True)

    if "config" in data and data["config"] is not None:
        integration.config = encrypt_config(data.pop("config"))
    for field, value in data.items():
        setattr(integration, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nome de integracao ja existe.") from exc

    await db.refresh(integration)
    return serialize_integration(integration)


@router.get("/{integration_id}/events", response_model=IntegrationEventPage)
async def list_integration_events(
    integration_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> IntegrationEventPage:
    await get_integration_or_404(db, integration_id)
    total = await db.scalar(select(func.count()).select_from(IntegrationEvent).where(IntegrationEvent.integration_id == integration_id))
    result = await db.execute(
        select(IntegrationEvent)
        .where(IntegrationEvent.integration_id == integration_id)
        .order_by(IntegrationEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [IntegrationEventRead.model_validate(item) for item in result.scalars().all()]
    return IntegrationEventPage(items=items, page=page, page_size=page_size, total=total or 0)


@router.post("/datajud/query")
async def query_datajud(payload: DataJudQueryRequest, db: AsyncSession = Depends(get_db)) -> dict:
    integration = await get_or_create_datajud_integration(db)
    saved_config = decrypt_config(integration.config)
    target_endpoint = payload.endpoint_path or saved_config.get("endpoint_path")
    client = DataJudIntegration(db, integration)

    try:
        result = await client.query_process(payload.numero_cnj, target_endpoint)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Falha ao consultar DataJud: {exc}") from exc

    return {
        "integration_id": str(integration.id),
        "queried_at": datetime.now(UTC).isoformat(),
        "result": result,
    }


@router.get("/datajud/process/{numero_cnj}")
async def get_datajud_process(numero_cnj: str, db: AsyncSession = Depends(get_db)) -> dict:
    payload = DataJudQueryRequest(numero_cnj=numero_cnj)
    return await query_datajud(payload, db)
