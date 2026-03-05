'use client';

import { motion } from 'framer-motion';
import { BarChart3, GitCompare, Lightbulb, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DashboardShell } from '@/components/DashboardShell';
import { setTopic } from '@/lib/workspace';

const features = [
  { title: 'Research Graph', desc: 'Visualize connections between papers', icon: Share2, path: '/graph' },
  { title: 'Literature Review Generator', desc: 'Automatically synthesize research', icon: BarChart3, path: '/review' },
  { title: 'Paper Comparison', desc: 'Compare methods and datasets', icon: GitCompare, path: '/compare' },
  { title: 'Trend Analysis', desc: 'Track emerging research directions', icon: Lightbulb, path: '/trends' },
];

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopicInput] = useState('multi agent systems for llm reasoning');

  return (
    <DashboardShell>
      <main className="hero">
        <h1>Rave</h1>
        <p>AI Co-Researcher for Scientific Discovery</p>

        <div className="card" style={{ maxWidth: 760, margin: '24px auto' }}>
          <input value={topic} onChange={(e) => setTopicInput(e.target.value)} placeholder="Search any research topic, methodology or problem" />
          <button
            className="primaryBtn"
            onClick={() => {
              setTopic(topic);
              router.push(`/search?topic=${encodeURIComponent(topic)}`);
            }}
          >
            Search Papers
          </button>
          <p style={{ color: 'var(--text-2)', marginBottom: 0 }}>Examples: LLM Agents • Drug Discovery • Climate Models • Robotics</p>
        </div>

        <h2 className="sectionTitle">Quick Actions</h2>
        <div className="featureGrid">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="card paperCard"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.24 }}
              >
                <Icon size={18} style={{ color: '#22c55e' }} />
                <h3 className="cardTitle" style={{ marginTop: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-2)' }}>{f.desc}</p>
                <button className="secondaryBtn" onClick={() => router.push(f.path)}>Open</button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </DashboardShell>
  );
}
