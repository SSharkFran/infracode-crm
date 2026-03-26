from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.models import Client, Project, Task, Transaction
from app.schemas.schemas import ProjectCreate, ProjectDetail, ProjectRead, ProjectUpdate
from app.services.storage_service import list_attachments, serialize_attachments
from app.services.task_service import serialize_task
from app.services.transaction_service import refresh_overdue_statuses, serialize_transaction


async def _ensure_client(db: AsyncSession, client_id: UUID) -> Client:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente nao encontrado.")
    return client


async def get_project_or_404(db: AsyncSession, project_id: UUID, with_details: bool = False) -> Project:
    statement = select(Project).options(joinedload(Project.client))
    if with_details:
        statement = statement.options(
            selectinload(Project.tasks).selectinload(Task.client),
            selectinload(Project.tasks).selectinload(Task.project),
            selectinload(Project.transactions).selectinload(Transaction.client),
            selectinload(Project.transactions).selectinload(Transaction.project),
        )
    statement = statement.where(Project.id == project_id)

    result = await db.execute(statement)
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto nao encontrado.")
    return project


def serialize_project(project: Project) -> ProjectRead:
    return ProjectRead.model_validate(project).model_copy(
        update={"client_name": project.client.name if project.client else None}
    )


async def list_projects(
    db: AsyncSession,
    *,
    status_value: str | None = None,
    client_id: UUID | None = None,
) -> list[ProjectRead]:
    statement = select(Project).options(joinedload(Project.client)).order_by(Project.created_at.desc())
    if status_value:
        statement = statement.where(Project.status == status_value)
    if client_id:
        statement = statement.where(Project.client_id == client_id)

    result = await db.execute(statement)
    projects = result.scalars().all()
    return [serialize_project(project) for project in projects]


async def create_project(db: AsyncSession, payload: ProjectCreate) -> ProjectRead:
    await _ensure_client(db, payload.client_id)
    project = Project(**payload.model_dump())
    db.add(project)
    await db.commit()
    project = await get_project_or_404(db, project.id)
    return serialize_project(project)


async def get_project_detail(db: AsyncSession, project_id: UUID) -> ProjectDetail:
    await refresh_overdue_statuses(db)
    project = await get_project_or_404(db, project_id, with_details=True)
    attachments = await list_attachments(db, "project", project.id)
    base = serialize_project(project)
    return ProjectDetail(
        **base.model_dump(),
        tasks=[serialize_task(task) for task in project.tasks],
        transactions=[serialize_transaction(transaction) for transaction in project.transactions],
        attachments=await serialize_attachments(attachments),
    )


async def update_project(db: AsyncSession, project_id: UUID, payload: ProjectUpdate) -> ProjectRead:
    project = await get_project_or_404(db, project_id)
    data = payload.model_dump(exclude_unset=True)

    if "client_id" in data and data["client_id"] is not None:
        await _ensure_client(db, data["client_id"])

    for field, value in data.items():
        setattr(project, field, value)

    await db.commit()
    project = await get_project_or_404(db, project.id)
    return serialize_project(project)
