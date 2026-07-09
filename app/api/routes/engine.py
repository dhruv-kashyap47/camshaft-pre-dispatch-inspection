from fastapi import APIRouter, Depends

from app.api.deps import DBSession, require_operator_or_manager_mode
from app.models import UserAccess
from app.schemas.inspection import (
    CompleteStepRequest,
    EngineSubmitRequest,
    ResumeInspectionRequest,
    RestartInspectionRequest,
    SaveAnswerRequest,
    SaveRemarkRequest,
)
from app.services.inspection_engine import (
    complete_step,
    engine_submit_inspection,
    restart_inspection,
    resume_or_create_inspection,
    save_answer,
    save_remark,
)

router = APIRouter()


@router.post("/resume")
def resume_inspection(
    payload: ResumeInspectionRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return resume_or_create_inspection(db, payload.raw_qr, user)


@router.post("/save-answer")
def save_answer_endpoint(
    payload: SaveAnswerRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return save_answer(
        db,
        payload.inspection_id,
        payload.checklist_item_id,
        payload.result,
        payload.remarks,
        user,
    )


@router.post("/save-remark")
def save_remark_endpoint(
    payload: SaveRemarkRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return save_remark(
        db,
        payload.inspection_id,
        payload.checklist_item_id,
        payload.remarks,
        user,
    )


@router.post("/complete-step")
def complete_step_endpoint(
    payload: CompleteStepRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return complete_step(db, payload.inspection_id, payload.sequence_no, user)


@router.post("/submit")
def submit_inspection(
    payload: EngineSubmitRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return engine_submit_inspection(db, payload.inspection_id, user)


@router.post("/restart")
def restart_inspection_endpoint(
    payload: RestartInspectionRequest,
    db: DBSession,
    user_is_operator_mode: tuple[UserAccess, bool] = Depends(require_operator_or_manager_mode),
):
    user, is_operator_mode = user_is_operator_mode
    return restart_inspection(db, payload.inspection_id, user)
