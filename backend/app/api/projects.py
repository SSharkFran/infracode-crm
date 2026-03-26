from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import AttachmentRead, ProjectCreate, ProjectDetail, ProjectRead, ProjectUpdate
from app.services import project_service, storage_service


router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    status: str | None = Query(default=None),
    client_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectRead]:
    return await project_service.list_projects(db, status_value=status, client_id=client_id)


@router.post("", response_model=ProjectRead, status_code=201)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    return await project_service.create_project(db, payload)


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project_detail(project_id: UUID, db: AsyncSession = Depends(get_db)) -> ProjectDetail:
    return await project_service.get_project_detail(db, project_id)


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(project_id: UUID, payload: ProjectUpdate, db: AsyncSession = Depends(get_db)) -> ProjectRead:
    return await project_service.update_project(db, project_id, payload)


@router.post("/{project_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_project_attachment(
    project_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> AttachmentRead:
    await project_service.get_project_or_404(db, project_id)
    attachment = await storage_service.upload_attachment(db, "project", project_id, file)
    return await storage_service.serialize_attachment(attachment)
