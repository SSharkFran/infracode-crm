import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(AsyncAttrs, DeclarativeBase):
    pass


def enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


def db_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    return Enum(enum_cls, name=name, values_callable=enum_values)


class ClientType(str, enum.Enum):
    RECORRENTE = "recorrente"
    PONTUAL = "pontual"
    LEAD = "lead"
    PARCEIRO = "parceiro"


class ClientStatus(str, enum.Enum):
    ATIVO = "ativo"
    NEGOCIACAO = "negociacao"
    ENCERRADO = "encerrado"
    INADIMPLENTE = "inadimplente"


class ProjectStatus(str, enum.Enum):
    PLANEJAMENTO = "planejamento"
    ANDAMENTO = "andamento"
    ENTREGUE = "entregue"
    CANCELADO = "cancelado"


class TransactionType(str, enum.Enum):
    RECEITA = "receita"
    DESPESA = "despesa"


class TransactionStatus(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    VENCIDO = "vencido"


class TaskPriority(str, enum.Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


class TaskStatus(str, enum.Enum):
    PENDENTE = "pendente"
    ANDAMENTO = "andamento"
    CONCLUIDA = "concluida"


class IntegrationType(str, enum.Enum):
    WEBHOOK_IN = "webhook_in"
    API_OUT = "api_out"


class IntegrationStatus(str, enum.Enum):
    ATIVA = "ativa"
    INATIVA = "inativa"
    ERRO = "erro"


class IntegrationEventDirection(str, enum.Enum):
    INBOUND = "in"
    OUTBOUND = "out"


class IntegrationEventStatus(str, enum.Enum):
    OK = "ok"
    ERRO = "erro"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    type: Mapped[ClientType] = mapped_column(db_enum(ClientType, "client_type_enum"), nullable=False)
    status: Mapped[ClientStatus] = mapped_column(
        db_enum(ClientStatus, "client_status_enum"),
        nullable=False,
        default=ClientStatus.ATIVO,
        server_default=ClientStatus.ATIVO.value,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    interactions: Mapped[list["ClientInteraction"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(ClientInteraction.happened_at)",
    )
    projects: Mapped[list["Project"]] = relationship(back_populates="client")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="client")
    tasks: Mapped[list["Task"]] = relationship(back_populates="client")
    integration_events: Mapped[list["IntegrationEvent"]] = relationship(back_populates="client")


class ClientInteraction(Base):
    __tablename__ = "client_interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    client: Mapped[Client] = relationship(back_populates="interactions")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        db_enum(ProjectStatus, "project_status_enum"),
        nullable=False,
        default=ProjectStatus.PLANEJAMENTO,
        server_default=ProjectStatus.PLANEJAMENTO.value,
    )
    value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    delivered_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    client: Mapped[Client] = relationship(back_populates="projects")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="project")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    type: Mapped[TransactionType] = mapped_column(db_enum(TransactionType, "transaction_type_enum"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TransactionStatus] = mapped_column(
        db_enum(TransactionStatus, "transaction_status_enum"),
        nullable=False,
        default=TransactionStatus.PENDENTE,
        server_default=TransactionStatus.PENDENTE.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    project: Mapped[Project | None] = relationship(back_populates="transactions")
    client: Mapped[Client | None] = relationship(back_populates="transactions")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(
        db_enum(TaskPriority, "task_priority_enum"),
        nullable=False,
        default=TaskPriority.MEDIA,
        server_default=TaskPriority.MEDIA.value,
    )
    status: Mapped[TaskStatus] = mapped_column(
        db_enum(TaskStatus, "task_status_enum"),
        nullable=False,
        default=TaskStatus.PENDENTE,
        server_default=TaskStatus.PENDENTE.value,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    project: Mapped[Project | None] = relationship(back_populates="tasks")
    client: Mapped[Client | None] = relationship(back_populates="tasks")


class Integration(Base):
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("name", name="uq_integrations_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    type: Mapped[IntegrationType] = mapped_column(db_enum(IntegrationType, "integration_type_enum"), nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[IntegrationStatus] = mapped_column(
        db_enum(IntegrationStatus, "integration_status_enum"),
        nullable=False,
        default=IntegrationStatus.ATIVA,
        server_default=IntegrationStatus.ATIVA.value,
    )
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["IntegrationEvent"]] = relationship(
        back_populates="integration",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="desc(IntegrationEvent.created_at)",
    )


class IntegrationEvent(Base):
    __tablename__ = "integration_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("integrations.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    direction: Mapped[IntegrationEventDirection] = mapped_column(
        db_enum(IntegrationEventDirection, "integration_event_direction_enum"),
        nullable=False,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[IntegrationEventStatus] = mapped_column(
        db_enum(IntegrationEventStatus, "integration_event_status_enum"),
        nullable=False,
        default=IntegrationEventStatus.OK,
        server_default=IntegrationEventStatus.OK.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    integration: Mapped[Integration] = relationship(back_populates="events")
    client: Mapped[Client | None] = relationship(back_populates="integration_events")
