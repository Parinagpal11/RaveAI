from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db import get_session
from app.schemas import GraphResponse
from app.services.graph import build_graph

router = APIRouter()


@router.get('/graph', response_model=GraphResponse)
def graph(topic: str | None = Query(default=None), session: Session = Depends(get_session)):
    data = build_graph(session, topic_query=topic)
    return GraphResponse(**data)
