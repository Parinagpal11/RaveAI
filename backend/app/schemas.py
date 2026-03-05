from typing import List, Optional

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    topic: str = Field(..., min_length=2)
    count: int = 5


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    limit: int = 8


class PaperOut(BaseModel):
    id: int
    title: str
    abstract: str
    authors: str
    topic: str
    summary: str
    contributions: str
    datasets: str
    metrics: str
    limitations: str


class PaperSummaryResponse(BaseModel):
    paper_id: int
    title: str
    summary: str


class CompareRequest(BaseModel):
    paper_ids: List[int]


class CompareResponse(BaseModel):
    comparison_markdown: str


class GapResponse(BaseModel):
    topic: str
    gaps: List[str]


class TrendPoint(BaseModel):
    year: int
    count: int


class TopicPoint(BaseModel):
    topic: str
    count: int


class TrendResponse(BaseModel):
    topic: str
    timeline: List[TrendPoint]
    citations_timeline: List[TrendPoint]
    top_topics: List[TopicPoint]
    narrative: List[str]


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2)
    paper_ids: Optional[List[int]] = None


class AskResponse(BaseModel):
    answer: str
    evidence: List[str]


class ReviewRequest(BaseModel):
    topic: str
    paper_ids: List[int]


class ReviewResponse(BaseModel):
    review: str


class GraphNode(BaseModel):
    id: str
    label: str
    kind: str
    year: int = 0
    citations: int = 0
    degree: int = 0
    size: float = 8.0
    cluster_id: str = ""
    cluster_label: str = ""
    source: str = ""
    contribution: str = ""
    related_papers: List[str] = []


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 0.0


class GraphCluster(BaseModel):
    id: str
    label: str
    paper_count: int
    avg_year: int = 0


class GraphInsights(BaseModel):
    main_themes: List[str]
    emerging_direction: str
    research_gap: str


class GraphMeta(BaseModel):
    title: str
    min_year: int = 0
    max_year: int = 0
    filtered_topic: str = ""
    total_papers: int = 0


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    clusters: List[GraphCluster]
    insights: GraphInsights
    meta: GraphMeta
