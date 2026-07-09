"""initial schema - V2 TCL naming

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
    # tcl_cam_role
    op.create_table(
        "tcl_cam_role",
        sa.Column("role_id", sa.Integer(), primary_key=True),
        sa.Column("role_name", sa.String(length=30), nullable=False, unique=True),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # tcl_cam_useraccess
    op.create_table(
        "tcl_cam_useraccess",
        sa.Column("useraccess_id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.String(length=30), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("tcl_cam_role.role_id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("last_login", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_tcl_cam_useraccess_role", "tcl_cam_useraccess", ["role_id"])
    op.create_index("ix_tcl_cam_useraccess_active", "tcl_cam_useraccess", ["is_active"])

    # tcl_cam_name
    op.create_table(
        "tcl_cam_name",
        sa.Column("cam_name_id", sa.Integer(), primary_key=True),
        sa.Column("cam_code", sa.String(length=30), nullable=False, unique=True),
        sa.Column("cam_name", sa.String(length=120), nullable=False),
        sa.Column("qr_code", sa.String(length=80), nullable=False, unique=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_tcl_cam_name_status", "tcl_cam_name", ["status"])

    # tcl_cam_checklist_header
    op.create_table(
        "tcl_cam_checklist_header",
        sa.Column("checklist_header_id", sa.Integer(), primary_key=True),
        sa.Column("checklist_name", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("checklist_name", "version", name="uq_tcl_cam_chk_header_version"),
    )

    # tcl_cam_checklist_item
    op.create_table(
        "tcl_cam_checklist_item",
        sa.Column("checklist_item_id", sa.Integer(), primary_key=True),
        sa.Column("checklist_header_id", sa.Integer(), sa.ForeignKey("tcl_cam_checklist_header.checklist_header_id"), nullable=False),
        sa.Column("item_code", sa.String(length=30), nullable=False),
        sa.Column("prompt", sa.String(length=250), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("requires_photo", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("checklist_header_id", "item_code", name="uq_tcl_cam_chk_item_code"),
        sa.UniqueConstraint("checklist_header_id", "sequence_no", name="uq_tcl_cam_chk_item_seq"),
    )
    op.create_index("ix_tcl_cam_chk_item_header", "tcl_cam_checklist_item", ["checklist_header_id"])
    op.create_index("ix_tcl_cam_chk_item_active", "tcl_cam_checklist_item", ["is_active"])

    # tcl_cam_inspection
    op.create_table(
        "tcl_cam_inspection",
        sa.Column("inspection_id", sa.Integer(), primary_key=True),
        sa.Column("inspection_no", sa.String(length=40), nullable=False, unique=True),
        sa.Column("cam_name_id", sa.Integer(), sa.ForeignKey("tcl_cam_name.cam_name_id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=False),
        sa.Column("checklist_header_id", sa.Integer(), sa.ForeignKey("tcl_cam_checklist_header.checklist_header_id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="NOT_STARTED"),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("attendance_marked_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approval_note", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_tcl_cam_inspection_status", "tcl_cam_inspection", ["status"])
    op.create_index("ix_tcl_cam_inspection_cam", "tcl_cam_inspection", ["cam_name_id"])
    op.create_index("ix_tcl_cam_inspection_operator", "tcl_cam_inspection", ["operator_id"])
    op.create_index("ix_tcl_cam_inspection_started", "tcl_cam_inspection", ["started_at"])

    # tcl_cam_qr_data
    op.create_table(
        "tcl_cam_qr_data",
        sa.Column("qr_data_id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False, unique=True),
        sa.Column("raw_qr", sa.String(length=200), nullable=False),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("serial_number", sa.Integer(), nullable=False),
        sa.Column("vendor_code", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    # tcl_cam_inspection_response
    op.create_table(
        "tcl_cam_inspection_response",
        sa.Column("inspection_response_id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=False),
        sa.Column("result", sa.String(length=10), nullable=False),
        sa.Column("remarks", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("inspection_id", "checklist_item_id", name="uq_tcl_cam_resp_insp_item"),
    )
    op.create_index("ix_tcl_cam_resp_inspection", "tcl_cam_inspection_response", ["inspection_id"])
    op.create_index("ix_tcl_cam_resp_checklist", "tcl_cam_inspection_response", ["checklist_item_id"])

    # tcl_cam_photo
    op.create_table(
        "tcl_cam_photo",
        sa.Column("photo_id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=True),
        sa.Column("image_data", sa.LargeBinary(), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("file_name", sa.String(length=120), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_tcl_cam_photo_inspection", "tcl_cam_photo", ["inspection_id"])
    op.create_index("ix_tcl_cam_photo_checklist", "tcl_cam_photo", ["checklist_item_id"])

    # tcl_cam_override
    op.create_table(
        "tcl_cam_override",
        sa.Column("override_id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("tcl_cam_inspection.inspection_id"), nullable=False),
        sa.Column("manager_id", sa.Integer(), sa.ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=False),
        sa.Column("checklist_item_id", sa.Integer(), sa.ForeignKey("tcl_cam_checklist_item.checklist_item_id"), nullable=False),
        sa.Column("original_result", sa.String(length=10), nullable=False),
        sa.Column("override_result", sa.String(length=10), nullable=False),
        sa.Column("reason", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_tcl_cam_override_inspection", "tcl_cam_override", ["inspection_id"])
    op.create_index("ix_tcl_cam_override_manager", "tcl_cam_override", ["manager_id"])

    # tcl_cam_audit_log
    op.create_table(
        "tcl_cam_audit_log",
        sa.Column("audit_log_id", sa.Integer(), primary_key=True),
        sa.Column("useraccess_id", sa.Integer(), sa.ForeignKey("tcl_cam_useraccess.useraccess_id"), nullable=True),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("entity_name", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("old_value", sa.String(length=4000), nullable=True),
        sa.Column("new_value", sa.String(length=4000), nullable=True),
        sa.Column("details", sa.String(length=4000), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_tcl_cam_audit_action", "tcl_cam_audit_log", ["action"])
    op.create_index("ix_tcl_cam_audit_entity", "tcl_cam_audit_log", ["entity_name", "entity_id"])
    op.create_index("ix_tcl_cam_audit_created", "tcl_cam_audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("tcl_cam_audit_log")
    op.drop_table("tcl_cam_override")
    op.drop_table("tcl_cam_photo")
    op.drop_table("tcl_cam_inspection_response")
    op.drop_table("tcl_cam_qr_data")
    op.drop_table("tcl_cam_inspection")
    op.drop_table("tcl_cam_checklist_item")
    op.drop_table("tcl_cam_checklist_header")
    op.drop_table("tcl_cam_name")
    op.drop_table("tcl_cam_useraccess")
    op.drop_table("tcl_cam_role")
