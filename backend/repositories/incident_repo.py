from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.incident import Incident
from backend.models.base import utc_now


class IncidentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active_incident(self, monitor_id: str) -> Optional[Incident]:
        """Find the currently open incident for a monitor, if any."""
        stmt = (
            select(Incident)
            .where(Incident.monitor_id == monitor_id)
            .where(Incident.status == "OPEN")
            .order_by(desc(Incident.started_at))
            .limit(1)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def create_incident(self, monitor_id: str, reason: str) -> Incident:
        incident = Incident(
            monitor_id=monitor_id,
            status="OPEN",
            reason=reason,
            started_at=utc_now()
        )
        self.session.add(incident)
        await self.session.commit()
        await self.session.refresh(incident)
        return incident

    async def resolve_incident(self, incident: Incident) -> Incident:
        incident.status = "RESOLVED"
        incident.resolved_at = utc_now()
        await self.session.commit()
        await self.session.refresh(incident)
        return incident

    async def list_incidents(
        self,
        status_filter: Optional[str] = None,
        monitor_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Incident]:
        stmt = (
            select(Incident)
            .options(joinedload(Incident.monitor))
            .order_by(desc(Incident.started_at))
            .limit(limit)
            .offset(offset)
        )
        if status_filter:
            stmt = stmt.where(Incident.status == status_filter.upper())
        if monitor_id:
            stmt = stmt.where(Incident.monitor_id == monitor_id)

        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def count_open_incidents(self) -> int:
        stmt = select(func.count(Incident.id)).where(Incident.status == "OPEN")
        res = await self.session.execute(stmt)
        return res.scalar() or 0
