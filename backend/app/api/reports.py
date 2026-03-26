from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import ProfitByProjectItem, ReceivablesReport, RevenueByClientItem, RevenueByMonthItem
from app.services import report_service


router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


@router.get("/revenue-by-client", response_model=list[RevenueByClientItem])
async def get_revenue_by_client(db: AsyncSession = Depends(get_db)) -> list[RevenueByClientItem]:
    return await report_service.revenue_by_client(db)


@router.get("/revenue-by-month", response_model=list[RevenueByMonthItem])
async def get_revenue_by_month(db: AsyncSession = Depends(get_db)) -> list[RevenueByMonthItem]:
    return await report_service.revenue_by_month(db)


@router.get("/receivables", response_model=ReceivablesReport)
async def get_receivables(db: AsyncSession = Depends(get_db)) -> ReceivablesReport:
    return await report_service.receivables(db)


@router.get("/profit-by-project", response_model=list[ProfitByProjectItem])
async def get_profit_by_project(db: AsyncSession = Depends(get_db)) -> list[ProfitByProjectItem]:
    return await report_service.profit_by_project(db)
