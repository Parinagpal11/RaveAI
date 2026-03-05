'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, GitCompare, Lightbulb, Share2 } from 'lucide-react';

const actions = [
  { href: '/review', label: 'Generate Literature Review', icon: FileText },
  { href: '/compare', label: 'Compare Papers', icon: GitCompare },
  { href: '/trends', label: 'Find Research Gap', icon: Lightbulb },
  { href: '/graph', label: 'Open Research Graph', icon: Share2 },
];

export function ActionMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fabWrap">
      {open ? (
        <div className="fabMenu card">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} className="fabLink">
                <Icon size={14} style={{ marginRight: 8 }} />
                {a.label}
              </Link>
            );
          })}
        </div>
      ) : null}
      <button className="fab primaryBtn" onClick={() => setOpen((v) => !v)}>+ Actions</button>
    </div>
  );
}
