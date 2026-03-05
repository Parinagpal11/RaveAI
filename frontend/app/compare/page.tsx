'use client';

import { useEffect, useState } from 'react';

import { DashboardShell } from '@/components/DashboardShell';
import { StructuredOutput } from '@/components/StructuredOutput';
import { comparePapers, listPapers, Paper } from '@/lib/api';
import { getSelectedPaperIds, setSelectedPaperIds, toggleSelectedPaper } from '@/lib/workspace';

export default function ComparePage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparison, setComparison] = useState('');

  useEffect(() => {
    listPapers().then(setPapers).catch(() => undefined);
    setSelected(getSelectedPaperIds());
  }, []);

  const onToggle = (id: number) => {
    const next = toggleSelectedPaper(id);
    setSelected(next);
    setSelectedPaperIds(next);
  };

  return (
    <DashboardShell>
      <div className="container">
        <div className="card">
          <h2>Compare Papers</h2>
          <p>Select at least two papers and run comparison.</p>
          <button disabled={selected.length < 2} onClick={async () => setComparison((await comparePapers(selected)).comparison_markdown)}>Compare Selected Papers</button>
        </div>

        <div className="card">
          <h3>Selected Papers ({selected.length})</h3>
          <ul style={{ paddingLeft: 18 }}>
            {papers.filter((p) => selected.includes(p.id)).map((p) => <li key={p.id}>{p.title}</li>)}
          </ul>
        </div>

        {comparison ? <div className="card"><StructuredOutput text={comparison} /></div> : null}

        <div className="card">
          <h3>All Papers</h3>
          {papers.map((p) => (
            <div key={p.id} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 10 }}>
              <strong>{p.title}</strong>
              <p style={{ margin: '6px 0' }}>{p.authors}</p>
              <button onClick={() => onToggle(p.id)}>{selected.includes(p.id) ? 'Remove' : 'Select'}</button>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
