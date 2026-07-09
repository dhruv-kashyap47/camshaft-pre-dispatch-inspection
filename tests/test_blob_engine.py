"""Comprehensive tests for the Oracle BLOB Image Engine (Sprint 4)."""

import io
import struct

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
WEBP_MAGIC = b"RIFF" + struct.pack("<I", 0) + b"WEBP"


def _make_jpeg_bytes(size: tuple[int, int] = (100, 80)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color="red")
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png_bytes(size: tuple[int, int] = (64, 64)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGBA", size, color="blue")
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_webp_bytes(size: tuple[int, int] = (80, 60)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color="green")
    img.save(buf, format="WEBP")
    return buf.getvalue()


def _login(client, employee_id="operator1", password="Cummins@123"):
    resp = client.post(
        "/api/v1/auth/login",
        json={"employee_id": employee_id, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


_blob_qr_counter = 0


def _start_inspection(client, headers):
    global _blob_qr_counter
    _blob_qr_counter += 1
    n = _blob_qr_counter + 100
    return client.post(
        "/api/v1/engine/resume", headers=headers,
        json={"raw_qr": f"P{n};S{n + 1000};ACME"},
    ).json()["inspection"]


# ---------------------------------------------------------------------------
# Upload Tests
# ---------------------------------------------------------------------------


def test_upload_jpeg():
    """JPEG upload succeeds and returns photo_id, file_name."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        resp = client.post(
            f"/api/v1/upload/photo/{iid}?checklist_item_id=1",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "photo_id" in body
        assert "file_name" in body
        assert body["file_name"].endswith(".jpg")


def test_upload_png():
    """PNG upload succeeds."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        png_data = _make_png_bytes()
        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.png", png_data, "image/png")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["file_name"].endswith(".png")


def test_upload_webp():
    """WebP upload succeeds."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        webp_data = _make_webp_bytes()
        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.webp", webp_data, "image/webp")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["file_name"].endswith(".webp")


def test_upload_large_image_rejected():
    """Image exceeding max size is rejected with 413."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        from app.services.blob_engine import MAX_FILE_SIZE
        large = _make_jpeg_bytes((2000, 2000))
        while len(large) < MAX_FILE_SIZE + 1:
            large += large
        large = large[: MAX_FILE_SIZE + 1]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("large.jpg", large, "image/jpeg")},
        )
        assert resp.status_code == 413


def test_upload_invalid_mime_rejected():
    """Upload with unsupported MIME type is rejected."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.gif", b"GIF89a", "image/gif")},
        )
        assert resp.status_code == 400


def test_upload_invalid_inspection():
    """Upload for non-existent inspection returns 404."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        jpeg_data = _make_jpeg_bytes()
        resp = client.post(
            "/api/v1/upload/photo/999999",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        )
        assert resp.status_code == 404


def test_upload_empty_rejected():
    """Empty file upload is rejected."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert resp.status_code == 400


def test_upload_corrupt_rejected():
    """Corrupt image data is rejected."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("corrupt.jpg", b"this is not an image", "image/jpeg")},
        )
        assert resp.status_code == 400


def test_upload_duplicate_replaced():
    """Uploading the same file name creates a new unique name (no collision)."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        r1 = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("photo.jpg", jpeg_data, "image/jpeg")},
        )
        assert r1.status_code == 200
        id1 = r1.json()["photo_id"]

        r2 = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("photo.jpg", jpeg_data, "image/jpeg")},
        )
        assert r2.status_code == 200
        id2 = r2.json()["photo_id"]
        assert id2 != id1


# ---------------------------------------------------------------------------
# Read / Stream Tests
# ---------------------------------------------------------------------------


def test_read_photo():
    """GET /photo/{photo_id} returns image with correct MIME type."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        upload = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        ).json()
        pid = upload["photo_id"]

        resp = client.get(f"/api/v1/photo/{pid}", headers=h)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"
        assert len(resp.content) > 0


def test_read_photo_png():
    """GET /photo/{photo_id} returns PNG with correct MIME."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        png_data = _make_png_bytes()
        upload = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.png", png_data, "image/png")},
        ).json()
        pid = upload["photo_id"]

        resp = client.get(f"/api/v1/photo/{pid}", headers=h)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"


def test_read_photo_nonexistent():
    """GET /photo/{photo_id} for non-existent photo returns 404."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        resp = client.get("/api/v1/photo/999999", headers=h)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Metadata Tests
# ---------------------------------------------------------------------------


def test_photo_metadata():
    """GET /photo/{photo_id}/metadata returns metadata without BLOB."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        upload = client.post(
            f"/api/v1/upload/photo/{iid}?checklist_item_id=1",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        ).json()
        pid = upload["photo_id"]

        resp = client.get(f"/api/v1/photo/{pid}/metadata", headers=h)
        assert resp.status_code == 200
        meta = resp.json()
        assert meta["photo_id"] == pid
        assert meta["inspection_id"] == iid
        assert meta["checklist_item_id"] == 1
        assert meta["file_name"].endswith(".jpg")
        assert meta["content_type"] == "image/jpeg"
        assert meta["file_size"] == len(jpeg_data)
        assert "created_at" in meta


# ---------------------------------------------------------------------------
# Inspection Photos List
# ---------------------------------------------------------------------------


def test_inspection_photos_list():
    """GET /inspection/{inspection_id}/photos returns photo list."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        client.post(
            f"/api/v1/upload/photo/{iid}?checklist_item_id=1",
            headers=h,
            files={"file": ("a.jpg", jpeg_data, "image/jpeg")},
        )
        client.post(
            f"/api/v1/upload/photo/{iid}?checklist_item_id=2",
            headers=h,
            files={"file": ("b.jpg", jpeg_data, "image/jpeg")},
        )

        resp = client.get(f"/api/v1/inspection/{iid}/photos", headers=h)
        assert resp.status_code == 200
        photos = resp.json()
        assert len(photos) == 2
        for p in photos:
            assert "id" in p
            assert "file_name" in p
            assert "content_type" in p
            assert "created_at" in p


