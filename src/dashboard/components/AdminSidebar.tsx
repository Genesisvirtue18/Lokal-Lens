import React from 'react';
import Link from 'next/link';
import { ClipboardList, Flag, History, LayoutDashboard, LogOut, MessageSquare, Search, Shapes, Star, Store, Users } from 'lucide-react';
import { Logo, cx } from '@/components/ds';
import { AdminTab } from '../types';

export const adminNavItems: { id: AdminTab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'businesses', label: 'Businesses', icon: Store },
  { id: 'people', label: 'People', icon: Users },
  { id: 'reports', label: 'Reports & claims', icon: Flag },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'leads', label: 'Inquiries', icon: MessageSquare },
  { id: 'categories', label: 'Categories', icon: Shapes },
  { id: 'activity', label: 'Activity', icon: History },
];

interface Props { active: AdminTab; onSelect: (tab: AdminTab) => void; waiting: number; reports?: number; onLogout: () => void }

// Left navigation of the admin workspace (desktop). Phones use the bottom bar.
export const AdminSidebar: React.FC<Props> = ({ active, onSelect, waiting, reports = 0, onLogout }) => (
  <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[#dcdbd5] bg-white md:flex" aria-label="Admin navigation">
    <div className="flex h-16 shrink-0 flex-col justify-center border-b border-[#dcdbd5] px-5"><Link href="/" aria-label="Lokal Lens home"><Logo /></Link></div>
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      <p className="px-3 pb-1 pt-2 font-eyebrow text-[#6e7079]">Admin workspace</p>
      {adminNavItems.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onSelect(id)} aria-current={active === id ? 'page' : undefined} className={cx('flex h-11 items-center gap-3 rounded-[10px] px-3 text-left font-display text-[15px] font-medium transition-colors', active === id ? 'bg-[#e6ebf7] text-[#002fa7]' : 'text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]')}>
          <Icon size={20} />
          <span className="flex-1">{label}</span>
          {id === 'businesses' && waiting > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#002fa7] px-1.5 text-[12px] font-semibold text-white" title="Waiting for approval">{waiting}</span> : null}
          {id === 'reports' && reports > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#b42318] px-1.5 text-[12px] font-semibold text-white" title="Reports and claims waiting">{reports}</span> : null}
        </button>
      ))}
      <p className="px-3 pb-1 pt-5 font-eyebrow text-[#6e7079]">Shortcuts</p>
      <Link href="/directory" className="flex h-11 items-center gap-3 rounded-[10px] px-3 font-display text-[15px] font-medium text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]"><Search size={20} />Browse directory</Link>
      <Link href="/" className="flex h-11 items-center gap-3 rounded-[10px] px-3 font-display text-[15px] font-medium text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]"><ClipboardList size={20} />View the site</Link>
    </nav>
    <div className="shrink-0 border-t border-[#dcdbd5] p-3">
      <button type="button" onClick={onLogout} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#f1c9c4] bg-[#fff6f5] font-display text-[15px] font-semibold text-[#b42318] transition-colors hover:bg-[#fde8e5]"><LogOut size={20} />Log out</button>
    </div>
  </aside>
);
