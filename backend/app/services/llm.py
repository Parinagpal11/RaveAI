from __future__ import annotations

import json
import re
import urllib.request

from openai import OpenAI

from app.config import settings


class LLMService:
    def __init__(self) -> None:
        self.provider = settings.llm_provider.lower().strip()
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def _mock(self, _system: str, user: str) -> str:
        # Review-mode mock
        if 'Topic:' in user and 'Papers:' in user:
            topic_match = re.search(r'Topic:\s*(.+)', user)
            topic = topic_match.group(1).strip() if topic_match else 'the selected topic'
            return (
                f"### Background\n{topic} has active research momentum with multiple overlapping approaches.\n\n"
                "### Themes\n"
                "- Foundational methods and system design patterns\n"
                "- Task-specific adaptations and evaluation protocols\n"
                "- Practical deployment constraints and safety concerns\n\n"
                "### Comparative Analysis\n"
                "- Methods differ mainly by data assumptions, reasoning depth, and compute trade-offs.\n"
                "- Strongest results usually combine robust retrieval with domain-specific adaptation.\n\n"
                "### Research Gaps\n"
                "- Limited standardized benchmarks across sub-tasks\n"
                "- Weak reporting of failure modes and negative results\n"
                "- Insufficient cross-domain generalization studies\n\n"
                "### Future Directions\n"
                "- Build unified evaluation suites with reproducible settings\n"
                "- Study hybrid architectures that combine complementary strengths\n"
                "- Prioritize interpretability and reliability in real-world settings\n\n"
                "### Note\n"
                "This is a mock-mode review. Start Ollama for grounded model-generated synthesis."
            )

        # QA-mode mock
        q_match = re.search(r'Question:\s*(.+)', user)
        question = q_match.group(1).strip() if q_match else 'the research question'
        return (
            "### Provisional Answer (Mock Mode)\n"
            f"Rave is running without a live LLM, so this is a heuristic summary for: **{question}**.\n\n"
            "### Key Takeaways\n"
            "- The most similar papers likely share task setup and evaluation signals.\n"
            "- Compare methods by objective, data assumptions, and inference cost.\n"
            "- Validate with paper-specific metrics before final conclusions.\n\n"
            "### Limitations\n"
            "- This answer is generated without model reasoning.\n"
            "- Start Ollama (or set OpenAI) for grounded synthesis."
        )

    def _ollama_complete(self, system: str, user: str) -> str:
        prompt = f"System:\n{system}\n\nUser:\n{user}\n\nAssistant:\n"
        payload = {
            "model": settings.ollama_chat_model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2},
        }
        req = urllib.request.Request(
            url=f"{settings.ollama_base_url.rstrip('/')}/api/generate",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        return (data.get('response') or '').strip()

    def complete(self, system: str, user: str) -> str:
        if self.provider == 'ollama':
            try:
                out = self._ollama_complete(system, user)
                if out:
                    return out
            except Exception:
                return self._mock(system, user)

        if self.provider == 'openai' and self.client:
            resp = self.client.responses.create(
                model=settings.openai_model,
                input=[
                    {'role': 'system', 'content': system},
                    {'role': 'user', 'content': user},
                ],
                temperature=0.2,
            )
            return resp.output_text

        return self._mock(system, user)
