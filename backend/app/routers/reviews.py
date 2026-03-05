from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.models import Paper
from app.schemas import ReviewRequest, ReviewResponse
from app.services.reviews import ReviewService

router = APIRouter()


@router.post('/reviews/generate', response_model=ReviewResponse)
def generate_review(req: ReviewRequest, session: Session = Depends(get_session)):
    papers = [session.get(Paper, pid) for pid in req.paper_ids]
    valid = [p for p in papers if p is not None]
    if not valid:
        raise HTTPException(status_code=404, detail='No matching papers found for provided ids')

    review = ReviewService().generate(req.topic, valid)
    return ReviewResponse(review=review)
