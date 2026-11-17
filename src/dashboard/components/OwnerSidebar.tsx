import React from 'react';
import Link from 'next/link';
import { BarChart3, LayoutDashboard, LogOut, MessageSquare, Plus, Search, Settings, Star, Tag } from 'lucide-react';
import { Logo, cx } from '@/components/ds';
import { OwnerTab } from '../types';

interface OwnerSidebarProps {
  active: OwnerTab;
  onSelect: (tab: OwnerTab) => void;
  newLeads: number;
  reviewCount: number;
  onAddBusiness: () => void;
  onLogout: () => void;
}

// Left navigation of the owner dashboard (desktop). Phones use the bottom bar instead.
export const OwnerSidebar: React.FC<OwnerSidebarProps> = ({ active, onSelect, newLeads, reviewCount, onAddBusiness, onLogout }) => {
  const items: { id: OwnerTab; label: string; icon: React.ComponentType<{ size?: number }>; badge?: number }[] = [
    { id: 'business', label: 'Overview', icon: LayoutDashboard },
    { id: 'leads', label: 'Inquiries', icon: MessageSquare, badge: newLeads },
    { id: 'reviews', label: 'Reviews', icon: Star, badge: reviewCount },
    { id: 'offers', label: 'Offers', icon: Tag },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Account settings', icon: Settings },
  ];
  const linkClass = 'flex h-11 items-center gap-3 rounded-[10px] px-3 font-display text-[15px] font-medium text-[#4a4c55] transition-colors hover:bg-[#f1f1ee] hover:text-[#101115]';
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-[#dcdbd5] bg-white lg:flex" aria-label="Owner navigation">
      <div className="flex h-16 shrink-0 items-center border-b border-[#dcdbd5] px-5"><Link href="/" aria-label="Lokal Lens home"><Logo /></Link></div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-1 pt-2 font-eyebrow text-[#6e7079]">Manage</p>
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} type="button" onClick={() => onSelect(id)} aria-current={active === id ? 'page' : undefined} className={cx('flex h-11 items-center gap-3 rounded-[10px] px-3 text-left font-display text-[15px] font-medium transition-colors', active === id ? 'bg-[#e6ebf7] text-[#002fa7]' : 'text-[#4a4c55] hover:bg-[#f1f1ee] hover:text-[#101115]')}>
            <Icon size={20} />
            <span className="flex-1">{label}</span>
            {badge ? <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold', id === 'leads' ? 'bg-[#002fa7] text-white' : 'bg-[#e4e3de] text-[#4a4c55]')}>{badge}</span> : null}
          </button>
        ))}
        <p className="px-3 pb-1 pt-5 font-eyebrow text-[#6e7079]">Quick actions</p>
        <button type="button" onClick={onAddBusiness} aria-current={active === 'form' ? 'page' : undefined} className={cx(linkClass, 'text-left', active === 'form' && 'bg-[#e6ebf7] text-[#002fa7]')}><Plus size={20} />Add a business</button>
        <Link href="/directory" className={linkClass}><Search size={20} />Browse directory</Link>
      </nav>
      <div className="shrink-0 border-t border-[#dcdbd5] p-3">
        <button type="button" onClick={onLogout} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#f1c9c4] bg-[#fff6f5] font-display text-[15px] font-semibold text-[#b42318] transition-colors hover:bg-[#fde8e5]"><LogOut size={20} />Log out</button>
      </div>
    </aside>
  );
};
