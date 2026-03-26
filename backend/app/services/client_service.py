from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Client, ClientInteraction, ClientStatus
from app.schemas.schemas import (
    ClientCreate,
    ClientDetail,
    ClientInteractionCreate,
    ClientInteractionRead,
    ClientRead,
    ClientUpdate,
)
from app.services.storage_service import list_attachments, serialize_attachments


async def get_client_or_404(db: AsyncSession, client_id: UUID, with_interactions: bool = False) -> Client:
    statement = select(Client).where(Client.id == client_id)
    if with_interactions:
        statement = statement.options(selectinload(Client.interactions))

    result = await db.execute(statement)
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente nao encontrado.")
    return client


async def list_clients(
    db: AsyncSession,
    *,
    client_type: str | None = None,
    status_value: str | None = None,
    search: str | None = None,
) -> list[ClientRead]:
    statement = select(Client).order_by(Client.created_at.desc())

    if client_type:
        statement = statement.where(Client.type == client_type)
    if status_value:
        statement = statement.where(Client.status == status_value)
    if search:
        token = f"%{search.strip()}%"
        statement = statement.where(or_(Client.name.ilike(token), Client.email.ilike(token)))

    result = await db.execute(statement)
    clients = result.scalars().all()
    return [ClientRead.model_validate(client) for client in clients]


async def create_client(db: AsyncSession, payload: ClientCreate) -> ClientRead:
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


async def get_client_detail(db: AsyncSession, client_id: UUID) -> ClientDetail:
    client = await get_client_or_404(db, client_id, with_interactions=True)
    attachments = await list_attachments(db, "client", client.id)
    serialized_attachments = await serialize_attachments(attachments)
    base = ClientRead.model_validate(client)
    serialized_interactions = [ClientInteractionRead.model_validate(item) for item in client.interactions]
    return ClientDetail(
        **base.model_dump(),
        interactions=serialized_interactions,
        attachments=serialized_attachments,
    )


async def update_client(db: AsyncSession, client_id: UUID, payload: ClientUpdate) -> ClientRead:
    client = await get_client_or_404(db, client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


async def soft_delete_client(db: AsyncSession, client_id: UUID) -> ClientRead:
    client = await get_client_or_404(db, client_id)
    client.status = ClientStatus.ENCERRADO
    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


async def add_interaction(db: AsyncSession, client_id: UUID, payload: ClientInteractionCreate):
    await get_client_or_404(db, client_id)
    interaction = ClientInteraction(client_id=client_id, **payload.model_dump())
    db.add(interaction)
    await db.commit()
    await db.refresh(interaction)
    return interaction


async def list_interactions(db: AsyncSession, client_id: UUID):
    await get_client_or_404(db, client_id)
    result = await db.execute(
        select(ClientInteraction)
        .where(ClientInteraction.client_id == client_id)
        .order_by(ClientInteraction.happened_at.desc())
    )
    return list(result.scalars().all())
