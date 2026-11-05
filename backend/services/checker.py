import asyncio
import time
from urllib.parse import urljoin
from typing import List, Optional
import httpx
from pydantic import BaseModel
from backend.config import get_settings
from backend.core.ssrf import validate_monitor_url, SSRFValidationError


class CheckExecutionResult(BaseModel):
    success: bool
    status_code: Optional[int] = None
    latency_ms: float
    error_message: Optional[str] = None


class HTTPChecker:
    USER_AGENT = "APISentinel/1.0 (+https://github.com/apisentinel/apisentinel)"

    @classmethod
    async def perform_check(
        cls,
        url: str,
        expected_status_codes: List[int],
        timeout_seconds: int = 10,
    ) -> CheckExecutionResult:
        settings = get_settings()
        start_time = time.perf_counter()
        current_url = url
        redirect_hops = 0

        # Create custom httpx transport with connection limits
        transport = httpx.AsyncHTTPTransport(
            retries=0,
            verify=True,
        )

        try:
            # Re-usable client without automatic redirect following
            async with httpx.AsyncClient(
                transport=transport,
                follow_redirects=False,
                timeout=httpx.Timeout(timeout_seconds),
                headers={"User-Agent": cls.USER_AGENT}
            ) as client:
                while True:
                    # 1. SSRF check before every request (initial and redirects)
                    try:
                        validated_url, _ = validate_monitor_url(current_url, allowed_ports=settings.ALLOWED_PORTS)
                    except SSRFValidationError as e:
                        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                        return CheckExecutionResult(
                            success=False,
                            status_code=None,
                            latency_ms=latency_ms,
                            error_message=f"Security Policy Violation: {str(e)}"
                        )

                    # 2. Execute GET request with stream to cap response size
                    req = client.build_request("GET", validated_url)
                    response = await client.send(req, stream=True)

                    try:
                        # Consume up to MAX_RESPONSE_BYTES without saving body
                        total_bytes = 0
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            total_bytes += len(chunk)
                            if total_bytes > settings.MAX_RESPONSE_BYTES:
                                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                                return CheckExecutionResult(
                                    success=False,
                                    status_code=response.status_code,
                                    latency_ms=latency_ms,
                                    error_message="Response exceeded maximum permitted size (1MB)."
                                )
                    finally:
                        await response.aclose()

                    # 3. Check for redirects (301, 302, 303, 307, 308)
                    if response.is_redirect and "location" in response.headers:
                        redirect_hops += 1
                        if redirect_hops > settings.MAX_REDIRECTS:
                            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                            return CheckExecutionResult(
                                success=False,
                                status_code=response.status_code,
                                latency_ms=latency_ms,
                                error_message=f"Exceeded maximum allowed redirects ({settings.MAX_REDIRECTS})."
                            )

                        location = response.headers["location"]
                        current_url = urljoin(str(response.url), location)
                        continue

                    # Terminal response reached
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    is_status_expected = response.status_code in expected_status_codes

                    if is_status_expected:
                        return CheckExecutionResult(
                            success=True,
                            status_code=response.status_code,
                            latency_ms=latency_ms,
                            error_message=None
                        )
                    else:
                        expected_str = ", ".join(map(str, expected_status_codes))
                        return CheckExecutionResult(
                            success=False,
                            status_code=response.status_code,
                            latency_ms=latency_ms,
                            error_message=f"Unexpected status code {response.status_code}. Expected [{expected_str}]."
                        )

        except httpx.TimeoutException:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CheckExecutionResult(
                success=False,
                status_code=None,
                latency_ms=latency_ms,
                error_message=f"Connection timed out after {timeout_seconds}s."
            )
        except httpx.ConnectError:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CheckExecutionResult(
                success=False,
                status_code=None,
                latency_ms=latency_ms,
                error_message="Failed to establish connection to target server."
            )
        except httpx.HTTPError as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CheckExecutionResult(
                success=False,
                status_code=None,
                latency_ms=latency_ms,
                error_message=f"HTTP request error: {type(e).__name__}"
            )
        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return CheckExecutionResult(
                success=False,
                status_code=None,
                latency_ms=latency_ms,
                error_message="Internal check execution error."
            )
