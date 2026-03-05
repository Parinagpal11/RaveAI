from __future__ import annotations

import re
from collections import Counter
from typing import Any, Dict, List

from sqlmodel import Session, select

from app.models import Paper

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "of", "on",
    "or", "that", "the", "to", "with", "using", "use", "via", "towards", "toward", "study", "analysis", "approach",
    "model", "models", "method", "methods", "paper", "based", "new", "survey", "llm", "ai", "systems", "system",
}


def _tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-zA-Z][a-zA-Z0-9\-]+", (text or "").lower()) if t not in STOPWORDS and len(t) > 2]


def _parse_summary_meta(summary: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not summary:
        return out
    parts = [p.strip() for p in summary.split("|")]
    for p in parts:
        if "=" in p:
            k, v = p.split("=", 1)
            out[k.strip().lower()] = v.strip()

    # semantic_scholar=(citations=12; fields=Computer Science)
    ss = out.get("semantic_scholar", "")
    if ss:
        for bit in ss.strip("() ").split(";"):
            bit = bit.strip()
            if "=" in bit:
                k, v = bit.split("=", 1)
                out[f"ss_{k.strip().lower()}"] = v.strip()
    return out


def _extract_topic_label(papers: List[Paper]) -> str:
    tokens: List[str] = []
    for p in papers:
        tokens.extend(_tokenize(f"{p.title} {p.abstract}"))
    common = [w for w, _ in Counter(tokens).most_common(4)]
    if not common:
        return "General Research Theme"
    return " ".join(common).title()


def _infer_relation(p1: Paper, p2: Paper) -> tuple[str, float] | None:
    if p1.topic and p2.topic and p1.topic == p2.topic:
        return "similar_topic", 0.9

    t1 = set(_tokenize(f"{p1.title} {p1.abstract}"))
    t2 = set(_tokenize(f"{p2.title} {p2.abstract}"))
    sim = len(t1 & t2) / max(1, len(t1 | t2))

    ds1 = set(_tokenize(p1.datasets or ""))
    ds2 = set(_tokenize(p2.datasets or ""))
    if ds1 and ds2 and ds1 & ds2:
        return "same_dataset", 0.78

    m1 = set(_tokenize((p1.metrics or "") + " " + (p1.contributions or "")))
    m2 = set(_tokenize((p2.metrics or "") + " " + (p2.contributions or "")))
    m_overlap = len(m1 & m2)
    if m_overlap >= 2:
        return "similar_methodology", min(0.92, 0.6 + m_overlap * 0.08)

    if sim > 0.17:
        return "semantic_similarity", min(0.85, 0.45 + sim)
    return None


def _calc_gap_statement(cluster_labels: List[str], cross_edges: int) -> str:
    if not cluster_labels:
        return "Insufficient data to infer gaps."
    if cross_edges < 2:
        return "Limited cross-theme integration. Explore hybrid methods combining major clusters."
    return "Cross-theme links exist, but benchmark-standardized comparisons remain sparse."


def build_graph(session: Session, topic_query: str | None = None) -> Dict[str, Any]:
    papers = session.exec(select(Paper)).all()
    if topic_query:
        q = topic_query.lower().strip()
        q_tokens = set(_tokenize(q))
        filtered = []
        for p in papers:
            hay = f"{p.topic} {p.title} {p.abstract}".lower()
            if q in hay:
                filtered.append(p)
                continue
            if q_tokens and q_tokens & set(_tokenize(hay)):
                filtered.append(p)
        papers = filtered

    if not papers:
        title = f"Research Landscape: {topic_query}" if topic_query else "Research Landscape"
        return {
            "nodes": [],
            "edges": [],
            "clusters": [],
            "insights": {
                "main_themes": [],
                "emerging_direction": "No papers available.",
                "research_gap": "No papers available.",
            },
            "meta": {
                "title": title,
                "min_year": 0,
                "max_year": 0,
                "filtered_topic": topic_query or "",
                "total_papers": 0,
            },
        }

    paper_by_id = {p.id: p for p in papers if p.id is not None}

    edges: List[Dict[str, Any]] = []
    degree: Counter[str] = Counter()

    paper_list = list(paper_by_id.values())
    for i, p1 in enumerate(paper_list):
        for p2 in paper_list[i + 1 :]:
            rel = _infer_relation(p1, p2)
            if not rel:
                continue
            relation, weight = rel
            s, t = f"paper:{p1.id}", f"paper:{p2.id}"
            edges.append({"source": s, "target": t, "relation": relation, "weight": round(weight, 3)})
            degree[s] += 1
            degree[t] += 1

    # Connected components for cluster labeling
    parent: Dict[str, str] = {}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    node_ids = [f"paper:{p.id}" for p in paper_list]
    for n in node_ids:
        parent[n] = n
    for e in edges:
        union(e["source"], e["target"])

    cluster_nodes: Dict[str, List[str]] = {}
    for n in node_ids:
        r = find(n)
        cluster_nodes.setdefault(r, []).append(n)

    cluster_list = sorted(cluster_nodes.values(), key=lambda x: len(x), reverse=True)
    cluster_meta: Dict[str, Dict[str, Any]] = {}
    clusters_out: List[Dict[str, Any]] = []
    for idx, ids in enumerate(cluster_list):
        cid = f"cluster:{idx+1}"
        papers_in = [paper_by_id[int(n.split(":")[1])] for n in ids]
        label = _extract_topic_label(papers_in)
        avg_year = 0
        years = []
        for p in papers_in:
            meta = _parse_summary_meta(p.summary)
            y = meta.get("year", "")
            if y.isdigit():
                years.append(int(y))
        if years:
            avg_year = int(sum(years) / len(years))
        cluster_meta[cid] = {"label": label, "ids": set(ids), "avg_year": avg_year}
        clusters_out.append({"id": cid, "label": label, "paper_count": len(ids), "avg_year": avg_year})

    # map node -> cluster id
    node_cluster: Dict[str, str] = {}
    for c in clusters_out:
        ids = cluster_meta[c["id"]]["ids"]
        for nid in ids:
            node_cluster[nid] = c["id"]

    # count cross-cluster edges
    cross_edges = 0
    for e in edges:
        if node_cluster.get(e["source"]) != node_cluster.get(e["target"]):
            cross_edges += 1

    nodes: List[Dict[str, Any]] = []
    year_values: List[int] = []
    for p in paper_list:
        nid = f"paper:{p.id}"
        meta = _parse_summary_meta(p.summary)
        year = int(meta.get("year", "0")) if meta.get("year", "").isdigit() else 0
        citations = int(meta.get("ss_citations", "0")) if meta.get("ss_citations", "").isdigit() else 0
        if year:
            year_values.append(year)

        # node size reflects importance (citations + graph degree)
        imp = (degree[nid] * 1.8) + (citations * 0.12)
        size = round(8 + min(26, imp), 2)

        contribution = (p.contributions or "").strip()
        if len(contribution) > 180:
            contribution = contribution[:180].rstrip() + "..."

        related = []
        for e in edges:
            if e["source"] == nid:
                pid = int(e["target"].split(":")[1])
                related.append(paper_by_id[pid].title)
            elif e["target"] == nid:
                pid = int(e["source"].split(":")[1])
                related.append(paper_by_id[pid].title)

        nodes.append(
            {
                "id": nid,
                "label": p.title,
                "kind": "paper",
                "year": year,
                "citations": citations,
                "degree": degree[nid],
                "size": size,
                "cluster_id": node_cluster.get(nid, "cluster:0"),
                "cluster_label": cluster_meta.get(node_cluster.get(nid, ""), {}).get("label", "General"),
                "source": meta.get("source", ""),
                "contribution": contribution or "Contribution summary unavailable.",
                "related_papers": related[:6],
            }
        )

    min_year = min(year_values) if year_values else 0
    max_year = max(year_values) if year_values else 0

    cluster_labels = [c["label"] for c in clusters_out[:4]]
    emerging = "No clear emerging direction yet."
    if clusters_out:
        # Prefer most recent sizeable cluster
        best = sorted(clusters_out, key=lambda c: (c.get("avg_year", 0), c["paper_count"]), reverse=True)[0]
        emerging = f"{best['label']} is gaining momentum in recent publications."

    title = f"Research Landscape: {topic_query}" if topic_query else "Research Landscape"

    return {
        "nodes": nodes,
        "edges": edges,
        "clusters": clusters_out,
        "insights": {
            "main_themes": cluster_labels,
            "emerging_direction": emerging,
            "research_gap": _calc_gap_statement(cluster_labels, cross_edges),
        },
        "meta": {
            "title": title,
            "min_year": min_year,
            "max_year": max_year,
            "filtered_topic": topic_query or "",
            "total_papers": len(nodes),
        },
    }
