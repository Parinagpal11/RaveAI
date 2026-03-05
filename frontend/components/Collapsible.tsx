'use client';

import { ReactNode, useState } from 'react';

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Collapsible({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button className="ghostBtn" onClick={() => setOpen((v) => !v)}>{title} {open ? '▾' : '▸'}</button>
      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
