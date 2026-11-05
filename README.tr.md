<div align="center">

![API Sentinel Banner](docs/banner.svg)

# API Sentinel 🛡️

**API'niz çökmeden, kullanıcılarınızdan önce haberiniz olsun.**

[English](README.md) • [Türkçe](README.tr.md)

[![Sürüm](https://img.shields.io/github/v/release/akiffurkan/api-sentinel?color=10b981&label=S%C3%BCr%C3%BCm)](https://github.com/akiffurkan/api-sentinel/releases/latest)
[![Testler: 25 Başarılı](https://img.shields.io/badge/Testler-25%20Ba%C5%9Far%C4%B1l%C4%B1%20(100%25)-emerald.svg)](#-otomatik-testler-ve-ci-do%C4%9Frulamas%C4%B1)
[![Güvenlik: SSRF Korumalı](https://img.shields.io/badge/G%C3%BCvenlik-SSRF%20Korumal%C4%B1-blue.svg)](#-kapsaml%C4%B1-ssrf-ve-a%C4%9F-g%C3%BCvenli%C4%9Fi)
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-purple.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20Docker-slate.svg)](#-kurulum-ve-%C3%A7al%C4%B1%C5%9Ft%C4%B1rma-se%C3%A7enekleri)

</div>

---

API Sentinel, geliştiriciler ve mühendislik ekipleri için tasarlanmış, açık kaynaklı ve üretime hazır bir API izleme ve kesinti tespit platformudur. HTTP ve HTTPS uç noktalarınızı periyodik olarak kontrol eder, yanıt sürelerini (gecikme/latency) milisaniye hassasiyetinde ölçer, tahmini çalışma süresini (uptime) hesaplar, kesintileri anında algılayarak Telegram Bot API aracılığıyla bildirim gönderir.

---

## 📸 Gerçek Dashboard Arayüzü

Aşağıda API Sentinel'in gerçek zamanlı olarak halka açık API'leri izlediği ve anlık gecikme grafikleri ürettiği panel görüntüsü yer almaktadır:

<div align="center">

![API Sentinel Panel Önizlemesi](docs/dashboard-preview.png)

</div>

---

## 🛠️ Çözülen Hatalar: `aiosqlite` Sürücü Düzeltmesi (v1.0.1 / v1.0.2)

İlk v1.0.0 Windows sürümünde, dinamik SQLAlchemy asenkron SQLite sürücüsü yüklemesi nedeniyle aşağıdaki başlatma hatası meydana gelmekteydi:

<div align="center">

| Önceki v1.0.0 Hatası | v1.0.1+ Çözümü |
|:---:|:---:|
| <img src="docs/fixed-aiosqlite-issue.png" width="380" alt="v1.0.0 aiosqlite hatası" /> | ✅ **Tamamen Düzeltildi:** `aiosqlite`, `greenlet` ve SQLite async diyalektleri tek bir `.exe` içerisine statik olarak dahil edildi. Dış bağımlılık kalmadı. |

</div>

---

## 📦 Kurulum ve Çalıştırma Seçenekleri

API Sentinel, farklı kullanım senaryoları için 3 bağımsız dağıtım yöntemini tam eşitlikte destekler:

### Seçenek A: 🪟 Bağımsız Windows Masaüstü Uygulaması (Sıfır Kurulum)

Python, Node.js veya Docker kurmadan yerel Windows masaüstü uygulaması olarak çalıştırın:

👉 **[APISentinel.exe İndir (v1.0.2)](https://github.com/akiffurkan/api-sentinel/releases/download/v1.0.2/APISentinel.exe)** *(~24 MB, Taşınabilir / Portable)*

- İndirip `APISentinel.exe` dosyasına çift tıklamanız yeterlidir.
- Şifresiz otomatik masaüstü yönetici oturumu ile anında açılır.
- Veritabanı ve loglar `%LOCALAPPDATA%\APISentinel` dizininde otomatik saklanır.

---

### Seçenek B: 🐳 Docker & Docker Compose (Sunucu & Bulut Dağıtımı)

FastAPI Web servisi, arka plan işçisi (worker) ve statik Nginx istemcisini tek komutla ayağa kaldırın:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/akiffurkan/api-sentinel.git
cd api-sentinel

# 2. Ortam değişkenlerini yapılandırın
cp .env.example .env
```

`.env` dosyasını açıp yönetici şifrenizi ve Telegram bot bilgilerinizi girin:

```env
APP_ENV=production
DATABASE_URL=sqlite+aiosqlite:////app/data/sentinel.db
ADMIN_TOKEN=guclu-yonetici-tokeni-belirleyin

# Telegram Bildirimleri (İsteğe bağlı)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz
TELEGRAM_CHAT_ID=-1001234567890

# Motor Parametreleri
DEFAULT_INTERVAL=60
DEFAULT_TIMEOUT=10
MAX_CONCURRENT_CHECKS=20
```

```bash
# 3. Servisleri derleyip başlatın
docker compose up -d --build
```

- **Kullanıcı Paneli:** [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Sağlık Kontrolü:** [http://localhost:8000/healthz](http://localhost:8000/healthz)

---

### Seçenek C: 🐧 Linux / Yerel Python Servisi (Sunucu / VPS)

Ubuntu/Debian, CentOS, Alpine veya Arch üzerinde doğrudan yerel servis olarak çalıştırın:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/akiffurkan/api-sentinel.git
cd api-sentinel

# 2. Python 3.12+ sanal ortamını oluşturun
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 3. React arayüzünü derleyin
cd frontend
npm install
npm run build
cd ..

# 4. Web API servisini başlatın
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 5. Ayrı bir süreçte veya systemd altında arka plan işçisini başlatın:
python -m backend.worker
```

---

## 🌟 Öne Çıkan Özellikler

- **Asenkron Sağlık Kontrolleri:** `httpx` altyapısı ile engellemesiz (non-blocking) HTTP GET kontrolleri, milisaniye hassasiyetinde gecikme ölçümü ve ayarlanabilir zaman aşımları (1sn - 60sn).
- **Akıllı Kesinti Yaşam Döngüsü:**
  - `UP` (Çalışıyor): Beklenen HTTP durum kodunu dönen sağlıklı uç nokta.
  - `DEGRADED` (Yavaş / Bozuk): Tek bir hata meydana geldiğinde geçici durum (anlık ağ dalgalanmalarında gereksiz alarm üretilmesini önler).
  - `DOWN` (Çöktü / Kapalı): Üst üste iki kontrol başarısız olduğunda resmi bir kesinti (incident) açılır ve derhal Telegram uyarısı gönderilir.
  - `RECOVERED` (Kurtarıldı): Uç nokta yeniden sağlıklı yanıt verdiğinde kesinti otomatik kapatılır, toplam kesinti süresi hesaplanır ve toparlanma bildirimi iletilir.
  - **Spam Koruması:** Kesinti süresince aynı monitör için mükerrer olay açılması ve bildirim kirliliği engellenir.
- **Kapsamlı SSRF & Ağ Güvenliği:**
  - Yalnızca `http` ve `https` protokollerine izin verilir.
  - Döngü (loopback `127.0.0.0/8`, `::1`), RFC1918 özel IP blokları (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), yerel bağlantı (`169.254.0.0/16`), çok noktaya yayın (multicast), CGNAT ve bulut metaveri adresleri (`169.254.169.254`) kesinlikle engellenir.
  - Alan adları çözümlenerek tüm IP'ler kontrol edilir (DNS rebinding koruması).
  - HTTP yönlendirmelerinde (redirect) her adım tekrar güvenlik süzgecinden geçirilir.
  - Yalnızca izin verilen standart portlara (`80`, `443`, `8080`, `8443`) istek atılır.
  - Yanıt gövdeleri okunmaz ve saklanmaz; bellek şişmesini önlemek için 1MB tavan sınırı uygulanır.
- **Uptime ve İstatistik Analitiği:**
  - Kaydedilen gerçek kontrol geçmişinden tahmini erişilebilirlik yüzdesi hesaplanır.
  - Ortalama, p95 (95. yüzdelik), minimum ve maksimum gecikmeler raporlanır.
- **Telegram Bot Entegrasyonu:** Kesinti ve düzelme anlarında ekibinize veya kanalınıza biçimlendirilmiş anlık Telegram bildirimleri gönderilir. API anahtarları asla yanıtlara ve loglara sızdırılmaz.
- **Çift Dil Desteği (i18n):** Türkçe ve İngilizce tam arayüz desteği ile canlı dil değiştirme olanağı (TR / EN).

---

## 🧪 Otomatik Testler ve CI Doğrulaması

API Sentinel, üretime uygunluk için kapsamlı bir birim, entegrasyon ve güvenlik test setine sahiptir:

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-8.4.2, pluggy-1.7.0
rootdir: D:\Projeler\API Sentinel
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.16.0, asyncio-0.26.0, mock-3.17.0
collected 25 items

tests/test_api_monitors.py::test_auth_enforcement PASSED                 [  4%]
tests/test_api_monitors.py::test_monitor_crud_and_ssrf PASSED            [  8%]
tests/test_api_monitors.py::test_manual_check_now_action PASSED          [ 12%]
tests/test_api_overview_and_incidents.py::test_healthz_endpoint PASSED   [ 16%]
tests/test_api_overview_and_incidents.py::test_overview_and_incidents PASSED [ 20%]
tests/test_checker.py::test_checker_success PASSED                       [ 24%]
tests/test_checker.py::test_checker_unexpected_status_code PASSED        [ 28%]
tests/test_checker.py::test_checker_timeout PASSED                       [ 32%]
tests/test_checker.py::test_checker_connect_error PASSED                 [ 36%]
tests/test_checker.py::test_checker_blocks_redirect_to_internal_ip PASSED [ 40%]
tests/test_incident_manager.py::test_incident_lifecycle PASSED           [ 44%]
tests/test_notifier.py::test_mask_secret PASSED                          [ 48%]
tests/test_notifier.py::test_notifier_send_outage_alert PASSED           [ 52%]
tests/test_notifier.py::test_notifier_send_recovery_alert PASSED         [ 56%]
tests/test_scheduler_and_analytics.py::test_analytics_uptime_and_latency_calculations PASSED [ 60%]
tests/test_scheduler_and_analytics.py::test_scheduler_deduplication_and_tick PASSED [ 64%]
tests/test_ssrf.py::test_ssrf_rejects_invalid_schemes PASSED             [ 68%]
tests/test_ssrf.py::test_ssrf_rejects_empty_or_malformed PASSED          [ 72%]
tests/test_ssrf.py::test_ssrf_rejects_userinfo PASSED                    [ 76%]
tests/test_ssrf.py::test_ssrf_rejects_loopback_and_local PASSED          [ 80%]
tests/test_ssrf.py::test_ssrf_rejects_private_networks PASSED            [ 84%]
tests/test_ssrf.py::test_ssrf_rejects_cloud_metadata_and_link_local PASSED [ 88%]
tests/test_ssrf.py::test_ssrf_rejects_disallowed_ports PASSED            [ 92%]
tests/test_ssrf.py::test_ssrf_allows_valid_public_domain PASSED          [ 96%]
tests/test_ssrf.py::test_ssrf_rejects_domain_resolving_to_private_ip PASSED [100%]

======================== 25 passed, %100 başarı oranı ========================
```

Testleri yerelinizde çalıştırmak için:

```bash
pytest -v
```

---

## 📡 REST API Referansı

| Metot | Uç Nokta | Açıklama |
|---|---|---|
| `GET` | `/healthz` | Doğrulama gerektirmeyen sistem sağlık kontrolü |
| `GET` | `/api/auth/verify` | Oturum `ADMIN_TOKEN` doğrulaması |
| `GET` | `/api/overview` | Sistem genel bakışı, uptime ortalamaları ve monitör sayıları |
| `GET` | `/api/monitors` | Kayıtlı tüm endpoint monitörlerini listeleme |
| `POST` | `/api/monitors` | Yeni bir hedef monitör oluşturma (SSRF doğrulamalı) |
| `GET` | `/api/monitors/{id}` | Monitör detayları, p95 gecikmesi ve kesinti geçmişi |
| `PATCH` | `/api/monitors/{id}` | Monitör ayarlarını güncelleme veya duraklatma/başlatma |
| `DELETE` | `/api/monitors/{id}` | Monitörü ve tüm geçmiş kayıtlarını silme |
| `GET` | `/api/monitors/{id}/checks` | Geçmiş yoklama ve gecikme kayıtları |
| `POST` | `/api/monitors/{id}/check-now` | Anlık manuel kontrol tetikleme |
| `GET` | `/api/incidents` | Kesinti olayları, süreleri ve çözülme kayıtları |
| `GET` | `/api/settings/info` | Güvenli sistem durumu (gizli anahtarlar maskelenir) |
| `POST` | `/api/settings/test-telegram` | Telegram bot entegrasyonu için test uyarısı gönderme |

---

## 📄 Lisans

Bu proje açık kaynaklıdır ve [MIT Lisansı](LICENSE) altında dağıtılmaktadır.
