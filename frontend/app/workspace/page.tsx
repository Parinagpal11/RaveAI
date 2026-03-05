'use client';

import { useEffect, useMemo, useState } from 'react';

import { DashboardShell } from '@/components/DashboardShell';
import { PaperCard } from '@/components/PaperCard';
import { listPapers, Paper } from '@/lib/api';
import { getSelectedPaperIds, getTopic, setSelectedPaperIds, setTopic } from '@/lib/workspace';

function parseYear(summary: string): number {
  const m = (summary || '').match(/year=(\d{4})/);
  return m ? Number(m[1]) : 0;
}

function parseCitations(summary: string): number {
  const m = (summary || '').match(/citations=(\d+)/);
  return m ? Number(m[1]) : 0;
}

export default function WorkspacePage() {
  const [topic, setTopicInput] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'year' | 'citation' | 'relevance'>('relevance');

  useEffect(() => {
    setTopicInput(getTopic(''));
    setSelected(getSelectedPaperIds());
    listPapers().then(setPapers).catch(() => undefined);
  }, []);

  const selectedPapers = useMemo(() => {
    const base = papers.filter((p) => selected.includes(p.id));
    if (sortBy === 'year') return [...base].sort((a, b) => parseYear(b.summary) - parseYear(a.summary));
    if (sortBy === 'citation') return [...base].sort((a, b) => parseCitations(b.summary) - parseCitations(a.summary));
    return base;
  }, [papers, selected, sortBy]);

  const remove = (id: number) => {
    const next = selected.filter((x) => x !== id);
    setSelected(next);
    setSelectedPaperIds(next);
  };

  return (
    <DashboardShell>
      <div className="container">
        <div className="card">
          <h2 className="sectionTitle">Workspace</h2>
          <p>Research notebook for saved papers and export actions.</p>
          <input value={topic} onChange={(e) => setTopicInput(e.target.value)} placeholder="Current workspace topic" />
          <button className="primaryBtn" onClick={() => setTopic(topic)}>Save Topic</button>
          <button className="dangerBtn" onClick={() => { setSelected([]); setSelectedPaperIds([]); }}>Clear Selected Papers</button>
          <div style={{ marginTop: 12 }}>
            <button className="secondaryBtn" onClick={() => alert('Export Literature Review (stub)')}>Export Literature Review</button>
            <button className="secondaryBtn" onClick={() => alert('Download BibTex (stub)')}>Download BibTex</button>
            <button className="secondaryBtn" onClick={() => alert('Export PDF Summary (stub)')}>Export PDF Summary</button>
          </div>
        </div>

        <div className="card">
          <h3 className="cardTitle">Saved Papers</h3>
          <label>Sort by</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'year' | 'citation' | 'relevance')}>
            <option value="relevance">Relevance</option>
            <option value="year">Year</option>
            <option value="citation">Citation</option>
          </select>
        </div>

        {selectedPapers.length ? selectedPapers.map((p) => (
          <PaperCard key={p.id} paper={p} selected={true} onToggle={remove} />
        )) : <div className="emptyState">No saved papers yet.</div>}
      </div>
    </DashboardShell>
  );
}
