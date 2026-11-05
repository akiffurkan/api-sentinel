# API Sentinel 🛡️

> **Know when your API fails, before your users do.**

[![Release](https://img.shields.io/github/v/release/akiffurkan/api-sentinel?color=10b981&label=Release)](https://github.com/akiffurkan/api-sentinel/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20Docker-slate.svg)](#)

API Sentinel is a production-minded, open-source API monitoring platform designed for developers and engineering teams. It continuously monitors HTTP and HTTPS endpoints, detects outages, measures latency and availability, and sends instant incident notifications via Telegram.

---

## ⚡ Direct Download (Windows Executable)

You can run API Sentinel as a standalone Windows application with zero setup (no Python, Node.js, or Docker required):

👉 **[Download APISentinel.exe (v1.0.0)](https://github.com/akiffurkan/api-sentinel/releases/download/v1.0.0/APISentinel.exe)** *(~23 MB, Portable)*

Just double-click `APISentinel.exe` to launch the native desktop window and monitoring engine. Your configurations and historical logs are automatically persisted locally.

---

## 🌟 Key Features

- **Asynchronous Health Probing:** Non-blocking HTTP GET checks powered by `httpx` with millisecond-precision latency measurement and customizable timeouts (1s - 60s).
- **Incident Lifecycle Management:**
  - `UP`: Healthy endpoint returning expected status codes.
  - `DEGRADED`: Single failure observed (prevents false alarms from transient network blips).
  - `DOWN`: Two consecutive failures open an official incident and trigger an immediate outage alert.
  - `RECOVERED`: When endpoint responds normally again, incident is resolved with total downtime duration calculated, and a recovery notification is dispatched.
  - **Spam Prevention:** Duplicate open incidents and repeated notifications are blocked while an outage is active.
- **Strict SSRF & Network Security Engine:**
  - Enforces `http` and `https` schemes only.
  - Completely blocks loopback (`127.0.0.0/8`, `::1`), RFC1918 private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), multicast, carrier-grade NAT, and cloud metadata services (`169.254.169.254`).
  - Resolves hostnames to all IP addresses and evaluates every resolved target.
  - Re-evaluates every HTTP redirect hop against SSRF rules before following.
  - Restricts connections to documented ports (80, 443, 8080, 8443).
  - Caps response reads at 1MB to prevent memory exhaustion; never persists response bodies.
- **Estimated Availability & Metrics:**
  - Calculates check-based availability uptime percentage from persisted check logs.
  - Computes average, p95, min, and max latency.
- **Telegram Bot Notifications:** Formatted outage and recovery alerts sent to your team chat or private bot channel. Never leaks API secrets in logs or API responses.
- **Self-Hosted Single-Admin Authentication:** Protected with constant-time token comparison via `ADMIN_TOKEN`.
- **Modular Monolith Architecture:** Decoupled FastAPI web service and background monitoring worker running concurrently against SQLite in WAL mode.
- **Dark-First SaaS UI:** Built with React, TypeScript, Tailwind CSS, Lucide icons, and Recharts.

---

## 🏗️ Architecture

```
                                 ┌────────────────────────┐
                                 │   Browser / Client     │
                                 └───────────┬────────────┘
                                             │ HTTP :3000
                                             ▼
                                 ┌────────────────────────┐
                                 │      Nginx (Web)       │
                                 │  Static React + Proxy  │
                                 └───────────┬────────────┘
                                             │ Proxy /api/*
                                             ▼
┌───────────────────────────┐    ┌────────────────────────┐
│  Background Worker        │    │    FastAPI Web API     │
│  - Bounded concurrency    │    │  - REST CRUD           │
│  - Polling scheduler loop │    │  - Manual Check-Now    │
│  - Duplicate prevention   │    │  - Constant-time Auth  │
└─────────────┬─────────────┘    └───────────┬────────────┘
              │                              │
              ▼                              ▼
      ┌──────────────────────────────────────────────┐
      │  SQLite DB (WAL Mode) on Persistent Volume   │
      │  - monitors, check_results, incidents       │
      └──────────────────────────────────────────────┘
              │
              ▼ HTTP Probes (SSRF Guarded)
      ┌──────────────────────────────────────────────┐
      │  Public API Targets (GitHub, Stripe, etc.)   │
      └──────────────────────────────────────────────┘
              │
              ▼ Alerts on Outage / Recovery
      ┌──────────────────────────────────────────────┐
      │  Telegram Bot API (@BotFather)               │
      └──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start with Docker Compose

### 1. Clone & Configure Environment

```bash
git clone https://github.com/apisentinel/apisentinel.git
cd apisentinel

# Copy the environment template
cp .env.example .env
```

Edit `.env` to configure your admin token and optional Telegram alerts:

```ini
APP_ENV=production
ADMIN_TOKEN=generate-a-strong-secret-token-here

# Optional: Telegram Alerts
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz
TELEGRAM_CHAT_ID=-1001234567890
```

### 2. Start Services

```bash
docker compose up -d --build
```

### 3. Access the Platform

- **Dashboard:** [http://localhost:3000](http://localhost:3000)
- **API Server & OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/healthz](http://localhost:8000/healthz)

Enter your `ADMIN_TOKEN` on first dashboard visit to authenticate your admin session.

---

## 🛠️ Local Development Setup

### Backend (Python 3.12+)

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run test suite
pytest -v

# Start API server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Start background monitoring worker (in another terminal)
python -m backend.worker
```

### Frontend (Node 20+)

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## 🔒 Security & SSRF Protection

API Sentinel treats all user-supplied monitor URLs as untrusted input. The SSRF engine (`backend/core/ssrf.py`) enforces:

1. **Protocol Restrictions:** Only `http://` and `https://` URLs are accepted.
2. **Credential Ban:** URLs containing userinfo (e.g. `http://user:pass@host/`) are rejected.
3. **Restricted Hostnames:** Banned hostnames (`localhost`, `*.localhost`, `*.local`, `metadata.google.internal`) are blocked before DNS lookup.
4. **Comprehensive IP Range Validation:** Every resolved IP (IPv4 and IPv6) is validated:
   - Loopback: `127.0.0.0/8`, `::1`
   - RFC1918 Private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Link-local: `169.254.0.0/16`, `fe80::/10`
   - Multicast: `224.0.0.0/4`, `ff00::/8`
   - Carrier-grade NAT: `100.64.0.0/10`
   - Cloud metadata IP: `169.254.169.254`
5. **Port Whitelist:** Only standard HTTP/HTTPS ports (80, 443, 8080, 8443) are allowed.
6. **Redirect Re-validation:** Automatically following redirects is disabled. Instead, each redirect hop is manually inspected and re-validated through the full SSRF policy before following.
7. **Resource Limits:** Probed responses stream a maximum of 1MB and terminate; response bodies are never saved to disk or database.

---

## 📡 REST API Reference

All management endpoints require `Authorization: Bearer <ADMIN_TOKEN>` or `X-API-Key: <ADMIN_TOKEN>`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/healthz` | Public health status (`{"status":"ok","uptime_seconds":...}`) |
| `GET` | `/api/overview` | Dashboard metrics, status counts, and recent incidents |
| `GET` | `/api/monitors` | List all monitors with uptime % and avg latency |
| `POST` | `/api/monitors` | Create a new monitor (SSRF validated) |
| `GET` | `/api/monitors/{id}` | Detailed monitor stats, latency history, and incidents |
| `PATCH` | `/api/monitors/{id}` | Update monitor configuration or pause/resume |
| `DELETE` | `/api/monitors/{id}` | Delete monitor and its historical records |
| `GET` | `/api/monitors/{id}/checks` | Paginated check result history |
| `POST` | `/api/monitors/{id}/check-now` | Trigger an immediate manual check |
| `GET` | `/api/incidents` | List incidents (filter by `status=OPEN` or `status=RESOLVED`) |
| `GET` | `/api/settings/info` | Inspect masked credentials and engine settings |
| `POST` | `/api/settings/telegram-test` | Dispatch a test alert to Telegram |

---

## 🧪 Testing

The test suite covers:
- SSRF evasion attempts (loopback, private subnets, cloud metadata, disallowed ports, bad schemes, user credentials, DNS rebinding simulations).
- HTTP checker response handling (200 OK, status mismatch, connect failure, timeout, size limits, redirect validation).
- Incident status lifecycle (single failure -> DEGRADED, two failures -> DOWN + Telegram alert, deduplication while DOWN, recovery -> RECOVERED + resolution alert).
- Monitor CRUD, auth token enforcement, `/healthz`, and `/api/overview`.
- Scheduler tick polling, concurrency bounds, and duplicate check prevention.

```bash
pytest -v
```

---

## 📋 Honest Limitations (v1.0.0 MVP)

- **Single Admin:** Intended for single administrators or small teams sharing a central secret. Multi-tenant team RBAC is out of scope for the MVP.
- **Estimated Availability:** Uptime percentage is calculated from persisted check results over the recorded window rather than analog wire continuity.
- **HTTP GET Probes Only:** The MVP focuses exclusively on HTTP GET checks. Custom POST bodies, TLS certificate expiration dates, and custom headers are deferred to future releases to preserve strict security guarantees.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
