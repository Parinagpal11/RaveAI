'use client';

import { Bell, Search, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TopHeader() {
  const [q, setQ] = useState('');
  const router = useRouter();

  return (
    <header className="topHeader card">
      <div className="topHeaderLeft">
        <div className="logoBadge">🔬</div>
        <div>
          <div className="topTitle">Rave</div>
          <div className="topSubtitle">AI Co-Researcher</div>
        </div>
      </div>

      <div className="globalSearch">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search papers..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && q.trim()) router.push(`/search?topic=${encodeURIComponent(q.trim())}`);
          }}
        />
      </div>

      <div className="topActions">
        <button className="iconBtn secondaryBtn" aria-label="Notifications"><Bell size={16} /></button>
        <button className="iconBtn secondaryBtn" aria-label="Profile"><UserCircle2 size={16} /></button>
      </div>
    </header>
  );
}
