from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Paper
from app.schemas import (
    CompareRequest,
    CompareResponse,
    GapResponse,
    IngestRequest,
    PaperOut,
    PaperSummaryResponse,
    SemanticSearchRequest,
    TopicPoint,
    TrendPoint,
    TrendResponse,
)
from app.services.analysis import AnalysisService
from app.services.ingest import IngestionService

router = APIRouter()


def _to_out(p: Paper) -> PaperOut:
    return PaperOut(
        id=p.id,
        title=p.title,
        abstract=p.abstract,
        authors=p.authors,
        topic=p.topic,
        summary=p.summary,
        contributions=p.contributions,
        datasets=p.datasets,
        metrics=p.metrics,
        limitations=p.limitations,
    )


@router.post('/papers/ingest', response_model=List[PaperOut])
def ingest(req: IngestRequest, session: Session = Depends(get_session)):
    ingestor = IngestionService()
    papers = ingestor.ingest_topic(req.topic, req.count, session)
    return [_to_out(p) for p in papers]


@router.get('/papers', response_model=List[PaperOut])
def list_papers(session: Session = Depends(get_session)):
    papers = session.exec(select(Paper).order_by(Paper.id.desc())).all()
    return [_to_out(p) for p in papers]


@router.post('/papers/search', response_model=List[PaperOut])
def semantic_search(req: SemanticSearchRequest, session: Session = Depends(get_session)):
    service = AnalysisService()
    papers = service.semantic_search(req.query, req.limit, session)
    return [_to_out(p) for p in papers]


@router.get('/papers/{paper_id}/summary', response_model=PaperSummaryResponse)
def paper_summary(paper_id: int, session: Session = Depends(get_session)):
    paper = session.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail='Paper not found')

    summary = AnalysisService().summarize_paper(paper)
    return PaperSummaryResponse(paper_id=paper.id, title=paper.title, summary=summary)


@router.post('/papers/compare', response_model=CompareResponse)
def compare_papers(req: CompareRequest, session: Session = Depends(get_session)):
    papers = [session.get(Paper, pid) for pid in req.paper_ids]
    valid = [p for p in papers if p is not None]
    if len(valid) < 2:
        raise HTTPException(status_code=400, detail='Select at least 2 valid papers for comparison')

    markdown = AnalysisService().compare_papers(valid)
    return CompareResponse(comparison_markdown=markdown)


@router.get('/insights/gaps', response_model=GapResponse)
def research_gaps(topic: str = Query(..., min_length=2), session: Session = Depends(get_session)):
    gaps = AnalysisService().detect_gaps(topic, session)
    return GapResponse(topic=topic, gaps=gaps)


@router.get('/insights/trends', response_model=TrendResponse)
def research_trends(topic: str = Query(..., min_length=2), session: Session = Depends(get_session)):
    data = AnalysisService().trend_analysis(topic, session)
    return TrendResponse(
        topic=topic,
        timeline=[TrendPoint(**p) for p in data.get('timeline', [])],
        citations_timeline=[TrendPoint(**p) for p in data.get('citations_timeline', [])],
        top_topics=[TopicPoint(**p) for p in data.get('top_topics', [])],
        narrative=data.get('narrative', []),
    )
