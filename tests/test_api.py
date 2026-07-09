from fastapi.testclient import TestClient

from app.main import app


def _login(client: TestClient, employee_id: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"employee_id": employee_id, "password": password},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


def _login_full(client: TestClient, employee_id: str, password: str) -> dict:
    resp = client.post(
        "/api/v1/auth/login",
        json={"employee_id": employee_id, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Auth - Operator
# ---------------------------------------------------------------------------

def test_operator_login():
    with TestClient(app) as client:
        body = _login_full(client, "operator1", "Cummins@123")
        assert body["role"] == "OPERATOR"
        assert body["employee_id"] == "operator1"
        assert body["display_name"] == "Operator One"
        assert body["active_mode"] == "OPERATOR"
        assert len(body["permissions"]) > 0
        assert body["user"]["role"] == "OPERATOR"
        assert body["user"]["employee_id"] == "operator1"
        assert len(body["access_token"]) > 0


def test_manager_login():
    with TestClient(app) as client:
        body = _login_full(client, "manager1", "Cummins@123")
        assert body["role"] == "MANAGER"
        assert body["employee_id"] == "manager1"
        assert body["display_name"] == "Manager One"
        assert body["active_mode"] == "MANAGER"
        assert len(body["permissions"]) > 0
        assert body["user"]["role"] == "MANAGER"


def test_admin_login():
    with TestClient(app) as client:
        body = _login_full(client, "admin1", "Cummins@123")
        assert body["role"] == "ADMIN"
        assert body["employee_id"] == "admin1"
        assert body["display_name"] == "Admin One"
        assert body["active_mode"] == "ADMIN"
        assert len(body["permissions"]) > 0
        assert body["user"]["role"] == "ADMIN"


def test_login_wrong_password():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "operator1", "password": "wrongpass123"},
        )
        assert resp.status_code == 401


def test_login_nonexistent_user():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "noone", "password": "somepass123"},
        )
        assert resp.status_code == 401


def test_login_disabled_user():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        client.post(
            "/api/v1/admin/users/2/toggle-active",
            headers=admin_h,
        )
        resp = client.post(
            "/api/v1/auth/login",
            json={"employee_id": "operator2", "password": "Cummins@123"},
        )
        assert resp.status_code == 401
        client.post(
            "/api/v1/admin/users/2/toggle-active",
            headers=admin_h,
        )


def test_backend_ignores_client_role():
    with TestClient(app) as client:
        body = _login_full(client, "operator1", "Cummins@123")
        assert body["role"] == "OPERATOR"
        body2 = _login_full(client, "manager1", "Cummins@123")
        assert body2["role"] == "MANAGER"


# ---------------------------------------------------------------------------
# Admin - User Creation (all roles)
# ---------------------------------------------------------------------------

def test_admin_creates_manager():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        r = client.post("/api/v1/admin/users", headers=admin_h, json={
            "employee_id": "admcreatemgr",
            "full_name": "Admin Created Manager",
            "password": "Cummins@123",
            "role": "MANAGER",
        })
        assert r.status_code == 200
        body = _login_full(client, "admcreatemgr", "Cummins@123")
        assert body["role"] == "MANAGER"


def test_admin_creates_admin():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        r = client.post("/api/v1/admin/users", headers=admin_h, json={
            "employee_id": "admcreateadm",
            "full_name": "Admin Created Admin",
            "password": "Cummins@123",
            "role": "ADMIN",
        })
        assert r.status_code == 200
        body = _login_full(client, "admcreateadm", "Cummins@123")
        assert body["role"] == "ADMIN"


def test_admin_creates_operator():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        r = client.post("/api/v1/admin/users", headers=admin_h, json={
            "employee_id": "admcreateop",
            "full_name": "Admin Created Operator",
            "password": "Cummins@123",
            "role": "OPERATOR",
        })
        assert r.status_code == 200
        body = _login_full(client, "admcreateop", "Cummins@123")
        assert body["role"] == "OPERATOR"


def test_created_manager_route_protection():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        client.post("/api/v1/admin/users", headers=admin_h, json={
            "employee_id": "routecheckmgr",
            "full_name": "Route Check Manager",
            "password": "Cummins@123",
            "role": "MANAGER",
        })
        mgr_token = _login(client, "routecheckmgr", "Cummins@123")
        mgr_h = _auth_header(mgr_token)
        assert client.get("/api/v1/manager/dashboard", headers=mgr_h).status_code == 200
        assert client.get("/api/v1/admin/users", headers=mgr_h).status_code == 403


