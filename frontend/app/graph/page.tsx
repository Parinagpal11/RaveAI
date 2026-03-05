'use client';

import { useEffect, useMemo, useState } from 'react';

import { Collapsible } from '@/components/Collapsible';
import { DashboardShell } from '@/components/DashboardShell';
import { GraphView } from '@/components/GraphView';
import { StructuredOutput } from '@/components/StructuredOutput';
import { ask, getGraph, GraphData, GraphNode, listPapers, Paper } from '@/lib/api';
import { getSelectedPaperIds, getTopic } from '@/lib/workspace';

const relations = ['similar_topic', 'similar_methodology', 'same_dataset', 'semantic_similarity'];

export default function GraphPage() {
  const [topic, setTopic] = useState('');
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [tab, setTab] = useState<'summary' | 'methods' | 'citations' | 'askai'>('summary');
  const [question, setQuestion] = useState('What is the key value of this paper?');
  const [aiAnswer, setAiAnswer] = useState('');
  const [year, setYear] = useState(0);
  const [maxNodes, setMaxNodes] = useState(18);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [relationFilter, setRelationFilter] = useState<Record<string, boolean>>({
    similar_topic: true,
    similar_methodology: true,
    same_dataset: true,
    semantic_similarity: false,
  });

  useEffect(() => {
    setTopic(getTopic('multi agent systems for llm reasoning'));
    listPapers().then(setPapers).catch(() => undefined);
  }, []);

  const selectedWorkspacePapers = useMemo(() => {
    const ids = getSelectedPaperIds();
    return papers.filter((p) => ids.includes(p.id));
  }, [papers]);

  async function build() {
    const data = await getGraph(topic);
    setGraph(data);
    setYear(data.meta.max_year || 0);
  }

  async function askNode() {
    if (!selectedNode) return;
    const pid = Number((selectedNode.id || '').split(':')[1]);
    if (!pid) return;
    const data = await ask(question, [pid]);
    setAiAnswer(data.answer || 'No answer');
  }

  return (
    <DashboardShell>
      <div className="container grid2">
        <div>
          <div className="card">
            <h2 className="sectionTitle">Research Graph</h2>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
            <button className="primaryBtn" onClick={build}>Build Graph</button>
            {graph ? <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>{graph.meta.title}</p> : null}
          </div>

          <Collapsible title="Filters" defaultOpen={true}>
            {graph && graph.meta.min_year && graph.meta.max_year ? (
              <>
                <p style={{ marginBottom: 6, color: 'var(--text-2)' }}>Timeline up to year <strong style={{ color: 'var(--text)' }}>{year || graph.meta.max_year}</strong></p>
                <input
                  type="range"
                  min={graph.meta.min_year}
                  max={graph.meta.max_year}
                  value={year || graph.meta.max_year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </>
            ) : null}
            <p style={{ marginBottom: 6, color: 'var(--text-2)' }}>Max visible nodes: <strong style={{ color: 'var(--text)' }}>{maxNodes}</strong></p>
            <input type="range" min={8} max={40} value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {relations.map((r) => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)' }}>
                  <input
                    type="checkbox"
                    checked={!!relationFilter[r]}
                    onChange={(e) => setRelationFilter((p) => ({ ...p, [r]: e.target.checked }))}
                  />
                  {r.replace('_', ' ')}
                </label>
              ))}
            </div>
          </Collapsible>

          {graph ? (
            <GraphView
              graph={graph}
              maxNodes={maxNodes}
              relationFilter={relationFilter}
              yearLimit={year}
              onSelectNode={setSelectedNode}
            />
          ) : (
            <div className="card"><p style={{ color: 'var(--text-2)' }}>Build graph to view the research landscape.</p></div>
          )}
        </div>

        <div>
          <Collapsible title="Insights" defaultOpen={true}>
            {graph ? (
              <>
                <p><strong>Main Themes</strong></p>
                <ul style={{ paddingLeft: 18 }}>{graph.insights.main_themes.map((x) => <li key={x}>{x}</li>)}</ul>
                <p><strong>Emerging Direction</strong></p>
                <p style={{ color: 'var(--text-2)' }}>{graph.insights.emerging_direction}</p>
                <p><strong>Research Gap</strong></p>
                <p style={{ color: 'var(--text-2)' }}>{graph.insights.research_gap}</p>
              </>
            ) : <p style={{ color: 'var(--text-2)' }}>No insights yet.</p>}
          </Collapsible>

          <Collapsible title="Saved Papers" defaultOpen={false}>
            {selectedWorkspacePapers.length ? (
              <ul style={{ paddingLeft: 18 }}>{selectedWorkspacePapers.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
            ) : <p style={{ color: 'var(--text-2)' }}>No saved papers.</p>}
          </Collapsible>

          <div className="card" style={{ borderColor: '#c9d7e4' }}>
            <h3 className="cardTitle">Paper Info Panel</h3>
            {selectedNode ? (
              <>
                <div className="tabs" style={{ marginBottom: 14 }}>
                  <button className={`tabBtn ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>Summary</button>
                  <button className={`tabBtn ${tab === 'methods' ? 'active' : ''}`} onClick={() => setTab('methods')}>Methods</button>
                  <button className={`tabBtn ${tab === 'citations' ? 'active' : ''}`} onClick={() => setTab('citations')}>Citations</button>
                  <button className={`tabBtn ${tab === 'askai' ? 'active' : ''}`} onClick={() => setTab('askai')}>Ask AI</button>
                </div>

                {tab === 'summary' ? (
                  <div className="card" style={{ background: '#f8fbff', marginBottom: 0 }}>
                    <p style={{ marginTop: 0 }}><strong>Title</strong><br />{selectedNode.label}</p>
                    <p><strong>Summary</strong><br /><span style={{ color: 'var(--text-2)' }}>{selectedNode.contribution}</span></p>
                    <p style={{ marginBottom: 0 }}><strong>Year</strong><br />{selectedNode.year || 'Unknown'}</p>
                  </div>
                ) : null}

                {tab === 'methods' ? (
                  <div className="card" style={{ background: '#f8fbff', marginBottom: 0 }}>
                    <p style={{ marginTop: 0 }}><strong>Method</strong><br />{selectedNode.cluster_label || 'Unspecified'}</p>
                    <p style={{ marginBottom: 0 }}><strong>Dataset/Source</strong><br />{selectedNode.source || 'Unknown'}</p>
                  </div>
                ) : null}

                {tab === 'citations' ? (
                  <div className="card" style={{ background: '#f8fbff', marginBottom: 0 }}>
                    <p style={{ marginTop: 0 }}><strong>Citations</strong><br />{selectedNode.citations || 0}</p>
                    <p><strong>Related Papers</strong></p>
                    <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                      {(selectedNode.related_papers || []).slice(0, 6).map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </div>
                ) : null}

                {tab === 'askai' ? (
                  <div className="card" style={{ background: '#f8fbff', marginBottom: 0 }}>
                    <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
                    <button className="primaryBtn" onClick={askNode}>Ask AI</button>
                    {aiAnswer ? <div style={{ marginTop: 10 }}><StructuredOutput text={aiAnswer} /></div> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="emptyState" style={{ marginBottom: 0 }}>
                <p style={{ margin: 0 }}>No paper selected</p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>Click a graph node to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
