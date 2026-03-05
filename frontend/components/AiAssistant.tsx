'use client';

import { MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';

import { ask } from '@/lib/api';

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('What are the main datasets used in this topic?');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const data = await ask(question);
      setAnswer(data.answer || 'No answer generated.');
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : 'Failed to get response.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistantWrap">
      {open ? (
        <div className="assistantPanel card">
          <h4 style={{ marginTop: 0 }}>Ask Rave AI</h4>
          <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a research question..." />
          <button className="primaryBtn" disabled={loading} onClick={run}><Send size={14} /> Ask</button>
          {answer ? <div className="assistantAnswer">{answer}</div> : null}
        </div>
      ) : null}
      <button className="assistantFab primaryBtn" onClick={() => setOpen((v) => !v)}>
        <MessageCircle size={16} /> Ask Rave AI
      </button>
    </div>
  );
}
