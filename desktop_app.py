import os
import sys
import time
import socket
import threading
import asyncio
from pathlib import Path

# Explicit imports for PyInstaller packaging of dynamic DB dialects & async runtime
import aiosqlite
import greenlet
import sqlalchemy.dialects.sqlite.aiosqlite
import uvicorn.logging
import uvicorn.loops.auto
import uvicorn.protocols.http.auto
import uvicorn.lifespan.on

# Set default env vars for desktop standalone mode if not set
os.environ.setdefault("APP_ENV", "production")
os.environ["DESKTOP_MODE"] = "1"
if not os.environ.get("ADMIN_TOKEN"):
    # Generate stable local desktop admin token stored in user's APPDATA or local dir
    desktop_data_dir = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "APISentinel"
    os.makedirs(desktop_data_dir, exist_ok=True)
    token_file = desktop_data_dir / "admin_token.key"
    if token_file.exists():
        token = token_file.read_text("utf-8").strip()
    else:
        import secrets
        token = secrets.token_hex(24)
        token_file.write_text(token, "utf-8")
    os.environ["ADMIN_TOKEN"] = token
    # Also default database to APPDATA
    db_file = desktop_data_dir / "sentinel.db"
    os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{db_file.as_posix()}")

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import webview

from backend.main import create_app
from backend.services.scheduler import MonitoringScheduler

# Determine base path (supports PyInstaller bundle extraction)
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

app = create_app()

# Start background monitoring worker in desktop mode
scheduler = MonitoringScheduler()

@app.on_event("startup")
async def start_desktop_worker():
    asyncio.create_task(scheduler.start())

@app.on_event("shutdown")
async def stop_desktop_worker():
    scheduler.stop()

# Serve static frontend files with SPA fallback
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run_server(port: int):
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


def main():
    port = find_free_port()
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server to start
    url = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except Exception:
            time.sleep(0.1)

    # Launch desktop native window
    window = webview.create_window(
        title="API Sentinel — API Outage & Latency Monitor",
        url=url,
        width=1280,
        height=820,
        min_size=(960, 600),
        background_color="#090d16"
    )

    webview.start(private_mode=False)


if __name__ == "__main__":
    main()
