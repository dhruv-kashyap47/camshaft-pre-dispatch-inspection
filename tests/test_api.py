from fastapi.testclient import TestClient

from app.main import app


def _login(client: TestClient, employee_id: str, password: str, role: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"employee_id": employee_id, "password": password, "role": role},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def test_login_success():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        assert len(token) > 0


def test_login_wrong_password():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "operator1", "password": "wrong", "role": "OPERATOR"},
        )
        assert resp.status_code == 401


def test_login_wrong_role():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "operator1", "password": "Cummins@123", "role": "MANAGER"},
        )
        assert resp.status_code == 403


def test_login_nonexistent_user():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "noone", "password": "x", "role": "OPERATOR"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------

def test_operator_cannot_access_manager():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        resp = client.get("/api/v1/manager/pending", headers=_auth_header(token))
        assert resp.status_code == 403


def test_manager_cannot_access_admin():
    with TestClient(app) as client:
        token = _login(client, "manager1", "Cummins@123", "MANAGER")
        resp = client.get("/api/v1/admin/audits", headers=_auth_header(token))
        assert resp.status_code == 403


def test_unauthenticated_access():
    with TestClient(app) as client:
        resp = client.get("/api/v1/operator/checklist")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Operator Flow
# ---------------------------------------------------------------------------

def test_operator_full_flow():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        h = _auth_header(token)

        scan = client.post("/api/v1/operator/scan", headers=h, json={"qr_code": "CAM-1001"})
        assert scan.status_code == 200
        assert scan.json()["machine_code"] == "CAM-1001"

        checklist = client.get("/api/v1/operator/checklist", headers=h)
        assert checklist.status_code == 200
        items = checklist.json()
        assert len(items) >= 3

        started = client.post("/api/v1/operator/start", headers=h, json={"machine_code": "CAM-1001"})
        assert started.status_code == 200
        inspection_id = started.json()["id"]
        assert started.json()["status"] == "IN_PROGRESS"

        submit = client.post(
            "/api/v1/operator/submit",
            headers=h,
            json={
                "inspection_id": inspection_id,
                "answers": [
                    {"checklist_item_id": items[0]["id"], "result": "OK", "remarks": "Passed"},
                    {"checklist_item_id": items[1]["id"], "result": "OK"},
                    {"checklist_item_id": items[2]["id"], "result": "NOT_OK", "remarks": "Scratched surface"},
                ],
            },
        )
        assert submit.status_code == 200
        assert submit.json()["status"] == "SUBMITTED"


def test_operator_cannot_submit_others_inspection():
    with TestClient(app) as client:
        op1 = _login(client, "operator1", "Cummins@123", "OPERATOR")
        started = client.post(
            "/api/v1/operator/start", headers=_auth_header(op1),
            json={"machine_code": "CAM-1001"},
        )
        assert started.status_code == 200
        insp_id = started.json()["id"]

        mgr = _login(client, "manager1", "Cummins@123", "MANAGER")
        submit = client.post(
            "/api/v1/operator/submit",
            headers=_auth_header(mgr),
            json={
                "inspection_id": insp_id,
                "answers": [{"checklist_item_id": 1, "result": "OK"}],
            },
        )
        assert submit.status_code == 403


def test_operator_cannot_resubmit():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        h = _auth_header(token)
        items = client.get("/api/v1/operator/checklist", headers=h).json()
        insp = client.post(
            "/api/v1/operator/start", headers=h, json={"machine_code": "CAM-1001"},
        ).json()

        client.post(
            "/api/v1/operator/submit",
            headers=h,
            json={
                "inspection_id": insp["id"],
                "answers": [{"checklist_item_id": items[0]["id"], "result": "OK"}],
            },
        )

        resp = client.post(
            "/api/v1/operator/submit",
            headers=h,
            json={
                "inspection_id": insp["id"],
                "answers": [{"checklist_item_id": items[0]["id"], "result": "OK"}],
            },
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Manager Flow
# ---------------------------------------------------------------------------

def test_manager_approval_flow():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        mgr_token = _login(client, "manager1", "Cummins@123", "MANAGER")

        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/operator/start", headers=_auth_header(op_token),
            json={"machine_code": "CAM-1001"},
        ).json()
        client.post(
            "/api/v1/operator/submit",
            headers=_auth_header(op_token),
            json={
                "inspection_id": insp["id"],
                "answers": [{"checklist_item_id": items[0]["id"], "result": "NOT_OK"}],
            },
        )

        pending = client.get("/api/v1/manager/pending", headers=_auth_header(mgr_token))
        assert pending.status_code == 200
        assert any(p["id"] == insp["id"] for p in pending.json())

        approve = client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": insp["id"], "approval_note": "Reviewed. Released."},
        )
        assert approve.status_code == 200
        assert approve.json()["status"] == "APPROVED"


def test_manager_rejection():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        mgr_token = _login(client, "manager1", "Cummins@123", "MANAGER")

        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/operator/start", headers=_auth_header(op_token),
            json={"machine_code": "CAM-1002"},
        ).json()
        client.post(
            "/api/v1/operator/submit",
            headers=_auth_header(op_token),
            json={
                "inspection_id": insp["id"],
                "answers": [{"checklist_item_id": items[0]["id"], "result": "NOT_OK"}],
            },
        )

        reject = client.post(
            "/api/v1/manager/reject",
            headers=_auth_header(mgr_token),
            json={"inspection_id": insp["id"], "reason": "Multiple defects found"},
        )
        assert reject.status_code == 200
        assert reject.json()["status"] == "REJECTED"


def test_manager_cannot_approve_twice():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123", "OPERATOR")
        mgr_token = _login(client, "manager1", "Cummins@123", "MANAGER")

        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/operator/start", headers=_auth_header(op_token),
            json={"machine_code": "CAM-1001"},
        ).json()
        client.post(
            "/api/v1/operator/submit",
            headers=_auth_header(op_token),
            json={
                "inspection_id": insp["id"],
                "answers": [{"checklist_item_id": items[0]["id"], "result": "OK"}],
            },
        )

        client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": insp["id"]},
        )
        resp = client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": insp["id"]},
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    with TestClient(app) as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


def test_openapi():
    with TestClient(app) as client:
        resp = client.get("/docs")
        assert resp.status_code == 200
