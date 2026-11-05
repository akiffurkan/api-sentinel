import pytest
from backend.core.ssrf import validate_monitor_url, SSRFValidationError


def test_ssrf_rejects_invalid_schemes():
    invalid_urls = [
        "ftp://example.com/test",
        "file:///etc/passwd",
        "gopher://example.com",
        "data:text/plain;base64,SGVsbG8=",
        "javascript:alert(1)",
        "tcp://example.com:80",
    ]
    for url in invalid_urls:
        with pytest.raises(SSRFValidationError, match="Only HTTP and HTTPS are permitted"):
            validate_monitor_url(url)


def test_ssrf_rejects_empty_or_malformed():
    for bad in ["", "   ", "not-a-url"]:
        with pytest.raises(SSRFValidationError):
            validate_monitor_url(bad)


def test_ssrf_rejects_userinfo():
    with pytest.raises(SSRFValidationError, match="user credentials are not allowed"):
        validate_monitor_url("http://admin:secret@example.com")


def test_ssrf_rejects_loopback_and_local():
    banned = [
        "http://localhost",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.2",
        "http://[::1]",
        "http://sub.localhost",
    ]
    for url in banned:
        with pytest.raises(SSRFValidationError):
            validate_monitor_url(url)


def test_ssrf_rejects_private_networks():
    private_urls = [
        "http://10.0.0.1",
        "http://10.254.0.1",
        "http://172.16.0.1",
        "http://172.31.255.255",
        "http://192.168.1.1",
        "http://192.168.0.254",
    ]
    for url in private_urls:
        with pytest.raises(SSRFValidationError, match="private or restricted"):
            validate_monitor_url(url)


def test_ssrf_rejects_cloud_metadata_and_link_local():
    metadata_urls = [
        "http://169.254.169.254",
        "http://169.254.1.1",
        "http://metadata.google.internal",
    ]
    for url in metadata_urls:
        with pytest.raises(SSRFValidationError):
            validate_monitor_url(url)


def test_ssrf_rejects_disallowed_ports():
    urls = [
        "http://example.com:22",
        "http://example.com:25",
        "http://example.com:3306",
        "http://example.com:6379",
        "http://example.com:27017",
    ]
    for url in urls:
        with pytest.raises(SSRFValidationError, match="not permitted by security policy"):
            validate_monitor_url(url, allowed_ports=[80, 443, 8080, 8443])


def test_ssrf_allows_valid_public_domain(monkeypatch):
    """Mock getaddrinfo so external network call is not required in hermetic unit test."""
    import socket

    def mock_getaddrinfo(host, port, *args, **kwargs):
        # 93.184.216.34 is public example.com IPv4
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]

    monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)

    sanitized, ips = validate_monitor_url("https://example.com/api/health")
    assert sanitized == "https://example.com/api/health"
    assert "93.184.216.34" in ips


def test_ssrf_rejects_domain_resolving_to_private_ip(monkeypatch):
    import socket

    def mock_getaddrinfo(host, port, *args, **kwargs):
        # Simulated DNS rebinding to internal IP
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.50", port))]

    monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)

    with pytest.raises(SSRFValidationError, match="Target host resolves to a private or restricted network address"):
        validate_monitor_url("https://malicious-dns-rebind.internal/test")
