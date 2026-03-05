from __future__ import annotations

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List

from sqlmodel import Session, select

from app.config import settings
from app.models import Paper
from app.services.embeddings import EmbeddingService
from app.services.llm import LLMService
from app.services.vector_store import VectorStore


@dataclass
class SourcePaper:
    external_id: str
    title: str
    abstract: str
    authors: str
    source: str
    doi: str = ""
    year: str = ""
    pdf_url: str = ""


def _safe_get_json(url: str, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _reconstruct_openalex_abstract(inv_idx: dict | None) -> str:
    if not inv_idx:
        return ""
    max_pos = -1
    for positions in inv_idx.values():
        if positions:
            max_pos = max(max_pos, max(positions))
    if max_pos < 0:
        return ""
    words = [""] * (max_pos + 1)
    for token, positions in inv_idx.items():
        for pos in positions:
            if 0 <= pos < len(words):
                words[pos] = token
    return " ".join(w for w in words if w).strip()


def _fetch_openalex(topic: str, count: int) -> List[SourcePaper]:
    params = {
        "search": topic,
        "per-page": str(max(1, min(count, 50))),
        "sort": "relevance_score:desc",
    }
    if settings.openalex_email:
        params["mailto"] = settings.openalex_email
    url = f"https://api.openalex.org/works?{urllib.parse.urlencode(params)}"

    data = _safe_get_json(url)
    results = data.get("results", [])
    papers: List[SourcePaper] = []

    for item in results:
        title = (item.get("display_name") or "").strip()
        if not title:
            continue

        abstract = _reconstruct_openalex_abstract(item.get("abstract_inverted_index"))
        if not abstract:
            abstract = (item.get("primary_location", {}) or {}).get("source", {}).get("display_name", "")
        abstract = abstract.strip() or "No abstract available."

        authorships = item.get("authorships") or []
        authors = ", ".join(
            a.get("author", {}).get("display_name", "")
            for a in authorships
            if a.get("author", {}).get("display_name")
        )

        doi_raw = item.get("doi") or ""
        doi = doi_raw.replace("https://doi.org/", "") if doi_raw else ""

        external_id = item.get("id") or f"openalex:{title[:40]}"
        pdf_url = ((item.get("open_access") or {}).get("oa_url") or "").strip()
        year = str(item.get("publication_year") or "")

        papers.append(
            SourcePaper(
                external_id=external_id,
                title=title,
                abstract=abstract,
                authors=authors,
                source="openalex",
                doi=doi,
                year=year,
                pdf_url=pdf_url,
            )
        )
    return papers


def _fetch_arxiv(topic: str, count: int) -> List[SourcePaper]:
    query = urllib.parse.quote(topic)
    url = (
        "http://export.arxiv.org/api/query"
        f"?search_query=all:{query}&start=0&max_results={max(1, min(count, 50))}"
        "&sortBy=relevance&sortOrder=descending"
    )

    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=20) as resp:
        xml_text = resp.read().decode("utf-8")

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(xml_text)
    papers: List[SourcePaper] = []

    for entry in root.findall("atom:entry", ns):
        entry_id = (entry.findtext("atom:id", default="", namespaces=ns) or "").strip()
        title = (entry.findtext("atom:title", default="", namespaces=ns) or "").replace("\n", " ").strip()
        summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").replace("\n", " ").strip()
        published = (entry.findtext("atom:published", default="", namespaces=ns) or "").strip()

        if not title:
            continue

        authors = ", ".join(
            (a.findtext("atom:name", default="", namespaces=ns) or "").strip()
            for a in entry.findall("atom:author", ns)
            if (a.findtext("atom:name", default="", namespaces=ns) or "").strip()
        )

        pdf_url = ""
        for link in entry.findall("atom:link", ns):
            href = (link.attrib.get("href") or "").strip()
            link_type = (link.attrib.get("type") or "").strip()
            if link_type == "application/pdf" or href.endswith(".pdf"):
                pdf_url = href
                break

        papers.append(
            SourcePaper(
                external_id=entry_id or f"arxiv:{title[:40]}",
                title=title,
                abstract=summary or "No abstract available.",
                authors=authors,
                source="arxiv",
                year=published[:4] if published else "",
                pdf_url=pdf_url,
            )
        )
    return papers


