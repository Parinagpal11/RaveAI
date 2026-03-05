from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import List

from sqlmodel import Session, select

from app.models import Paper
from app.services.embeddings import EmbeddingService
from app.services.graph import _tokenize, build_graph
from app.services.llm import LLMService
from app.services.vector_store import VectorStore


def _meta(summary: str, key: str) -> str:
    for part in (summary or "").split("|"):
        part = part.strip()
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        if k.strip().lower() == key.lower():
            return v.strip()
    return ""


def _guess_method(text: str) -> str:
    t = (text or "").lower()
    if "transformer" in t:
        return "Transformer"
    if "cnn" in t:
        return "CNN"
    if "graph" in t and "neural" in t:
        return "Graph Neural Network"
    if "cfd" in t or "computational fluid dynamics" in t:
        return "CFD Simulation"
    if "retrieval" in t:
        return "Retrieval-Augmented"
    if "reinforcement" in t:
        return "Reinforcement Learning"
    return "Unspecified"


def _guess_dataset(text: str) -> str:
    t = (text or "").lower()
    for name in ["imagenet", "cifar", "squad", "mmlu", "gsm8k", "mnist"]:
        if name in t:
            return name.upper()
    return "Unknown"


def _guess_metric(text: str) -> str:
    m = re.findall(r"(\d{1,3}(?:\.\d+)?\s*%)", text or "")
    return m[0] if m else "N/A"


def _citations_from_summary(summary: str) -> int:
    m = re.search(r"citations=(\d+)", summary or "")
    return int(m.group(1)) if m else 0


class AnalysisService:
    def __init__(self) -> None:
        self.embedder = EmbeddingService()
        self.vs = VectorStore()
        self.llm = LLMService()

    def semantic_search(self, query: str, limit: int, session: Session) -> List[Paper]:
        q = self.embedder.embed_texts([query])[0]
        matches = self.vs.query(q, limit=max(1, min(limit, 30)))
        out: List[Paper] = []
        seen: set[int] = set()
        for doc_id, _, meta, _ in matches:
            pid = int(meta.get("paper_id", doc_id))
            if pid in seen:
                continue
            paper = session.get(Paper, pid)
            if paper:
                out.append(paper)
                seen.add(pid)
        return out

    def summarize_paper(self, paper: Paper) -> str:
        prompt = (
            f"Title: {paper.title}\n"
            f"Abstract: {paper.abstract}\n"
            f"Existing Notes: {paper.contributions}\n"
        )
        return self.llm.complete(
            system=(
                "Summarize paper in markdown sections: Key Contribution, Method, Main Idea, Limitations, Impact. "
                "Be concise and concrete."
            ),
            user=prompt,
        )

    def compare_papers(self, papers: List[Paper]) -> str:
        rows = ["| Paper | Method | Dataset | Metric |", "|---|---|---|---|"]
        for p in papers:
            text = f"{p.title} {p.abstract} {p.contributions} {p.datasets} {p.metrics}"
            method = _guess_method(text)
            dataset = p.datasets if p.datasets and p.datasets != "Unknown" else _guess_dataset(text)
            metric = p.metrics if p.metrics and p.metrics != "Unknown" else _guess_metric(text)
            rows.append(f"| {p.title[:48]} | {method} | {dataset} | {metric} |")

        table = "\n".join(rows)
        synthesis = self.llm.complete(
            system="Write concise findings with sections: Comparison Insights, Trade-offs, Best Use Cases.",
            user=f"Papers:\n{table}",
        )
        return f"### Comparison Table\n{table}\n\n### Analysis\n{synthesis}"

    def detect_gaps(self, topic: str, session: Session) -> List[str]:
        data = build_graph(session, topic_query=topic)
        themes = data.get("insights", {}).get("main_themes", [])
        gap = data.get("insights", {}).get("research_gap", "")

        papers = session.exec(select(Paper)).all()
        topic_papers = [p for p in papers if topic.lower() in f"{p.topic} {p.title} {p.abstract}".lower()]
        tokens = []
        for p in topic_papers:
            tokens.extend(_tokenize(f"{p.title} {p.abstract}"))
        top = [w for w, _ in Counter(tokens).most_common(8)]

        out = []
        if gap:
            out.append(gap)
        if len(themes) >= 2:
            out.append(f"Few papers bridge '{themes[0]}' and '{themes[1]}'.")
        if top:
            out.append(f"Under-explored combination candidates: {', '.join(top[:4])} with {', '.join(top[4:8])}.")
        return out[:4] or ["Need more papers to infer reliable research gaps."]

    def trend_analysis(self, topic: str, session: Session) -> dict:
        papers = session.exec(select(Paper)).all()
        topic_papers = [p for p in papers if topic.lower() in f"{p.topic} {p.title} {p.abstract}".lower()]

        year_counts: defaultdict[int, int] = defaultdict(int)
        citations_by_year: defaultdict[int, int] = defaultdict(int)
        method_by_year: defaultdict[int, Counter] = defaultdict(Counter)
        topic_words: Counter = Counter()

        for p in topic_papers:
            year_s = _meta(p.summary, "year")
            if not year_s.isdigit():
                continue
            year = int(year_s)
            year_counts[year] += 1
            citations_by_year[year] += _citations_from_summary(p.summary)
            method_by_year[year][_guess_method(f"{p.title} {p.abstract} {p.contributions}")] += 1
            topic_words.update(_tokenize(f"{p.title} {p.abstract}"))

        timeline = [{"year": y, "count": year_counts[y]} for y in sorted(year_counts.keys())]
        citations_timeline = [{"year": y, "count": citations_by_year[y]} for y in sorted(citations_by_year.keys())]

        narrative = []
        for y in sorted(method_by_year.keys()):
            m, _ = method_by_year[y].most_common(1)[0]
            narrative.append(f"{y} - {m} dominated available papers.")

        top_topics = [{"topic": t.title(), "count": c} for t, c in topic_words.most_common(8)]

        if not narrative:
            narrative = ["Insufficient year metadata for trend inference."]

        return {
            "timeline": timeline,
            "citations_timeline": citations_timeline,
            "top_topics": top_topics,
            "narrative": narrative,
        }
