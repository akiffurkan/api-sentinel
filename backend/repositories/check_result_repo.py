import statistics
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.check_result import CheckResult
from backend.models.base import utc_now


class CheckResultRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def record_result(
        self,
        monitor_id: str,
        latency_ms: float,
        success: bool,
        status_code: Optional[int] = None,
        error_message: Optional[str] = None,
        checked_at: Optional[datetime] = None
    ) -> CheckResult:
        result = CheckResult(
            monitor_id=monitor_id,
            status_code=status_code,
            latency_ms=latency_ms,
            success=success,
            error_message=error_message,
            checked_at=checked_at or utc_now()
        )
        self.session.add(result)
        await self.session.commit()
        await self.session.refresh(result)
        return result

    async def get_checks_for_monitor(
        self,
        monitor_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[CheckResult]:
        stmt = (
            select(CheckResult)
            .where(CheckResult.monitor_id == monitor_id)
            .order_by(desc(CheckResult.checked_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_checks_for_monitor(self, monitor_id: str) -> int:
        stmt = (
            select(func.count(CheckResult.id))
            .where(CheckResult.monitor_id == monitor_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_metrics_for_monitor(
        self,
        monitor_id: str,
        hours: int = 24
    ) -> Dict[str, Optional[float]]:
        """Calculate check-based uptime percentage and latency stats over the last N hours."""
        since = utc_now() - timedelta(hours=hours)
        stmt = (
            select(CheckResult.success, CheckResult.latency_ms)
            .where(CheckResult.monitor_id == monitor_id)
            .where(CheckResult.checked_at >= since)
            .order_by(CheckResult.checked_at.desc())
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        if not rows:
            # Check if there are any checks at all regardless of time window
            stmt_all = (
                select(CheckResult.success, CheckResult.latency_ms)
                .where(CheckResult.monitor_id == monitor_id)
                .order_by(CheckResult.checked_at.desc())
                .limit(100)
            )
            res_all = await self.session.execute(stmt_all)
            rows = res_all.all()

        if not rows:
            return {
                "uptime_percentage": None,
                "average_latency_ms": None,
                "p95_latency_ms": None,
                "min_latency_ms": None,
                "max_latency_ms": None,
                "total_checks": 0
            }

        total = len(rows)
        successes = sum(1 for row in rows if row[0] is True)
        uptime = round((successes / total) * 100.0, 2)

        latencies = [row[1] for row in rows if row[1] is not None]
        if latencies:
            avg_lat = round(sum(latencies) / len(latencies), 2)
            min_lat = round(min(latencies), 2)
            max_lat = round(max(latencies), 2)
            if len(latencies) >= 2:
                # compute 95th percentile
                latencies_sorted = sorted(latencies)
                p95_idx = int(0.95 * len(latencies_sorted))
                p95_lat = round(latencies_sorted[min(p95_idx, len(latencies_sorted) - 1)], 2)
            else:
                p95_lat = avg_lat
        else:
            avg_lat = min_lat = max_lat = p95_lat = None

        return {
            "uptime_percentage": uptime,
            "average_latency_ms": avg_lat,
            "p95_latency_ms": p95_lat,
            "min_latency_ms": min_lat,
            "max_latency_ms": max_lat,
            "total_checks": total
        }

    async def get_global_metrics(self) -> Tuple[float, float]:
        """Returns (overall_uptime_pct, global_avg_latency_ms)."""
        stmt = (
            select(CheckResult.success, CheckResult.latency_ms)
            .order_by(CheckResult.checked_at.desc())
            .limit(1000)
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        if not rows:
            return 100.0, 0.0

        total = len(rows)
        successes = sum(1 for row in rows if row[0] is True)
        uptime = round((successes / total) * 100.0, 2)

        latencies = [row[1] for row in rows if row[1] is not None]
        avg_lat = round(sum(latencies) / len(latencies), 2) if latencies else 0.0

        return uptime, avg_lat
