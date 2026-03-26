from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import TaskCreate, TaskRead, TaskUpdate
from app.services import task_service


router = APIRouter(prefix="/tasks", tags=["tasks"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    project_id: UUID | None = Query(default=None),
    client_id: UUID | None = Query(default=None),
    due_today: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> list[TaskRead]:
    return await task_service.list_tasks(
        db,
        status_value=status,
        priority=priority,
        project_id=project_id,
        client_id=client_id,
        due_today=due_today,
    )


@router.post("", response_model=TaskRead, status_code=201)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)) -> TaskRead:
    return await task_service.create_task(db, payload)


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(task_id: UUID, payload: TaskUpdate, db: AsyncSession = Depends(get_db)) -> TaskRead:
    return await task_service.update_task(db, task_id, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    await task_service.delete_task(db, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
