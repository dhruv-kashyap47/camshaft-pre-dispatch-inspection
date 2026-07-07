"""Quick verification script for CamTrace backend."""
import os

os.environ["ALLOW_DEV_SQLITE_FALLBACK"] = "true"
os.environ["DEV_SQLITE_URL"] = "sqlite:///./test-verify.db"
os.environ["ORACLE_DSN"] = ""
os.environ["SECRET_KEY"] = "test-verify-secret-key-that-is-at-least-32-chars!"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "480"

from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    r = client.get("/health")
    print(f"Health: {r.status_code} {r.json()}")
    assert r.status_code == 200

    r = client.post(
        "/api/v1/auth/login",
        json={"employee_id": "operator1", "password": "Cummins@123", "role": "OPERATOR"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    print(f"Login: OK (token={token[:20]}...)")

    r = client.get("/api/v1/operator/checklist", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    items = r.json()
    print(f"Checklist: {len(items)} items loaded")

    r = client.post(
        "/api/v1/operator/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"machine_code": "CAM-1001"},
    )
    assert r.status_code == 200
    data = r.json()
    print(f"Start inspection: id={data['id']}, status={data['status']}")

    r = client.post(
        "/api/v1/operator/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "inspection_id": data["id"],
            "answers": [{"checklist_item_id": items[0]["id"], "result": "OK"}],
        },
    )
    assert r.status_code == 200
    print(f"Submit: status={r.json()['status']}")

    r = client.get("/api/v1/investigation/search", headers={"Authorization": f"Bearer {token}"})
    print(f"Investigation search: {r.status_code} ({len(r.json())} results)")

    r = client.get(
        "/api/v1/operator/checklist",
        headers={"Authorization": "Bearer invalid"},
    )
    assert r.status_code == 401
    print("RBAC: Invalid token correctly rejected (401)")

    print("\nAll verification checks passed!")

# Cleanup
for f in ["test-verify.db"]:
    if os.path.exists(f):
        os.remove(f)
