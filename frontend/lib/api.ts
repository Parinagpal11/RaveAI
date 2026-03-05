const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

export type Paper = {
  id: number;
  title: string;
  abstract: string;
  authors: string;
  topic: string;
  summary: string;
  contributions: string;
  datasets: string;
  metrics: string;
  limitations: string;
};

export type PaperSummary = {
  paper_id: number;
  title: string;
  summary: string;
};

export type TrendPoint = { year: number; count: number };

export type TrendTopic = { topic: string; count: number };

export type TrendData = {
  topic: string;
  timeline: TrendPoint[];
  citations_timeline: TrendPoint[];
  top_topics: TrendTopic[];
  narrative: string[];
};

export type GapData = {
  topic: string;
  gaps: string[];
};

export type GraphNode = {
  id: string;
  label: string;
  kind: string;
  year: number;
  citations: number;
  degree: number;
  size: number;
  cluster_id: string;
  cluster_label: string;
  source: string;
  contribution: string;
  related_papers: string[];
};

export type GraphEdge = {
  source: string;
  target: string;
  relation: 'similar_topic' | 'similar_methodology' | 'same_dataset' | 'semantic_similarity' | string;
  weight: number;
};

export type GraphCluster = {
  id: string;
  label: string;
  paper_count: number;
  avg_year: number;
};

export type GraphInsights = {
  main_themes: string[];
  emerging_direction: string;
  research_gap: string;
};

export type GraphMeta = {
  title: string;
  min_year: number;
  max_year: number;
  filtered_topic: string;
  total_papers: number;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  insights: GraphInsights;
  meta: GraphMeta;
};

async function requestJson<T>(url: string, init?: RequestInit, label = 'Request'): Promise<T> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`${label} failed (${res.status})${msg ? `: ${msg}` : ''}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`${label} failed: cannot reach backend at ${API_BASE}. Start backend server on port 8000.`);
    }
    throw err;
  }
}

export async function ingest(topic: string, count = 5): Promise<Paper[]> {
  return requestJson<Paper[]>(
    `${API_BASE}/papers/ingest`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, count }),
    },
    'Ingestion'
  );
}

export async function listPapers(): Promise<Paper[]> {
  return requestJson<Paper[]>(`${API_BASE}/papers`, { cache: 'no-store' }, 'List papers');
}

export async function semanticSearch(query: string, limit = 8): Promise<Paper[]> {
  return requestJson<Paper[]>(
    `${API_BASE}/papers/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    },
    'Semantic search'
  );
}

export async function getPaperSummary(paperId: number): Promise<PaperSummary> {
  return requestJson<PaperSummary>(`${API_BASE}/papers/${paperId}/summary`, { cache: 'no-store' }, 'Paper summary');
}

export async function comparePapers(paperIds: number[]): Promise<{ comparison_markdown: string }> {
  return requestJson<{ comparison_markdown: string }>(
    `${API_BASE}/papers/compare`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper_ids: paperIds }),
    },
    'Paper comparison'
  );
}

export async function getGaps(topic: string): Promise<GapData> {
  return requestJson<GapData>(`${API_BASE}/insights/gaps?topic=${encodeURIComponent(topic)}`, { cache: 'no-store' }, 'Gap detection');
}

export async function getTrends(topic: string): Promise<TrendData> {
  return requestJson<TrendData>(`${API_BASE}/insights/trends?topic=${encodeURIComponent(topic)}`, { cache: 'no-store' }, 'Trend analysis');
}

export async function ask(question: string, paperIds?: number[]) {
  return requestJson<{ answer: string; evidence: string[] }>(
    `${API_BASE}/reasoning/ask`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, paper_ids: paperIds?.length ? paperIds : null }),
    },
    'Reasoning'
  );
}

export async function generateReview(topic: string, paperIds: number[]) {
  return requestJson<{ review: string }>(
    `${API_BASE}/reviews/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, paper_ids: paperIds }),
    },
    'Review generation'
  );
}

export async function getGraph(topic?: string): Promise<GraphData> {
  const qs = topic?.trim() ? `?topic=${encodeURIComponent(topic.trim())}` : '';
  return requestJson<GraphData>(`${API_BASE}/graph${qs}`, { cache: 'no-store' }, 'Graph load');
}
