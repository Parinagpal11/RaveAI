from __future__ import annotations

from typing import List, Tuple

from sqlmodel import Session, select

from app.models import Paper
from app.services.embeddings import EmbeddingService
from app.services.llm import LLMService
from app.services.vector_store import VectorStore


def _compact_snippet(text: str, max_chars: int = 260) -> str:
    cleaned = " ".join(text.replace("\n", " ").split())
    return cleaned[:max_chars].rstrip() + ("..." if len(cleaned) > max_chars else "")


class ReasoningService:
    def __init__(self) -> None:
        self.embedder = EmbeddingService()
        self.vs = VectorStore()
        self.llm = LLMService()

    def ask(self, question: str, session: Session, paper_ids: List[int] | None = None) -> Tuple[str, List[str]]:
        q_emb = self.embedder.embed_texts([question])[0]
        matches = self.vs.query(q_emb, limit=10)

        filtered = []
        for doc_id, doc, meta, dist in matches:
            pid = int(meta.get("paper_id", doc_id))
            if paper_ids and pid not in paper_ids:
                continue
            filtered.append(
                {
                    "pid": pid,
                    "title": str(meta.get("title") or f"Paper {pid}"),
                    "snippet": _compact_snippet(doc, 240),
                    "distance": float(dist),
                }
            )

        if not filtered:
            if paper_ids:
                papers = [session.get(Paper, pid) for pid in paper_ids]
                papers = [p for p in papers if p is not None]
            else:
                papers = session.exec(select(Paper).limit(6)).all()

            filtered = [
                {
                    "pid": p.id,
                    "title": p.title,
                    "snippet": _compact_snippet(f"{p.title}. {p.abstract}", 240),
                    "distance": 1.0,
                }
                for p in papers
            ]

        context_blocks = [
            f"[{x['pid']}] {x['title']}\n{x['snippet']}"
            for x in filtered[:6]
        ]
        context = "\n\n".join(context_blocks)

        evidence = [
            f"Paper {x['pid']} - {x['title']} (relevance {max(0.0, 1.0 - x['distance']):.2f})"
            for x in filtered[:6]
        ]

        answer = self.llm.complete(
            system=(
                "You are a research copilot. Produce concise markdown with sections: "
                "Answer, Supporting Evidence, Limitations, Confidence. "
                "Use only provided context."
            ),
            user=f"Question: {question}\n\nContext:\n{context}",
        )
        return answer, evidence
