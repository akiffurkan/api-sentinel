import ipaddress
import socket
from urllib.parse import urlparse
from typing import List, Optional, Tuple
from backend.config import get_settings


class SSRFValidationError(ValueError):
    """Raised when a URL violates SSRF security policy."""
    pass


FORBIDDEN_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}

CARRIER_GRADE_NAT = ipaddress.ip_network("100.64.0.0/10")
BENCHMARK_NET = ipaddress.ip_network("198.18.0.0/15")


def is_ip_restricted(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """
    Check if an IP address belongs to private, loopback, link-local,
    multicast, carrier-grade NAT, or other non-public ranges.
    """
    if (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True

    # Check 6to4 mapped or IPv4-mapped IPv6 addresses
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            return is_ip_restricted(ip.ipv4_mapped)
        if ip.is_site_local:
            return True

    # Carrier-grade NAT (RFC 6598) and benchmark network (RFC 2544)
    if isinstance(ip, ipaddress.IPv4Address):
        if ip in CARRIER_GRADE_NAT or ip in BENCHMARK_NET:
            return True

    return False


def validate_monitor_url(url: str, allowed_ports: Optional[List[int]] = None) -> Tuple[str, List[str]]:
    """
    Validates a URL against strict SSRF constraints.
    Returns sanitized URL and list of resolved public IP addresses.
    Raises SSRFValidationError on violation.
    """
    if not url or not isinstance(url, str):
        raise SSRFValidationError("URL cannot be empty.")

    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception as e:
        raise SSRFValidationError("Malformed URL format.") from e

    # 1. Enforce HTTP/HTTPS scheme only
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SSRFValidationError(f"Invalid URL scheme '{scheme}'. Only HTTP and HTTPS are permitted.")

    # 2. Reject userinfo (e.g. http://user:pass@host)
    if parsed.username or parsed.password:
        raise SSRFValidationError("URLs with user credentials are not allowed.")

    # 3. Hostname checks
    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("URL must include a valid hostname.")

    hostname_lower = hostname.lower()

    if hostname_lower in FORBIDDEN_HOSTNAMES or hostname_lower.endswith(".local") or hostname_lower.endswith(".localhost"):
        raise SSRFValidationError("Target hostname is restricted.")

    # 4. Port validation
    settings = get_settings()
    permitted_ports = allowed_ports if allowed_ports is not None else settings.ALLOWED_PORTS
    port = parsed.port
    if port is None:
        port = 443 if scheme == "https" else 80

    if port not in permitted_ports:
        raise SSRFValidationError(f"Target port {port} is not permitted by security policy.")

    # 5. Check if hostname is an IP literal
    try:
        literal_ip = ipaddress.ip_address(hostname)
        if is_ip_restricted(literal_ip):
            raise SSRFValidationError("Target IP address belongs to a private or restricted network range.")
        resolved_ips = [str(literal_ip)]
        return url, resolved_ips
    except ValueError:
        pass  # It's a domain name, proceed to DNS resolution

    # 6. DNS Resolution and address checking
    try:
        addr_info = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise SSRFValidationError("Target hostname could not be resolved.")
    except Exception as e:
        raise SSRFValidationError("DNS resolution error.") from e

    if not addr_info:
        raise SSRFValidationError("Target hostname did not resolve to any network address.")

    resolved_ips: List[str] = []
    for entry in addr_info:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFValidationError("Encountered invalid IP in DNS response.")

        if is_ip_restricted(ip_obj):
            raise SSRFValidationError("Target host resolves to a private or restricted network address.")

        if ip_str not in resolved_ips:
            resolved_ips.append(ip_str)

    if not resolved_ips:
        raise SSRFValidationError("No valid public IP addresses found for target host.")

    return url, resolved_ips
