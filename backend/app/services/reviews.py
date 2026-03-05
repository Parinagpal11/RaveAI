from __future__ import annotations

from typing import List

from sqlmodel import Session

from app.models import Paper
from app.services.llm import LLMService


class ReviewService:
    def __init__(self) -> None:
        self.llm = LLMService()

    def generate(self, topic: str, papers: List[Paper]) -> str:
        corpus = "\\n\\n".join(
            [
                (
                    f"Title: {p.title}\\n"
                    f"Summary: {p.summary}\\n"
                    f"Contributions: {p.contributions}\\n"
                    f"Datasets: {p.datasets}\\n"
                    f"Metrics: {p.metrics}\\n"
                    f"Limitations: {p.limitations}"
                )
                for p in papers
            ]
        )
        return self.llm.complete(
            system=(
                "Write a structured literature review with sections: Background, Themes, Comparative Analysis, "
                "Gaps, and Future Directions. Be concise and specific."
            ),
            user=f"Topic: {topic}\\n\\nPapers:\\n{corpus}",
        )
