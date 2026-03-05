from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Paper(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: Optional[str] = Field(default=None, index=True)
    title: str
    abstract: str
    authors: str = ""
    topic: str = ""
    summary: str = ""
    contributions: str = ""
    datasets: str = ""
    metrics: str = ""
    limitations: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
