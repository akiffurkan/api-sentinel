import logging
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.monitor import Monitor
from backend.models.incident import Incident
from backend.models.base import utc_now, ensure_utc
from backend.repositories.incident_repo import IncidentRepository
from backend.services.notifier import TelegramNotifier

logger = logging.getLogger("apisentinel.incident_manager")


def format_duration(seconds: float) -> str:
    """Format duration into human-readable string."""
    secs = int(seconds)
    if secs < 60:
        return f"{secs}s"
    mins, s = divmod(secs, 60)
    if mins < 60:
        return f"{mins}m {s}s"
    hours, m = divmod(mins, 60)
    return f"{hours}h {m}m"


class IncidentManager:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_repo = IncidentRepository(session)

    async def handle_check_outcome(
        self,
        monitor: Monitor,
        success: bool,
        error_message: Optional[str] = None
    ) -> Tuple[str, Optional[Incident]]:
        """
        Processes check outcome according to status lifecycle rules:
        - 1 failure -> DEGRADED (no incident opened)
        - 2+ consecutive failures -> DOWN (opens one incident, notifies via Telegram)
        - Success after outage -> RECOVERED (resolves incident, notifies via Telegram)
        - Success when healthy -> UP

        Returns (new_status, incident_affected_if_any).
        """
        now = utc_now()
        monitor.last_checked_at = now

        if not success:
            monitor.consecutive_failures += 1
            reason = error_message or "Endpoint check failure"

            if monitor.consecutive_failures == 1:
                # Single failure marks DEGRADED; does not open incident
                monitor.current_status = "DEGRADED"
                logger.info(f"Monitor '{monitor.name}' ({monitor.id}) is DEGRADED after 1 failure.")
                return "DEGRADED", None

            # 2 or more consecutive failures marks DOWN
            monitor.current_status = "DOWN"
            logger.warning(f"Monitor '{monitor.name}' ({monitor.id}) is DOWN ({monitor.consecutive_failures} failures).")

            # Check if an incident is already open (prevent duplicate incident)
            active_incident = await self.incident_repo.get_active_incident(monitor.id)
            if active_incident is None:
                # Open incident and notify
                new_incident = await self.incident_repo.create_incident(
                    monitor_id=monitor.id,
                    reason=reason
                )
                logger.info(f"Opened new incident {new_incident.id} for monitor {monitor.name}.")

                # Dispatch Telegram alert (fire and forget / async)
                timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
                await TelegramNotifier.send_outage_alert(
                    monitor_name=monitor.name,
                    monitor_url=monitor.url,
                    reason=reason,
                    timestamp_str=timestamp_str
                )
                return "DOWN", new_incident
            else:
                # Incident already open, avoid duplicate notifications
                return "DOWN", active_incident

        else:
            # Check succeeded
            active_incident = await self.incident_repo.get_active_incident(monitor.id)

            if active_incident is not None:
                # Outage resolved! Mark RECOVERED, resolve incident, send recovery notification
                resolved_incident = await self.incident_repo.resolve_incident(active_incident)
                monitor.current_status = "RECOVERED"
                monitor.consecutive_failures = 0

                started_at = ensure_utc(active_incident.started_at)
                duration_secs = (now - started_at).total_seconds()
                duration_str = format_duration(max(1.0, duration_secs))
                timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")

                logger.info(f"Monitor '{monitor.name}' RECOVERED. Incident {active_incident.id} resolved in {duration_str}.")

                await TelegramNotifier.send_recovery_alert(
                    monitor_name=monitor.name,
                    monitor_url=monitor.url,
                    duration_str=duration_str,
                    timestamp_str=timestamp_str
                )
                return "RECOVERED", resolved_incident
            else:
                # Was healthy or degraded before, now fully UP
                monitor.current_status = "UP"
                monitor.consecutive_failures = 0
                return "UP", None
