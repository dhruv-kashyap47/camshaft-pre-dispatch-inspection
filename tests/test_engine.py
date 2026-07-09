from fastapi.testclient import TestClient

from app.main import app


def _login(client: TestClient, employee_id: str, password: str) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"employee_id": employee_id, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


QR_VALID = "PN12345;SN67890;ACME"


def _get_checklist(client, headers):
    return client.get("/api/v1/operator/checklist", headers=headers).json()


# ---------------------------------------------------------------------------
# Engine Resume / Create
# ---------------------------------------------------------------------------

def test_engine_resume_creates_new():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        resp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": QR_VALID},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["action"] == "created"
        assert body["inspection"]["status"] == "IN_PROGRESS"
        assert body["inspection"]["current_step"] == 1
        assert body["qr_data"]["part_number"] == 12345
        assert body["qr_data"]["serial_number"] == 67890


def test_engine_resume_resumes_existing():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        c1 = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN11111;SN22222;ACME"},
        )
        assert c1.status_code == 200
        first_id = c1.json()["inspection"]["id"]

        c2 = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN11111;SN22222;ACME"},
        )
        assert c2.status_code == 200
        assert c2.json()["action"] == "resumed"
        assert c2.json()["inspection"]["id"] == first_id


# ---------------------------------------------------------------------------
# Save Answer
# ---------------------------------------------------------------------------

def test_engine_save_answer_create():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN33333;SN44444;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)
        item_id = items[0]["id"]

        resp = client.post(
            "/api/v1/engine/save-answer",
            headers=h,
            json={
                "inspection_id": iid,
                "checklist_item_id": item_id,
                "result": "OK",
                "remarks": "All good",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["result"] == "OK"
        assert body["remarks"] == "All good"
        assert body["completion_pct"] > 0


def test_engine_save_answer_upsert():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN55555;SN66666;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)
        item_id = items[0]["id"]

        client.post(
            "/api/v1/engine/save-answer",
            headers=h,
            json={"inspection_id": iid, "checklist_item_id": item_id, "result": "NOT_OK", "remarks": "First"},
        )

        resp = client.post(
            "/api/v1/engine/save-answer",
            headers=h,
            json={"inspection_id": iid, "checklist_item_id": item_id, "result": "OK", "remarks": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["result"] == "OK"
        assert resp.json()["remarks"] == "Updated"


# ---------------------------------------------------------------------------
# Save Remark
# ---------------------------------------------------------------------------

def test_engine_save_remark():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN99999;SN11112;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)
        item_id = items[0]["id"]

        client.post(
            "/api/v1/engine/save-answer",
            headers=h,
            json={"inspection_id": iid, "checklist_item_id": item_id, "result": "NOT_OK", "remarks": "Initial"},
        )

        resp = client.post(
            "/api/v1/engine/save-remark",
            headers=h,
            json={"inspection_id": iid, "checklist_item_id": item_id, "remarks": "Updated remark"},
        )
        assert resp.status_code == 200
        assert resp.json()["remarks"] == "Updated remark"


# ---------------------------------------------------------------------------
# Complete Step
# ---------------------------------------------------------------------------

def test_engine_complete_step():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN22222;SN33333;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        resp = client.post(
            "/api/v1/engine/complete-step",
            headers=h,
            json={"inspection_id": iid, "sequence_no": 2},
        )
        assert resp.status_code == 200
        assert resp.json()["current_step"] == 2


# ---------------------------------------------------------------------------
# Engine Submit
# ---------------------------------------------------------------------------

def test_engine_submit_ok():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN44444;SN55555;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)

        for item in items:
            client.post(
                "/api/v1/engine/save-answer",
                headers=h,
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "OK"},
            )

        photo_items = [item for item in items if item.get("requires_photo")]
        for pitem in photo_items:
            import io
            from PIL import Image
            buf = io.BytesIO()
            Image.new("RGB", (100, 80), color="red").save(buf, format="JPEG")
            client.post(
                f"/api/v1/upload/photo/{iid}?checklist_item_id={pitem['id']}",
                headers=h,
                files={"file": ("photo.jpg", buf.getvalue(), "image/jpeg")},
            )

        resp = client.post(
            "/api/v1/engine/submit",
            headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "SUBMITTED"
        assert resp.json()["completion_pct"] == 100.0


def test_engine_submit_fails_if_incomplete():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN66666;SN77777;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        resp = client.post(
            "/api/v1/engine/submit",
            headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 422
        assert "errors" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Restart
# ---------------------------------------------------------------------------

def test_engine_restart():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN88888;SN99999;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)
        client.post(
            "/api/v1/engine/save-answer",
            headers=h,
            json={"inspection_id": iid, "checklist_item_id": items[0]["id"], "result": "OK"},
        )

        resp = client.post(
            "/api/v1/engine/restart",
            headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"
        assert resp.json()["current_step"] == 1
        assert resp.json()["completion_pct"] == 0.0


# ---------------------------------------------------------------------------
# Resume with photo-requiring items — submit needs photos
# ---------------------------------------------------------------------------

def test_engine_submit_fails_without_required_photos():
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        insp = client.post(
            "/api/v1/engine/resume",
            headers=h,
            json={"raw_qr": "PN11123;SN22234;ACME"},
        ).json()
        iid = insp["inspection"]["id"]

        items = _get_checklist(client, h)
        for item in items:
            client.post(
                "/api/v1/engine/save-answer",
                headers=h,
                json={"inspection_id": iid, "checklist_item_id": item["id"], "result": "OK"},
            )

        resp = client.post(
            "/api/v1/engine/submit",
            headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 422
        assert any("photo" in str(e).lower() for e in resp.json()["detail"]["errors"])
