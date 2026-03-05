'use client';

import { motion } from 'framer-motion';
import { BookMarked, Copy, ExternalLink, Sparkles } from 'lucide-react';

import { Paper } from '@/lib/api';

type Props = {
  paper: Paper;
  selected: boolean;
  onToggle: (paperId: number) => void;
  onSummarize?: (paperId: number) => void;
};

function parseMeta(summary: string) {
  const out: Record<string, string> = {};
  for (const part of (summary || '').split('|')) {
    const p = part.trim();
    if (!p.includes('=')) continue;
    const i = p.indexOf('=');
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    out[k.trim().toLowerCase()] = v.trim();
  }
  return out;
}

function truncate(text: string, max = 180) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

export function PaperCard({ paper, selected, onToggle, onSummarize }: Props) {
  const meta = parseMeta(paper.summary);
  const year = meta.year || 'Unknown';
  const citations = (meta.semantic_scholar || '').match(/citations=(\d+)/)?.[1] || '0';
  const abstractPreview = truncate(paper.abstract, 220);

  return (
    <motion.div className="card paperCard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 className="cardTitle">{paper.title}</h3>
          <p style={{ margin: '0 0 8px', color: 'var(--text-2)', fontSize: 13 }}>
            {paper.topic || 'General'} • {year} • {citations} citations
          </p>
        </div>
        <span className="pill">{paper.topic || 'Research'}</span>
      </div>

      <p style={{ margin: '8px 0' }}><strong>Authors</strong><br />{paper.authors || 'Unknown'}</p>
      <p style={{ margin: '8px 0' }}><strong>Summary</strong><br />{abstractPreview}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="pill">AI</span>
        <span className="pill">Research</span>
        <span className="pill">{(paper.topic || 'General').split(' ')[0]}</span>
      </div>

      <div>
        <button className="secondaryBtn"><ExternalLink size={14} /> Open Paper</button>
        {onSummarize ? <button className="secondaryBtn" onClick={() => onSummarize(paper.id)}><Sparkles size={14} /> AI Summary</button> : null}
        <button className={selected ? 'dangerBtn' : 'primaryBtn'} onClick={() => onToggle(paper.id)}>
          <BookMarked size={14} /> {selected ? 'Remove' : 'Add to Workspace'}
        </button>
        <button
          className="secondaryBtn"
          onClick={async () => {
            const citation = `${paper.authors}. ${paper.title}. ${year}.`;
            await navigator.clipboard.writeText(citation);
            alert('Copied citation ✓');
          }}
        >
          <Copy size={14} /> Copy Citation
        </button>
      </div>
    </motion.div>
  );
}