def test_created_admin_route_protection():
    with TestClient(app) as client:
        admin_body = _login_full(client, "admin1", "Cummins@123")
        admin_h = _auth_header(admin_body["access_token"])
        client.post("/api/v1/admin/users", headers=admin_h, json={
            "employee_id": "routecheckadm",
            "full_name": "Route Check Admin",
            "password": "Cummins@123",
            "role": "ADMIN",
        })
        adm_token = _login(client, "routecheckadm", "Cummins@123")
        adm_h = _auth_header(adm_token)
        assert client.get("/api/v1/admin/users", headers=adm_h).status_code == 200
        assert client.get("/api/v1/reports/export", headers=adm_h).status_code == 200


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------

def test_operator_cannot_access_manager():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        resp = client.get("/api/v1/manager/pending", headers=_auth_header(token))
        assert resp.status_code == 403


def test_operator_cannot_access_admin():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        resp = client.get("/api/v1/admin/users", headers=_auth_header(token))
        assert resp.status_code == 403


def test_manager_cannot_access_admin():
    with TestClient(app) as client:
        token = _login(client, "manager1", "Cummins@123")
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
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)
        checklist = client.get("/api/v1/operator/checklist", headers=h)
        assert checklist.status_code == 200
        items = checklist.json()
        assert len(items) >= 3
        started = client.post(
            "/api/v1/engine/resume", headers=h,
            json={"raw_qr": "PN10001;SN20001;ACME"},
        )
        assert started.status_code == 200
        inspection_id = started.json()["inspection"]["id"]
        assert started.json()["inspection"]["status"] == "IN_PROGRESS"
        for item in items:
            client.post(
                "/api/v1/engine/save-answer", headers=h,
                json={"inspection_id": inspection_id, "checklist_item_id": item["id"], "result": "OK"},
            )
            if item["requires_photo"]:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
                client.post(
                    f"/api/v1/upload/photo/{inspection_id}?checklist_item_id={item['id']}",
                    headers=h, files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
                )
        submit = client.post(
            "/api/v1/engine/submit",
            headers=h,
            json={"inspection_id": inspection_id},
        )
        assert submit.status_code == 200, f"Submit failed: {submit.text}"
        assert submit.json()["status"] == "SUBMITTED"


def test_operator_cannot_submit_others_inspection():
    with TestClient(app) as client:
        op1 = _login(client, "operator1", "Cummins@123")
        started = client.post(
            "/api/v1/engine/resume", headers=_auth_header(op1),
            json={"raw_qr": "PN30002;SN40002;ACME"},
        )
        assert started.status_code == 200
        insp_id = started.json()["inspection"]["id"]
        mgr = _login(client, "manager1", "Cummins@123")
        submit = client.post(
            "/api/v1/engine/submit",
            headers=_auth_header(mgr),
            json={"inspection_id": insp_id},
        )
        assert submit.status_code == 403


def test_operator_cannot_resubmit():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)
        items = client.get("/api/v1/operator/checklist", headers=h).json()
        insp = client.post(
            "/api/v1/engine/resume", headers=h,
            json={"raw_qr": "PN50003;SN60003;ACME"},
        ).json()
        iid = insp["inspection"]["id"]
        for item in items:
            client.post(
                "/api/v1/engine/save-answer", headers=h,
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "OK"},
            )
            if item["requires_photo"]:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
                client.post(
                    f"/api/v1/upload/photo/{iid}?checklist_item_id={item['id']}",
                    headers=h, files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
                )
        submit = client.post(
            "/api/v1/engine/submit", headers=h,
            json={"inspection_id": iid},
        )
        assert submit.status_code == 200, f"First submit: {submit.text}"
        resp = client.post(
            "/api/v1/engine/submit", headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 409, f"Second submit: {resp.text}"


# ---------------------------------------------------------------------------
# Manager Flow
# ---------------------------------------------------------------------------

def test_manager_approval_flow():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123")
        mgr_token = _login(client, "manager1", "Cummins@123")
        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/engine/resume", headers=_auth_header(op_token),
            json={"raw_qr": "PN70004;SN80004;ACME"},
        ).json()
        iid = insp["inspection"]["id"]
        for item in items:
            client.post(
                "/api/v1/engine/save-answer", headers=_auth_header(op_token),
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "NOT_OK" if item == items[0] else "OK", "remarks": "Defect found" if item == items[0] else None},
            )
            if item["requires_photo"]:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
                client.post(
                    f"/api/v1/upload/photo/{iid}?checklist_item_id={item['id']}",
                    headers=_auth_header(op_token), files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
                )
        submit_resp = client.post(
            "/api/v1/engine/submit", headers=_auth_header(op_token),
            json={"inspection_id": iid},
        )
        assert submit_resp.status_code == 200, f"Submit: {submit_resp.text}"
        pending = client.get("/api/v1/manager/pending", headers=_auth_header(mgr_token))
        assert pending.status_code == 200
        assert any(p["id"] == iid for p in pending.json())
        approve = client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": iid, "approval_note": "Reviewed. Released."},
        )
        assert approve.status_code == 200
        assert approve.json()["status"] == "APPROVED"


