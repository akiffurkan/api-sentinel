from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.monitor import Monitor
from backend.models.base import utc_now


class MonitorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, monitor: Monitor) -> Monitor:
        self.session.add(monitor)
        await self.session.commit()
        await self.session.refresh(monitor)
        return monitor

    async def get_by_id(self, monitor_id: str) -> Optional[Monitor]:
        stmt = select(Monitor).where(Monitor.id == monitor_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self, enabled_only: bool = False) -> List[Monitor]:
        stmt = select(Monitor)
        if enabled_only:
            stmt = stmt.where(Monitor.enabled.is_(True))
        stmt = stmt.order_by(Monitor.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_due_monitors(self, current_time: datetime, limit: int = 50) -> List[Monitor]:
        """Fetch enabled monitors where next_check_at <= current_time."""
        stmt = (
            select(Monitor)
            .where(Monitor.enabled.is_(True))
            .where(Monitor.next_check_at <= current_time)
            .order_by(Monitor.next_check_at.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, monitor: Monitor) -> Monitor:
        monitor.updated_at = utc_now()
        await self.session.commit()
        await self.session.refresh(monitor)
        return monitor

    async def delete(self, monitor: Monitor) -> None:
        await self.session.delete(monitor)
        await self.session.commit()
