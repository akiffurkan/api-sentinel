from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.check_result_repo import CheckResultRepository


class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.check_repo = CheckResultRepository(session)

    async def get_monitor_metrics(self, monitor_id: str, hours: int = 24) -> Dict[str, Any]:
        """Calculates check-based estimated availability and latency statistics."""
        return await self.check_repo.get_metrics_for_monitor(monitor_id=monitor_id, hours=hours)

    async def get_global_metrics(self) -> Dict[str, Any]:
        """Calculates overall uptime percentage and average latency across all monitors."""
        uptime, avg_lat = await self.check_repo.get_global_metrics()
        return {
            "overall_uptime_percentage": uptime,
            "average_latency_ms": avg_lat,
            "uptime_calculation_note": "Estimated availability calculated from persisted check results over the recorded window."
        }
