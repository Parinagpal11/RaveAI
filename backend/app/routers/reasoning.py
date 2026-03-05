from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.schemas import AskRequest, AskResponse
from app.services.reasoning import ReasoningService

router = APIRouter()


@router.post('/reasoning/ask', response_model=AskResponse)
def ask(req: AskRequest, session: Session = Depends(get_session)):
    service = ReasoningService()
    answer, evidence = service.ask(req.question, session, req.paper_ids)
    return AskResponse(answer=answer, evidence=evidence)
