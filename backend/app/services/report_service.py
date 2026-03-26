from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Client, Project, Transaction, TransactionStatus, TransactionType
from app.schemas.schemas import ProfitByProjectItem, ReceivablesReport, ReceivablesStatusGroup, RevenueByClientItem, RevenueByMonthItem
from app.services.transaction_service import refresh_overdue_statuses, serialize_transaction


def _shift_month(source: date, offset: int) -> date:
    month_index = source.month - 1 + offset
    year = source.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


async def revenue_by_client(db: AsyncSession) -> list[RevenueByClientItem]:
    result = await db.execute(
        select(Client.id, Client.name, func.coalesce(func.sum(Transaction.amount), 0))
        .join(Transaction, Transaction.client_id == Client.id)
        .where(Transaction.type == TransactionType.RECEITA, Transaction.status == TransactionStatus.PAGO)
        .group_by(Client.id, Client.name)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [
        RevenueByClientItem(client_id=client_id, client_name=client_name, total_received=total)
        for client_id, client_name, total in result.all()
    ]


async def revenue_by_month(db: AsyncSession) -> list[RevenueByMonthItem]:
    current_month = date.today().replace(day=1)
    start_month = _shift_month(current_month, -11)
    end_month = _shift_month(current_month, 1)

    buckets: dict[tuple[int, int], Decimal] = {}
    for index in range(12):
        month = _shift_month(start_month, index)
        buckets[(month.year, month.month)] = Decimal("0")

    result = await db.execute(
        select(Transaction.paid_at, Transaction.amount)
        .where(
            Transaction.type == TransactionType.RECEITA,
            Transaction.status == TransactionStatus.PAGO,
            Transaction.paid_at.is_not(None),
            Transaction.paid_at >= start_month,
            Transaction.paid_at < end_month,
        )
    )

    for paid_at, amount in result.all():
        if paid_at is None:
            continue
        key = (paid_at.year, paid_at.month)
        if key in buckets:
            buckets[key] += amount

    items: list[RevenueByMonthItem] = []
    for index in range(12):
        month = _shift_month(start_month, index)
        items.append(
            RevenueByMonthItem(month=month.strftime("%m/%Y"), total_received=buckets[(month.year, month.month)])
        )
    return items


async def receivables(db: AsyncSession) -> ReceivablesReport:
    await refresh_overdue_statuses(db)
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.client), selectinload(Transaction.project))
        .where(Transaction.type == TransactionType.RECEITA)
        .order_by(Transaction.status.asc(), Transaction.due_date.asc())
    )
    transactions = result.scalars().all()

    grouped: list[ReceivablesStatusGroup] = []
    grand_total = Decimal("0")
    for status_value in [TransactionStatus.PENDENTE, TransactionStatus.PAGO, TransactionStatus.VENCIDO]:
        group_transactions = [transaction for transaction in transactions if transaction.status == status_value]
        total_amount = sum((transaction.amount for transaction in group_transactions), Decimal("0"))
        grand_total += total_amount
        grouped.append(
            ReceivablesStatusGroup(
                status=status_value,
                total_amount=total_amount,
                count=len(group_transactions),
                transactions=[serialize_transaction(transaction) for transaction in group_transactions],
            )
        )

    return ReceivablesReport(groups=grouped, grand_total=grand_total)


async def profit_by_project(db: AsyncSession) -> list[ProfitByProjectItem]:
    result = await db.execute(select(Project).options(selectinload(Project.transactions)).order_by(Project.name.asc()))
    projects = result.scalars().all()
    items: list[ProfitByProjectItem] = []

    for project in projects:
        total_receita = sum(
            (transaction.amount for transaction in project.transactions if transaction.type == TransactionType.RECEITA),
            Decimal("0"),
        )
        total_despesa = sum(
            (transaction.amount for transaction in project.transactions if transaction.type == TransactionType.DESPESA),
            Decimal("0"),
        )
        items.append(
            ProfitByProjectItem(
                project_id=project.id,
                project_name=project.name,
                total_receita=total_receita,
                total_despesa=total_despesa,
                lucro=total_receita - total_despesa,
            )
        )

    return items
