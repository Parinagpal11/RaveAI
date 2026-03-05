'use client';

import { useEffect, useState } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DashboardShell } from '@/components/DashboardShell';
import { getGaps, getTrends, TrendData } from '@/lib/api';
import { getTopic } from '@/lib/workspace';

const axisColor = '#64748b';
const gridColor = '#dbe2ea';

export default function TrendsPage() {
  const [topic, setTopic] = useState('');
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTopic(getTopic('multi agent systems'));
  }, []);

  async function run() {
    setError('');
    setLoading(true);
    try {
      const [t, g] = await Promise.all([getTrends(topic), getGaps(topic)]);
      setTrends(t);
      setGaps(g.gaps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze trends');
    } finally {
      setLoading(false);
    }
  }

  const comboSeries = (trends?.timeline || []).map((p) => {
    const c = (trends?.citations_timeline || []).find((x) => x.year === p.year)?.count || 0;
    return { year: p.year, papers: p.count, citations: c };
  });

  return (
    <DashboardShell>
      <div className="container">
        <div className="card">
          <h2 className="sectionTitle">Research Trend Analysis</h2>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter research topic" />
          <button className="primaryBtn" disabled={loading} onClick={run}>Analyze Topic</button>
          {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
        </div>

        {!trends ? (
          <div className="emptyState">
            <p style={{ margin: 0 }}>No trend data yet</p>
            <p style={{ margin: '6px 0 14px', color: 'var(--text-2)' }}>Enter a research topic to analyze emerging research directions.</p>
            <button onClick={run}>Analyze Topic</button>
          </div>
        ) : (
          <div className="grid">
            <div className="card">
              <h3 className="cardTitle">Papers vs Citations by Year</h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={comboSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="year" stroke={axisColor} />
                    <YAxis stroke={axisColor} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#dbe2ea', color: '#1e293b' }} />
                    <Legend />
                    <Line type="monotone" dataKey="papers" stroke="#0ea5e9" strokeWidth={2.4} />
                    <Line type="monotone" dataKey="citations" stroke="#f97316" strokeWidth={2.4} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="cardTitle">Topic Evolution</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={trends.top_topics.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="topic" stroke={axisColor} angle={-20} textAnchor="end" interval={0} height={80} />
                    <YAxis stroke={axisColor} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#dbe2ea', color: '#1e293b' }} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="cardTitle">Key Influential Papers (Narrative)</h3>
              <ul style={{ paddingLeft: 18 }}>
                {trends.narrative.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>

            <div className="card">
              <h3 className="cardTitle">Research Gap Predictions</h3>
              {gaps.length ? <ul style={{ paddingLeft: 18 }}>{gaps.map((g) => <li key={g}>{g}</li>)}</ul> : <p>No gaps inferred yet.</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
