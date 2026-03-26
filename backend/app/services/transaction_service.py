from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import extract, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.models import Client, Project, Transaction, TransactionStatus, TransactionType
from app.schemas.schemas import TransactionCreate, TransactionRead


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


async def refresh_overdue_statuses(db: AsyncSession) -> None:
    await db.execute(
        update(Transaction)
        .where(Transaction.status == TransactionStatus.PENDENTE, Transaction.due_date < date.today())
        .values(status=TransactionStatus.VENCIDO)
    )
    await db.commit()


async def get_transaction_or_404(db: AsyncSession, transaction_id: UUID) -> Transaction:
    result = await db.execute(
        select(Transaction)
        .options(joinedload(Transaction.client), joinedload(Transaction.project))
        .where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lancamento nao encontrado.")
    return transaction


def serialize_transaction(transaction: Transaction) -> TransactionRead:
    return TransactionRead.model_validate(transaction).model_copy(
        update={
            "client_name": transaction.client.name if transaction.client else None,
            "project_name": transaction.project.name if transaction.project else None,
        }
    )


async def list_transactions(
    db: AsyncSession,
    *,
    type_value: str | None = None,
    status_value: str | None = None,
    client_id: UUID | None = None,
    project_id: UUID | None = None,
    month: int | None = None,
    year: int | None = None,
) -> list[TransactionRead]:
    await refresh_overdue_statuses(db)
    statement = (
        select(Transaction)
        .options(selectinload(Transaction.client), selectinload(Transaction.project))
        .order_by(Transaction.due_date.asc(), Transaction.created_at.desc())
    )

    if type_value:
        statement = statement.where(Transaction.type == type_value)
    if status_value:
        statement = statement.where(Transaction.status == status_value)
    if client_id:
        statement = statement.where(Transaction.client_id == client_id)
    if project_id:
        statement = statement.where(Transaction.project_id == project_id)
    if month:
        statement = statement.where(extract("month", Transaction.due_date) == month)
    if year:
        statement = statement.where(extract("year", Transaction.due_date) == year)

    result = await db.execute(statement)
    transactions = result.scalars().all()
    return [serialize_transaction(transaction) for transaction in transactions]


async def create_transaction(db: AsyncSession, payload: TransactionCreate) -> TransactionRead:
    _, project = await _validate_links(db, payload.client_id, payload.project_id)
    data = payload.model_dump()

    if data["paid_at"] and data["status"] != TransactionStatus.PAGO:
        data["status"] = TransactionStatus.PAGO
    if data["status"] == TransactionStatus.PAGO and not data["paid_at"]:
        data["paid_at"] = date.today()
    if data["status"] == TransactionStatus.PENDENTE and data["due_date"] < date.today():
        data["status"] = TransactionStatus.VENCIDO

    transaction = Transaction(**data)
    if transaction.client_id is None and project is not None:
        transaction.client_id = project.client_id

    db.add(transaction)
    await db.commit()
    transaction = await get_transaction_or_404(db, transaction.id)
    return serialize_transaction(transaction)


async def mark_as_paid(db: AsyncSession, transaction_id: UUID) -> TransactionRead:
    transaction = await get_transaction_or_404(db, transaction_id)
    transaction.paid_at = date.today()
    transaction.status = TransactionStatus.PAGO
    await db.commit()
    transaction = await get_transaction_or_404(db, transaction.id)
    return serialize_transaction(transaction)


async def delete_transaction(db: AsyncSession, transaction_id: UUID) -> None:
    transaction = await get_transaction_or_404(db, transaction_id)
    await db.delete(transaction)
    await db.commit()
