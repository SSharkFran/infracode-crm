from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import (
    ClientStatus,
    ClientType,
    IntegrationEventDirection,
    IntegrationEventStatus,
    IntegrationStatus,
    IntegrationType,
    ProjectStatus,
    TaskPriority,
    TaskStatus,
    TransactionStatus,
    TransactionType,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AttachmentRead(ORMModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    filename: str
    storage_key: str
    uploaded_at: datetime
    download_url: str | None = None


class ClientInteractionCreate(BaseModel):
    type: str = Field(min_length=2, max_length=100)
    summary: str = Field(min_length=3)
    happened_at: datetime


class ClientInteractionRead(ORMModel):
    id: UUID
    client_id: UUID
    type: str
    summary: str
    happened_at: datetime


class ClientBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    type: ClientType
    status: ClientStatus = ClientStatus.ATIVO
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    type: ClientType | None = None
    status: ClientStatus | None = None
    notes: str | None = None


class ClientRead(ORMModel):
    id: UUID
    name: str
    email: str | None
    phone: str | None
    type: ClientType
    status: ClientStatus
    notes: str | None
    created_at: datetime


class ClientDetail(ClientRead):
    interactions: list[ClientInteractionRead]
    attachments: list[AttachmentRead]


class ProjectBase(BaseModel):
    client_id: UUID
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    status: ProjectStatus = ProjectStatus.PLANEJAMENTO
    value: Decimal | None = Field(default=None, ge=0)
    started_at: date | None = None
    deadline: date | None = None
    delivered_at: date | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    client_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None
    value: Decimal | None = Field(default=None, ge=0)
    started_at: date | None = None
    deadline: date | None = None
    delivered_at: date | None = None


class ProjectRead(ORMModel):
    id: UUID
    client_id: UUID
    client_name: str | None = None
    name: str
    description: str | None
    status: ProjectStatus
    value: Decimal | None
    started_at: date | None
    deadline: date | None
    delivered_at: date | None
    created_at: datetime


class TaskBase(BaseModel):
    project_id: UUID | None = None
    client_id: UUID | None = None
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIA
    status: TaskStatus = TaskStatus.PENDENTE
    due_date: date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    project_id: UUID | None = None
    client_id: UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None


class TaskRead(ORMModel):
    id: UUID
    project_id: UUID | None
    client_id: UUID | None
    project_name: str | None = None
    client_name: str | None = None
    title: str
    description: str | None
    priority: TaskPriority
    status: TaskStatus
    due_date: date | None
    created_at: datetime


class TransactionBase(BaseModel):
    project_id: UUID | None = None
    client_id: UUID | None = None
    type: TransactionType
    description: str = Field(min_length=2, max_length=255)
    amount: Decimal = Field(gt=0)
    due_date: date
    paid_at: date | None = None
    status: TransactionStatus = TransactionStatus.PENDENTE


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(ORMModel):
    id: UUID
    project_id: UUID | None
    client_id: UUID | None
    project_name: str | None = None
    client_name: str | None = None
    type: TransactionType
    description: str
    amount: Decimal
    due_date: date
    paid_at: date | None
    status: TransactionStatus
    created_at: datetime


class ProjectDetail(ProjectRead):
    tasks: list[TaskRead]
    transactions: list[TransactionRead]
    attachments: list[AttachmentRead]


class IntegrationBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    type: IntegrationType
    config: dict[str, Any] = Field(default_factory=dict)
    status: IntegrationStatus = IntegrationStatus.ATIVA


class IntegrationCreate(IntegrationBase):
    pass


class IntegrationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    type: IntegrationType | None = None
    config: dict[str, Any] | None = None
    status: IntegrationStatus | None = None


class IntegrationRead(ORMModel):
    id: UUID
    name: str
    type: IntegrationType
    config: dict[str, Any]
    status: IntegrationStatus
    last_event_at: datetime | None


class IntegrationEventRead(ORMModel):
    id: UUID
    integration_id: UUID
    client_id: UUID | None
    direction: IntegrationEventDirection
    payload: dict[str, Any]
    status: IntegrationEventStatus
    created_at: datetime


class IntegrationEventPage(BaseModel):
    items: list[IntegrationEventRead]
    page: int
    page_size: int
    total: int


class DataJudQueryRequest(BaseModel):
    numero_cnj: str = Field(min_length=10, max_length=32)
    endpoint_path: str | None = Field(default=None, max_length=255)


class RevenueByClientItem(BaseModel):
    client_id: UUID | None
    client_name: str
    total_received: Decimal


class RevenueByMonthItem(BaseModel):
    month: str
    total_received: Decimal


class ReceivablesStatusGroup(BaseModel):
    status: TransactionStatus
    total_amount: Decimal
    count: int
    transactions: list[TransactionRead]


class ReceivablesReport(BaseModel):
    groups: list[ReceivablesStatusGroup]
    grand_total: Decimal


class ProfitByProjectItem(BaseModel):
    project_id: UUID
    project_name: str
    total_receita: Decimal
    total_despesa: Decimal
    lucro: Decimal
