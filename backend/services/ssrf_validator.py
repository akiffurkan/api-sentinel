from typing import List, Optional, Tuple
from backend.core.ssrf import validate_monitor_url, SSRFValidationError


class SSRFService:
    @staticmethod
    def validate_url(url: str, allowed_ports: Optional[List[int]] = None) -> Tuple[str, List[str]]:
        """Validate URL against SSRF policy."""
        return validate_monitor_url(url, allowed_ports=allowed_ports)
