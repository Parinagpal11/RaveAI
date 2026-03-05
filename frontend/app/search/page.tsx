'use client';

import { useEffect, useState } from 'react';

import { DashboardShell } from '@/components/DashboardShell';
import { PaperCard } from '@/components/PaperCard';
import { StructuredOutput } from '@/components/StructuredOutput';
import { ingest, listPapers, Paper, semanticSearch, getPaperSummary } from '@/lib/api';
import { getSelectedPaperIds, setSelectedPaperIds, setTopic, toggleSelectedPaper } from '@/lib/workspace';

export default function SearchPage() {
  const [topic, setTopicInput] = useState('multi agent systems for llm reasoning');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [results, setResults] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const t = qs?.get('topic');
    if (t) setTopicInput(t);

    setSelected(getSelectedPaperIds());
    listPapers().then(setPapers).catch(() => undefined);
  }, []);

  const onToggle = (id: number) => {
    const next = toggleSelectedPaper(id);
    setSelected(next);
    setSelectedPaperIds(next);
  };

  const onSearch = async () => {
    setLoading(true);
    try {
      setTopic(topic);
      const data = await semanticSearch(topic, 10);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const onIngest = async () => {
    setLoading(true);
    try {
      setTopic(topic);
      await ingest(topic, 12);
      const data = await listPapers();
      setPapers(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="container">
        <div className="card">
          <h2>Search Papers</h2>
          <input value={topic} onChange={(e) => setTopicInput(e.target.value)} />
          <button disabled={loading} onClick={onSearch}>Semantic Search</button>
          <button disabled={loading} onClick={onIngest}>Ingest From OpenAlex + arXiv</button>
        </div>

        {summary ? <div className="card"><StructuredOutput text={summary} /></div> : null}

        {results.length ? (
          <div>
            <h3>Semantic Results</h3>
            {results.map((p) => (
              <PaperCard
                key={`r-${p.id}`}
                paper={p}
                selected={selected.includes(p.id)}
                onToggle={onToggle}
                onSummarize={async (pid) => {
                  const s = await getPaperSummary(pid);
                  setSummary(`### ${s.title}\n\n${s.summary}`);
                }}
              />
            ))}
          </div>
        ) : null}

        <div>
          <h3>All Indexed Papers</h3>
          {papers.map((p) => (
            <PaperCard
              key={p.id}
              paper={p}
              selected={selected.includes(p.id)}
              onToggle={onToggle}
              onSummarize={async (pid) => {
                const s = await getPaperSummary(pid);
                setSummary(`### ${s.title}\n\n${s.summary}`);
              }}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