def _enrich_with_semantic_scholar(paper: SourcePaper) -> str:
    if not settings.semantic_scholar_api_key or not paper.doi:
        return ""

    doi = urllib.parse.quote(f"DOI:{paper.doi}")
    fields = "citationCount,fieldsOfStudy"
    url = f"https://api.semanticscholar.org/graph/v1/paper/{doi}?fields={fields}"

    try:
        data = _safe_get_json(url, headers={"x-api-key": settings.semantic_scholar_api_key})
    except Exception:
        return ""

    citation_count = data.get("citationCount")
    fos = data.get("fieldsOfStudy") or []
    fos_str = ", ".join(x for x in fos if isinstance(x, str))

    bits = []
    if citation_count is not None:
        bits.append(f"citations={citation_count}")
    if fos_str:
        bits.append(f"fields={fos_str}")
    return "; ".join(bits)


def _mock_papers(topic: str, count: int) -> List[SourcePaper]:
    return [
        SourcePaper(
            external_id=f"mock-{topic[:10]}-{i}",
            title=f"{topic.title()} Study {i+1}",
            abstract=f"This paper explores {topic} with method variant {i+1}.",
            authors="Doe, Smith",
            source="mock",
        )
        for i in range(count)
    ]


class IngestionService:
    def __init__(self) -> None:
        self.embedder = EmbeddingService()
        self.vs = VectorStore()
        self.llm = LLMService()

    def _collect_sources(self, topic: str, count: int) -> List[SourcePaper]:
        gathered: List[SourcePaper] = []
        seen: set[str] = set()

        for source_fn in (_fetch_openalex, _fetch_arxiv):
            try:
                candidates = source_fn(topic, max(count * 2, 8))
            except Exception:
                candidates = []

            for p in candidates:
                key = p.external_id or p.title.lower()
                if key in seen:
                    continue
                seen.add(key)
                gathered.append(p)
                if len(gathered) >= count:
                    return gathered

        return gathered or _mock_papers(topic, count)

    def ingest_topic(self, topic: str, count: int, session: Session) -> List[Paper]:
        raw = self._collect_sources(topic, count)
        texts = [f"{p.title}\n\n{p.abstract}" for p in raw]
        embeddings = self.embedder.embed_texts(texts)

        out: List[Paper] = []
        for idx, (paper_raw, text, emb) in enumerate(zip(raw, texts, embeddings)):
            existing = session.exec(select(Paper).where(Paper.external_id == paper_raw.external_id)).first()
            if existing:
                out.append(existing)
                continue

            extraction = self.llm.complete(
                system="Extract contributions, datasets, metrics, limitations in concise bullets.",
                user=text,
            )
            s2 = _enrich_with_semantic_scholar(paper_raw)

            summary_bits = [
                paper_raw.abstract,
                f"source={paper_raw.source}",
            ]
            if paper_raw.year:
                summary_bits.append(f"year={paper_raw.year}")
            if paper_raw.pdf_url:
                summary_bits.append(f"pdf={paper_raw.pdf_url}")
            if s2:
                summary_bits.append(f"semantic_scholar=({s2})")

            paper = Paper(
                external_id=paper_raw.external_id,
                title=paper_raw.title,
                abstract=paper_raw.abstract,
                authors=paper_raw.authors,
                topic=topic,
                summary=" | ".join(summary_bits),
                contributions=extraction,
                datasets="Unknown",
                metrics="Unknown",
                limitations="Requires deeper empirical validation",
            )
            session.add(paper)
            session.commit()
            session.refresh(paper)

            self.vs.upsert(
                doc_id=str(paper.id),
                text=text,
                embedding=emb,
                metadata={
                    "paper_id": paper.id,
                    "title": paper.title,
                    "topic": topic,
                    "rank": idx,
                    "source": paper_raw.source,
                },
            )
            out.append(paper)

        return out[:count]
