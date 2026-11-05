import asyncio
import logging
from datetime import timedelta
from typing import Set, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.config import get_settings
from backend.core.database import AsyncSessionLocal
from backend.models.base import utc_now
from backend.repositories.monitor_repo import MonitorRepository
from backend.repositories.check_result_repo import CheckResultRepository
from backend.services.checker import HTTPChecker, CheckExecutionResult
from backend.services.incident_manager import IncidentManager

logger = logging.getLogger("apisentinel.scheduler")


class CheckRunner:
    @staticmethod
    async def run_single_check(
        monitor_id: str,
        session: Optional[AsyncSession] = None
    ) -> CheckExecutionResult:
        """
        Execute check for a specific monitor, update status, incidents, and record result.
        Can be used both by the worker scheduler and manual check-now action.
        """
        owns_session = session is None
        if owns_session:
            session_ctx = AsyncSessionLocal()
            db = await session_ctx.__aenter__()
        else:
            db = session

        try:
            monitor_repo = MonitorRepository(db)
            check_repo = CheckResultRepository(db)
            incident_mgr = IncidentManager(db)

            monitor = await monitor_repo.get_by_id(monitor_id)
            if not monitor:
                raise ValueError(f"Monitor {monitor_id} not found.")

            # Perform HTTP Check
            result = await HTTPChecker.perform_check(
                url=monitor.url,
                expected_status_codes=monitor.expected_status_codes,
                timeout_seconds=monitor.timeout_seconds
            )

            # Record Check Result in DB
            now = utc_now()
            await check_repo.record_result(
                monitor_id=monitor.id,
                latency_ms=result.latency_ms,
                success=result.success,
                status_code=result.status_code,
                error_message=result.error_message,
                checked_at=now
            )

            # Update Monitor Lifecycle Status & Incidents
            await incident_mgr.handle_check_outcome(
                monitor=monitor,
                success=result.success,
                error_message=result.error_message
            )

            # Schedule next check
            monitor.next_check_at = now + timedelta(seconds=monitor.interval_seconds)
            await monitor_repo.update(monitor)

            return result

        finally:
            if owns_session:
                await session_ctx.__aexit__(None, None, None)


class MonitoringScheduler:
    def __init__(self):
        self.settings = get_settings()
        self._running = False
        self._in_flight: Set[str] = set()
        self._semaphore = asyncio.Semaphore(self.settings.MAX_CONCURRENT_CHECKS)

    async def _check_monitor_worker(self, monitor_id: str) -> None:
        async with self._semaphore:
            try:
                await CheckRunner.run_single_check(monitor_id)
            except Exception as e:
                logger.error(f"Error checking monitor {monitor_id}: {e}", exc_info=True)
            finally:
                self._in_flight.discard(monitor_id)

    async def run_tick(self) -> int:
        """Run a single polling tick. Returns number of dispatched checks."""
        now = utc_now()
        async with AsyncSessionLocal() as session:
            repo = MonitorRepository(session)
            due_monitors = await repo.get_due_monitors(current_time=now, limit=50)

            dispatched = 0
            for monitor in due_monitors:
                if monitor.id in self._in_flight:
                    continue  # Already in progress, prevent duplicate checks

                self._in_flight.add(monitor.id)
                # Fire and forget check task
                asyncio.create_task(self._check_monitor_worker(monitor.id))
                dispatched += 1

            return dispatched

    async def start(self) -> None:
        """Continuous background worker loop."""
        self._running = True
        logger.info(f"API Sentinel background monitoring worker started. Max concurrency: {self.settings.MAX_CONCURRENT_CHECKS}")

        while self._running:
            try:
                await self.run_tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in scheduler loop: {e}", exc_info=True)

            try:
                await asyncio.sleep(self.settings.WORKER_POLL_INTERVAL)
            except asyncio.CancelledError:
                break

        logger.info("API Sentinel background monitoring worker stopped.")

    def stop(self) -> None:
        self._running = False
