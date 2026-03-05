'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Folder, GitCompare, Home, Search, Share2, TrendingUp } from 'lucide-react';

const navSections = [
  {
    title: 'Navigation',
    items: [
      { href: '/', label: 'Home', icon: Home },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/graph', label: 'Research Graph', icon: Share2 },
      { href: '/compare', label: 'Compare Papers', icon: GitCompare },
    ],
  },
  {
    title: 'Research Tools',
    items: [
      { href: '/review', label: 'Literature Review', icon: FileText },
      { href: '/trends', label: 'Trend Analysis', icon: TrendingUp },
    ],
  },
  {
    title: 'Workspace',
    items: [{ href: '/workspace', label: 'Workspace', icon: Folder }],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">Rave</div>
      {navSections.map((section) => (
        <div key={section.title} className="navSection">
          <div className="navSectionTitle">{section.title}</div>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`navItem ${active ? 'active' : ''}`}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
