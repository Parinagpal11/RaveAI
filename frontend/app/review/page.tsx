'use client';

import { useEffect, useState } from 'react';

import { DashboardShell } from '@/components/DashboardShell';
import { StructuredOutput } from '@/components/StructuredOutput';
import { generateReview, listPapers, Paper } from '@/lib/api';
import { getSelectedPaperIds, getTopic } from '@/lib/workspace';

export default function ReviewPage() {
  const [topic, setTopic] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [review, setReview] = useState('');

  useEffect(() => {
    setTopic(getTopic('research topic'));
    setSelected(getSelectedPaperIds());
    listPapers().then(setPapers).catch(() => undefined);
  }, []);

  return (
    <DashboardShell>
      <div className="container">
        <div className="card">
          <h2>Literature Review</h2>
          <p>Topic: {topic}</p>
          <p>Selected papers: {selected.length}</p>
          <button disabled={!selected.length} onClick={async () => setReview((await generateReview(topic, selected)).review)}>Generate Literature Review</button>
        </div>

        <div className="card">
          <h3>Papers Included</h3>
          <ul style={{ paddingLeft: 18 }}>
            {papers.filter((p) => selected.includes(p.id)).map((p) => <li key={p.id}>{p.title}</li>)}
          </ul>
        </div>

        {review ? <div className="card"><StructuredOutput text={review} /></div> : null}
      </div>
    </DashboardShell>
  );
}
