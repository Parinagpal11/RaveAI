from __future__ import annotations

from typing import List

import hashlib
import json
import urllib.request

from openai import OpenAI

from app.config import settings


class EmbeddingService:
    def __init__(self) -> None:
        self.provider = settings.embedding_provider.lower().strip()
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def _mock_embed(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for text in texts:
            digest = hashlib.sha256(text.encode("utf-8")).digest()
            vector = [b / 255.0 for b in digest[:32]]
            vectors.append(vector)
        return vectors

    def _ollama_embed(self, texts: List[str]) -> List[List[float]]:
        out: List[List[float]] = []
        for text in texts:
            payload = {"model": settings.ollama_embed_model, "prompt": text}
            req = urllib.request.Request(
                url=f"{settings.ollama_base_url.rstrip('/')}/api/embeddings",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            emb = data.get("embedding")
            if not emb:
                raise RuntimeError("Missing embedding from Ollama response")
            out.append(emb)
        return out

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if self.provider == "ollama":
            try:
                return self._ollama_embed(texts)
            except Exception:
                return self._mock_embed(texts)

        if self.provider == "openai" and self.client:
            resp = self.client.embeddings.create(model=settings.openai_embed_model, input=texts)
            return [item.embedding for item in resp.data]

        return self._mock_embed(texts)
