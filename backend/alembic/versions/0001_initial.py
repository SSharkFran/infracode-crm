"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


client_type_enum = sa.Enum("recorrente", "pontual", "lead", "parceiro", name="client_type_enum", create_type=False)
client_status_enum = sa.Enum("ativo", "negociacao", "encerrado", "inadimplente", name="client_status_enum", create_type=False)
project_status_enum = sa.Enum("planejamento", "andamento", "entregue", "cancelado", name="project_status_enum", create_type=False)
transaction_type_enum = sa.Enum("receita", "despesa", name="transaction_type_enum", create_type=False)
transaction_status_enum = sa.Enum("pendente", "pago", "vencido", name="transaction_status_enum", create_type=False)
task_priority_enum = sa.Enum("baixa", "media", "alta", "urgente", name="task_priority_enum", create_type=False)
task_status_enum = sa.Enum("pendente", "andamento", "concluida", name="task_status_enum", create_type=False)
integration_type_enum = sa.Enum("webhook_in", "api_out", name="integration_type_enum", create_type=False)
integration_status_enum = sa.Enum("ativa", "inativa", "erro", name="integration_status_enum", create_type=False)
integration_event_direction_enum = sa.Enum("in", "out", name="integration_event_direction_enum", create_type=False)
integration_event_status_enum = sa.Enum("ok", "erro", name="integration_event_status_enum", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in [
        client_type_enum,
        client_status_enum,
        project_status_enum,
        transaction_type_enum,
        transaction_status_enum,
        task_priority_enum,
        task_status_enum,
        integration_type_enum,
        integration_status_enum,
        integration_event_direction_enum,
        integration_event_status_enum,
    ]:
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("type", client_type_enum, nullable=False),
        sa.Column("status", client_status_enum, nullable=False, server_default="ativo"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "integrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", integration_type_enum, nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("status", integration_status_enum, nullable=False, server_default="ativa"),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_integrations_name"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "client_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=100), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("happened_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", project_status_enum, nullable=False, server_default="planejamento"),
        sa.Column("value", sa.Numeric(12, 2), nullable=True),
        sa.Column("started_at", sa.Date(), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("delivered_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "integration_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("integration_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("direction", integration_event_direction_enum, nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", integration_event_status_enum, nullable=False, server_default="ok"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["integration_id"], ["integrations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", task_priority_enum, nullable=False, server_default="media"),
        sa.Column("status", task_status_enum, nullable=False, server_default="pendente"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", transaction_type_enum, nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=True),
        sa.Column("status", transaction_status_enum, nullable=False, server_default="pendente"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("tasks")
    op.drop_table("integration_events")
    op.drop_table("projects")
    op.drop_table("client_interactions")
    op.drop_table("integrations")
    op.drop_table("attachments")
    op.drop_table("clients")

    bind = op.get_bind()
    for enum_type in [
        integration_event_status_enum,
        integration_event_direction_enum,
        integration_status_enum,
        integration_type_enum,
        task_status_enum,
        task_priority_enum,
        transaction_status_enum,
        transaction_type_enum,
        project_status_enum,
        client_status_enum,
        client_type_enum,
    ]:
        enum_type.drop(bind, checkfirst=True)
