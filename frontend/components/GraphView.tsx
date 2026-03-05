'use client';

import { useMemo, useState } from 'react';

import { GraphData, GraphEdge, GraphNode } from '@/lib/api';

type Point = { x: number; y: number };

type Props = {
  graph: GraphData;
  maxNodes?: number;
  relationFilter?: Record<string, boolean>;
  yearLimit?: number;
  onSelectNode?: (node: GraphNode | null) => void;
};

const COLORS = ['#0284c7', '#0ea5e9', '#f97316', '#eab308', '#7c3aed', '#ef4444'];
const REL_COLOR: Record<string, string> = {
  similar_topic: '#0284c7',
  similar_methodology: '#0ea5e9',
  same_dataset: '#f97316',
  semantic_similarity: '#94a3b8',
};

function buildLayout(nodes: GraphNode[], width: number, height: number): { points: Map<string, Point>; centers: Map<string, Point> } {
  const groups = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const cid = n.cluster_id || 'cluster:0';
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(n);
  }
  const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const cols = Math.min(2, Math.max(1, entries.length));
  const rows = Math.ceil(entries.length / cols);
  const cw = width / cols;
  const ch = height / rows;

  const points = new Map<string, Point>();
  const centers = new Map<string, Point>();

  entries.forEach(([cid, ns], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cw + cw / 2;
    const cy = row * ch + ch / 2;
    centers.set(cid, { x: cx, y: cy - 120 });

    const r0 = Math.max(62, Math.min(cw, ch) * 0.24);
    const sorted = [...ns].sort((a, b) => b.degree - a.degree);
    sorted.forEach((n, j) => {
      const ring = j === 0 ? 0 : Math.floor((j - 1) / 8) + 1;
      const pos = j === 0 ? 0 : (j - 1) % 8;
      const ang = (2 * Math.PI * pos) / 8 + i * 0.21;
      const rr = ring === 0 ? 0 : r0 * (0.5 + 0.35 * ring);
      points.set(n.id, { x: cx + rr * Math.cos(ang), y: cy + rr * Math.sin(ang) });
    });
  });

  return { points, centers };
}

function clusterColor(clusterId: string, ids: string[]): string {
  const idx = Math.max(0, ids.indexOf(clusterId));
  return COLORS[idx % COLORS.length];
}

function trim(text: string, n = 28) {
  return text.length > n ? `${text.slice(0, n - 1)}...` : text;
}

export function GraphView({ graph, maxNodes = 18, relationFilter, yearLimit, onSelectNode }: Props) {
  const width = 900;
  const height = 600;
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState<string | null>(null);

  const visibleNodes = useMemo(() => {
    const y = yearLimit || graph.meta.max_year;
    return [...graph.nodes]
      .filter((n) => !y || !n.year || n.year <= y)
      .sort((a, b) => (b.degree + b.citations * 0.2) - (a.degree + a.citations * 0.2))
      .slice(0, maxNodes);
  }, [graph.nodes, graph.meta.max_year, maxNodes, yearLimit]);

  const nodeSet = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const edges = useMemo(() => {
    return graph.edges.filter((e) => {
      if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) return false;
      if (!relationFilter) return true;
      return !!relationFilter[e.relation];
    });
  }, [graph.edges, nodeSet, relationFilter]);

  const { points, centers } = useMemo(() => buildLayout(visibleNodes, width, height), [visibleNodes]);
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNode>();
    visibleNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [visibleNodes]);

  const clusters = useMemo(() => [...new Set(visibleNodes.map((n) => n.cluster_id))], [visibleNodes]);

  return (
    <div className="card" style={{ background: '#f8fbff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ marginTop: 0 }}>Research Graph</h3>
        <div>
          <button className="secondaryBtn" onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}>-</button>
          <button className="secondaryBtn" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>+</button>
        </div>
      </div>

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect x="0" y="0" width={width} height={height} rx="12" fill="#ffffff" stroke="#dbe2ea" />
        <g transform={`scale(${zoom}) translate(${(1 - zoom) * width * 0.5}, ${(1 - zoom) * height * 0.5})`}>
          {graph.clusters.map((c) => {
            const center = centers.get(c.id);
            if (!center) return null;
            return <text key={c.id} x={center.x} y={center.y} textAnchor="middle" fill="#334155" fontSize="12" fontWeight={700}>{trim(c.label, 32)}</text>;
          })}

          {edges.map((e, i) => {
            const s = points.get(e.source);
            const t = points.get(e.target);
            if (!s || !t) return null;
            return (
              <line key={`${e.source}-${e.target}-${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={REL_COLOR[e.relation] || '#94a3b8'} strokeWidth={1.35} opacity={0.52} />
            );
          })}

          {visibleNodes.map((n) => {
            const p = points.get(n.id);
            if (!p) return null;
            const isActive = active === n.id;
            const col = clusterColor(n.cluster_id, clusters);
            const rr = Math.max(4, Math.min(18, n.size));
            return (
              <g
                key={n.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive(null)}
                onClick={() => onSelectNode?.(nodeMap.get(n.id) || null)}
              >
                <circle cx={p.x} cy={p.y} r={isActive ? rr + 2 : rr} fill={col} opacity={0.92} stroke="#ffffff" strokeWidth={1.4} />
                {isActive ? <text x={p.x + rr + 4} y={p.y + 4} fontSize="11" fill="#1e293b">{trim(n.label)}</text> : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {graph.clusters.slice(0, 6).map((c) => (
          <span key={c.id} className="pill">{c.label}</span>
        ))}
      </div>
    </div>
  );
}
