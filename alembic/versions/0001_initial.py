"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-07
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.String(length=30), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_users_employee_id", "users", ["employee_id"], unique=True)
    op.create_index("ix_users_role_id", "users", ["role_id"], unique=False)

    op.create_table(
        "machines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_code", sa.String(length=30), nullable=False),
        sa.Column("machine_name", sa.String(length=120), nullable=False),
        sa.Column("qr_code", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
    )
    op.create_index("ix_machines_machine_code", "machines", ["machine_code"], unique=True)
    op.create_index("ix_machines_qr_code", "machines", ["qr_code"], unique=True)

    op.create_table(
        "checklist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_family", sa.String(length=40), nullable=False),
        sa.Column("item_code", sa.String(length=30), nullable=False),
        sa.Column("prompt", sa.String(length=250), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("requires_photo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_checklist_items_item_code", "checklist_items", ["item_code"], unique=True)
    op.create_index("ix_checklist_items_machine_family", "checklist_items", ["machine_family"], unique=False)
    op.create_index("ix_checklist_items_sequence_no", "checklist_items", ["sequence_no"], unique=False)

    op.create_table(
        "inspections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_no", sa.String(length=40), nullable=False),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attendance_marked_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approval_note", sa.Text(), nullable=True),
    )
    op.create_index("ix_inspections_inspection_no", "inspections", ["inspection_no"], unique=True)
    op.create_index("ix_inspections_machine_id", "inspections", ["machine_id"], unique=False)
    op.create_index("ix_inspections_operator_id", "inspections", ["operator_id"], unique=False)
    op.create_index("ix_inspections_status", "inspections", ["status"], unique=False)

    op.create_table(
        "inspection_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("checklist_items.id"), nullable=False),
        sa.Column("result", sa.String(length=10), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=True),
    )
    op.create_index("ix_inspection_responses_inspection_id", "inspection_responses", ["inspection_id"], unique=False)
    op.create_index("ix_inspection_responses_checklist_item_id", "inspection_responses", ["checklist_item_id"], unique=False)

    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("checklist_items.id"), nullable=True),
        sa.Column("lan_path", sa.String(length=300), nullable=False),
        sa.Column("file_name", sa.String(length=120), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_photos_inspection_id", "photos", ["inspection_id"], unique=False)

    op.create_table(
        "overrides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id"), nullable=False),
        sa.Column("manager_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("checklist_items.id"), nullable=False),
        sa.Column("original_result", sa.String(length=10), nullable=False),
        sa.Column("override_result", sa.String(length=10), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_overrides_inspection_id", "overrides", ["inspection_id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("entity_name", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], unique=False)
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("overrides")
    op.drop_table("photos")
    op.drop_table("inspection_responses")
    op.drop_table("inspections")
    op.drop_table("checklist_items")
    op.drop_table("machines")
    op.drop_table("users")
    op.drop_table("roles")