# ---------------------------------------------------------------------------
# Thumbnail Tests
# ---------------------------------------------------------------------------


def test_thumbnail_generation():
    """Thumbnail parameter returns smaller image."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes((800, 600))
        upload = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        ).json()
        pid = upload["photo_id"]

        full = client.get(f"/api/v1/photo/{pid}", headers=h)
        thumb = client.get(f"/api/v1/photo/{pid}?thumbnail=true", headers=h)
        assert full.status_code == 200
        assert thumb.status_code == 200
        assert len(thumb.content) <= len(full.content)


# ---------------------------------------------------------------------------
# Security Tests
# ---------------------------------------------------------------------------


def test_upload_executable_rejected():
    """Upload with .exe extension or executable content is rejected."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("virus.exe", b"MZ\x90\x00", "application/x-msdownload")},
        )
        assert resp.status_code == 400


def test_upload_wrong_extension_mime_mismatch_accepted():
    """Wrong extension but correct magic bytes is allowed (server verifies magic, not extension)."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("photo.png", jpeg_data, "image/png")},
        )
        assert resp.status_code == 200
        # Server should detect JPEG magic and store as image/jpeg
        pid = resp.json()["photo_id"]
        meta = client.get(f"/api/v1/photo/{pid}/metadata", headers=h).json()
        assert meta["content_type"] == "image/jpeg"


# ---------------------------------------------------------------------------
# Concurrency Tests
# ---------------------------------------------------------------------------


def test_multiple_uploads_same_inspection():
    """Multiple uploads to the same inspection all succeed."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        ids = []
        for i in range(5):
            data = _make_jpeg_bytes((50, 50))
            resp = client.post(
                f"/api/v1/upload/photo/{iid}?checklist_item_id={i+1}",
                headers=h,
                files={"file": (f"photo_{i}.jpg", data, "image/jpeg")},
            )
            assert resp.status_code == 200
            ids.append(resp.json()["photo_id"])

        assert len(set(ids)) == 5


# ---------------------------------------------------------------------------
# Transaction Rollback / Error Recovery
# ---------------------------------------------------------------------------


def test_upload_rollback_on_error():
    """If upload fails validation, no partial record remains."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("bad.bin", b"\x00\x01\x02\x03", "application/octet-stream")},
        )
        assert resp.status_code == 400

        photos = client.get(f"/api/v1/inspection/{iid}/photos", headers=h).json()
        assert len(photos) == 0


# ---------------------------------------------------------------------------
# Authorization Tests
# ---------------------------------------------------------------------------


def test_upload_without_auth_rejected():
    """Upload without authentication returns 401."""
    with TestClient(app) as client:
        jpeg_data = _make_jpeg_bytes()
        resp = client.post(
            "/api/v1/upload/photo/1",
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        )
        assert resp.status_code == 401


def test_read_photo_without_auth_rejected():
    """Photo streaming without authentication returns 401."""
    with TestClient(app) as client:
        resp = client.get("/api/v1/photo/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Existing Upload Endpoint Stability
# ---------------------------------------------------------------------------


def test_upload_endpoint_stable():
    """The upload endpoint response format is unchanged (photo_id, file_name)."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        resp = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert list(body.keys()) == ["photo_id", "file_name"]


def test_inspection_flow_continues_after_blob_upload():
    """Full inspection flow (start → upload → submit) works with BLOB photos."""
    with TestClient(app) as client:
        token = _login(client, "operator1", "Cummins@123")
        h = _auth_header(token)

        items = client.get("/api/v1/operator/checklist", headers=h).json()

        insp = _start_inspection(client, h)
        iid = insp["id"]

        for item in items:
            client.post(
                "/api/v1/engine/save-answer",
                headers=h,
                json={
                    "inspection_id": iid,
                    "checklist_item_id": item["id"],
                    "result": "OK",
                },
            )

        photo_items = [it for it in items if it.get("requires_photo")]
        for pit in photo_items:
            jpeg_data = _make_jpeg_bytes()
            upload_resp = client.post(
                f"/api/v1/upload/photo/{iid}?checklist_item_id={pit['id']}",
                headers=h,
                files={"file": ("photo.jpg", jpeg_data, "image/jpeg")},
            )
            assert upload_resp.status_code == 200

        resp = client.post(
            "/api/v1/engine/submit",
            headers=h,
            json={"inspection_id": iid},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "SUBMITTED"


# ---------------------------------------------------------------------------
# Cache and Streaming Headers
# ---------------------------------------------------------------------------


def test_photo_streaming_headers():
    """Photo response includes correct cache and content headers."""
    with TestClient(app) as client:
        token = _login(client)
        h = _auth_header(token)
        insp = _start_inspection(client, h)
        iid = insp["id"]

        jpeg_data = _make_jpeg_bytes()
        upload = client.post(
            f"/api/v1/upload/photo/{iid}",
            headers=h,
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
        ).json()
        pid = upload["photo_id"]

        resp = client.get(f"/api/v1/photo/{pid}", headers=h)
        assert "cache-control" in resp.headers
        assert "content-disposition" in resp.headers
        assert "inline" in resp.headers["content-disposition"]
