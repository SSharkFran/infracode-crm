from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import AttachmentRead, ClientCreate, ClientDetail, ClientInteractionCreate, ClientInteractionRead, ClientRead, ClientUpdate
from app.services import client_service, storage_service


router = APIRouter(prefix="/clients", tags=["clients"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ClientRead])
async def list_clients(
    type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ClientRead]:
    return await client_service.list_clients(db, client_type=type, status_value=status, search=search)


@router.post("", response_model=ClientRead, status_code=201)
async def create_client(payload: ClientCreate, db: AsyncSession = Depends(get_db)) -> ClientRead:
    return await client_service.create_client(db, payload)


@router.get("/{client_id}", response_model=ClientDetail)
async def get_client_detail(client_id: UUID, db: AsyncSession = Depends(get_db)) -> ClientDetail:
    return await client_service.get_client_detail(db, client_id)


@router.put("/{client_id}", response_model=ClientRead)
async def update_client(client_id: UUID, payload: ClientUpdate, db: AsyncSession = Depends(get_db)) -> ClientRead:
    return await client_service.update_client(db, client_id, payload)


@router.delete("/{client_id}", response_model=ClientRead)
async def delete_client(client_id: UUID, db: AsyncSession = Depends(get_db)) -> ClientRead:
    return await client_service.soft_delete_client(db, client_id)


@router.post("/{client_id}/interactions", response_model=ClientInteractionRead, status_code=201)
async def add_interaction(
    client_id: UUID,
    payload: ClientInteractionCreate,
    db: AsyncSession = Depends(get_db),
) -> ClientInteractionRead:
    interaction = await client_service.add_interaction(db, client_id, payload)
    return ClientInteractionRead.model_validate(interaction)


@router.get("/{client_id}/interactions", response_model=list[ClientInteractionRead])
async def list_interactions(client_id: UUID, db: AsyncSession = Depends(get_db)) -> list[ClientInteractionRead]:
    interactions = await client_service.list_interactions(db, client_id)
    return [ClientInteractionRead.model_validate(interaction) for interaction in interactions]


@router.post("/{client_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_client_attachment(
    client_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> AttachmentRead:
    await client_service.get_client_or_404(db, client_id)
    attachment = await storage_service.upload_attachment(db, "client", client_id, file)
    return await storage_service.serialize_attachment(attachment)
