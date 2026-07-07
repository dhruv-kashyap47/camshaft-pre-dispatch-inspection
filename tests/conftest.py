import os
from pathlib import Path

os.environ["ALLOW_DEV_SQLITE_FALLBACK"] = "true"
os.environ["DEV_SQLITE_URL"] = "sqlite:///./test-camtrace.db"
os.environ["ORACLE_DSN"] = ""
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-chars!!"

db_path = Path("test-camtrace.db")
if db_path.exists():
    db_path.unlink()
