from __future__ import annotations

from typing import List, Tuple

import chromadb

from app.config import settings


class VectorStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=settings.chroma_dir)
        self.collection = self.client.get_or_create_collection(name="papers")

    def upsert(self, doc_id: str, text: str, embedding: List[float], metadata: dict) -> None:
        self.collection.upsert(ids=[doc_id], documents=[text], embeddings=[embedding], metadatas=[metadata])

    def query(self, embedding: List[float], limit: int = 5) -> List[Tuple[str, str, dict, float]]:
        result = self.collection.query(query_embeddings=[embedding], n_results=limit)
        ids = result.get("ids", [[]])[0]
        docs = result.get("documents", [[]])[0]
        metas = result.get("metadatas", [[]])[0]
        dists = result.get("distances", [[]])[0]
        out: List[Tuple[str, str, dict, float]] = []
        for i, doc, meta, dist in zip(ids, docs, metas, dists):
            out.append((i, doc, meta or {}, dist))
        return out
