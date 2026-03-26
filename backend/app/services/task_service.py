from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.models import Client, Project, Task
from app.schemas.schemas import TaskCreate, TaskRead, TaskUpdate


async def _get_project(db: AsyncSession, project_id: UUID | None) -> Project | None:
    if project_id is None:
        return None
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto nao encontrado.")
    return project


async def _get_client(db: AsyncSession, client_id: UUID | None) -> Client | None:
    if client_id is None:
        return None
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente nao encontrado.")
    return client


async def _validate_links(db: AsyncSession, client_id: UUID | None, project_id: UUID | None) -> tuple[Client | None, Project | None]:
    client = await _get_client(db, client_id)
    project = await _get_project(db, project_id)

    if project and client and project.client_id != client.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Projeto e cliente informados nao pertencem ao mesmo registro.",
        )

    return client, project


async def get_task_or_404(db: AsyncSession, task_id: UUID) -> Task:
    result = await db.execute(
        select(Task)
        .options(joinedload(Task.client), joinedload(Task.project))
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa nao encontrada.")
    return task


def serialize_task(task: Task) -> TaskRead:
    return TaskRead.model_validate(task).model_copy(
        update={
            "client_name": task.client.name if task.client else None,
            "project_name": task.project.name if task.project else None,
        }
    )


async def list_tasks(
    db: AsyncSession,
    *,
    status_value: str | None = None,
    priority: str | None = None,
    project_id: UUID | None = None,
    client_id: UUID | None = None,
    due_today: bool = False,
) -> list[TaskRead]:
    statement = (
        select(Task)
        .options(selectinload(Task.client), selectinload(Task.project))
        .order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc())
    )

    if status_value:
        statement = statement.where(Task.status == status_value)
    if priority:
        statement = statement.where(Task.priority == priority)
    if project_id:
        statement = statement.where(Task.project_id == project_id)
    if client_id:
        statement = statement.where(Task.client_id == client_id)
    if due_today:
        statement = statement.where(Task.due_date == date.today())

    result = await db.execute(statement)
    tasks = result.scalars().all()
    return [serialize_task(task) for task in tasks]


async def create_task(db: AsyncSession, payload: TaskCreate) -> TaskRead:
    _, project = await _validate_links(db, payload.client_id, payload.project_id)
    task = Task(**payload.model_dump())
    if task.client_id is None and project is not None:
        task.client_id = project.client_id

    db.add(task)
    await db.commit()
    task = await get_task_or_404(db, task.id)
    return serialize_task(task)


async def update_task(db: AsyncSession, task_id: UUID, payload: TaskUpdate) -> TaskRead:
    task = await get_task_or_404(db, task_id)
    data = payload.model_dump(exclude_unset=True)

    new_client_id = data.get("client_id", task.client_id)
    new_project_id = data.get("project_id", task.project_id)
    _, project = await _validate_links(db, new_client_id, new_project_id)

    for field, value in data.items():
        setattr(task, field, value)

    if task.client_id is None and project is not None:
        task.client_id = project.client_id

    await db.commit()
    task = await get_task_or_404(db, task.id)
    return serialize_task(task)


async def delete_task(db: AsyncSession, task_id: UUID) -> None:
    task = await get_task_or_404(db, task_id)
    await db.delete(task)
    await db.commit()
