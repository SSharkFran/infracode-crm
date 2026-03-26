from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import TransactionCreate, TransactionRead
from app.services import transaction_service


router = APIRouter(prefix="/transactions", tags=["transactions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[TransactionRead])
async def list_transactions(
    type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    client_id: UUID | None = Query(default=None),
    project_id: UUID | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
) -> list[TransactionRead]:
    return await transaction_service.list_transactions(
        db,
        type_value=type,
        status_value=status,
        client_id=client_id,
        project_id=project_id,
        month=month,
        year=year,
    )


@router.post("", response_model=TransactionRead, status_code=201)
async def create_transaction(payload: TransactionCreate, db: AsyncSession = Depends(get_db)) -> TransactionRead:
    return await transaction_service.create_transaction(db, payload)


@router.put("/{transaction_id}/pay", response_model=TransactionRead)
async def pay_transaction(transaction_id: UUID, db: AsyncSession = Depends(get_db)) -> TransactionRead:
    return await transaction_service.mark_as_paid(db, transaction_id)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: UUID, db: AsyncSession = Depends(get_db)) -> Response:
    await transaction_service.delete_transaction(db, transaction_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