def test_manager_rejection():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123")
        mgr_token = _login(client, "manager1", "Cummins@123")
        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/engine/resume", headers=_auth_header(op_token),
            json={"raw_qr": "PN90005;SN10005;ACME"},
        ).json()
        iid = insp["inspection"]["id"]
        for item in items:
            client.post(
                "/api/v1/engine/save-answer", headers=_auth_header(op_token),
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "NOT_OK" if item == items[0] else "OK", "remarks": "Defect found" if item == items[0] else None},
            )
            if item["requires_photo"]:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
                client.post(
                    f"/api/v1/upload/photo/{iid}?checklist_item_id={item['id']}",
                    headers=_auth_header(op_token), files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
                )
        submit_resp = client.post(
            "/api/v1/engine/submit", headers=_auth_header(op_token),
            json={"inspection_id": iid},
        )
        assert submit_resp.status_code == 200, f"Submit: {submit_resp.text}"

        reject = client.post(
            "/api/v1/manager/reject",
            headers=_auth_header(mgr_token),
            json={"inspection_id": iid, "reason": "Multiple defects found"},
        )
        assert reject.status_code == 200
        assert reject.json()["status"] == "REJECTED"


def test_manager_cannot_approve_twice():
    with TestClient(app) as client:
        op_token = _login(client, "operator1", "Cummins@123")
        mgr_token = _login(client, "manager1", "Cummins@123")
        items = client.get("/api/v1/operator/checklist", headers=_auth_header(op_token)).json()
        insp = client.post(
            "/api/v1/engine/resume", headers=_auth_header(op_token),
            json={"raw_qr": "PN11006;SN12006;ACME"},
        ).json()
        iid = insp["inspection"]["id"]
        for item in items:
            client.post(
                "/api/v1/engine/save-answer", headers=_auth_header(op_token),
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "OK"},
            )
            if item["requires_photo"]:
                import io
                from PIL import Image
                buf = io.BytesIO()
                Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
                client.post(
                    f"/api/v1/upload/photo/{iid}?checklist_item_id={item['id']}",
                    headers=_auth_header(op_token), files={"file": ("test.jpg", buf.getvalue(), "image/jpeg")},
                )
        submit_resp = client.post(
            "/api/v1/engine/submit", headers=_auth_header(op_token),
            json={"inspection_id": iid},
        )
        assert submit_resp.status_code == 200, f"Submit: {submit_resp.text}"
        client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": iid},
        )
        resp = client.post(
            "/api/v1/manager/approve",
            headers=_auth_header(mgr_token),
            json={"inspection_id": iid},
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# JWT and Session Tests
# ---------------------------------------------------------------------------

def test_expired_jwt_rejected():
    from jose import jwt as pyjwt
    from app.core.config import settings
    expired = pyjwt.encode(
        {"sub": "1", "role": "OPERATOR", "employee_id": "operator1", "exp": 1000000000, "iat": 1000000000},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    with TestClient(app) as client:
        resp = client.get("/api/v1/operator/checklist", headers=_auth_header(expired))
        assert resp.status_code == 401


def test_logout():
    with TestClient(app) as client:
        body = _login_full(client, "operator1", "Cummins@123")
        token = body["access_token"]
        resp = client.post("/api/v1/operator/logout", headers=_auth_header(token))
        assert resp.status_code == 200
        resp2 = client.get("/api/v1/operator/checklist", headers=_auth_header(token))
        assert resp2.status_code == 200


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