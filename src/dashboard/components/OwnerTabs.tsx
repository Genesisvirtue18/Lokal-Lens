import React from 'react';
import { cx } from '@/components/ds';
import { OwnerTab } from '../types';

// Tabs for the owner area on desktop (phones use the bottom bar). Shows how many inquiries are still new.
export const OwnerTabs: React.FC<{ active: OwnerTab; onSelect: (tab: OwnerTab) => void; newLeads: number; reviewCount: number }> = ({ active, onSelect, newLeads, reviewCount }) => {
  const tabs: { id: OwnerTab; label: string; badge?: number }[] = [
    { id: 'business', label: 'My listings' },
    { id: 'leads', label: 'Inquiries', badge: newLeads },
    { id: 'reviews', label: 'Reviews', badge: reviewCount },
    { id: 'offers', label: 'Offers' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Account' },
  ];
  return (
    <div className="hidden border-b border-[#dcdbd5] bg-[#f1f1ee] md:block lg:hidden">
      <nav aria-label="Owner tabs" className="mx-auto flex max-w-[1440px] gap-7 px-8 lg:px-12 xl:px-[72px]">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)} aria-current={active === tab.id ? 'page' : undefined} className={cx('flex items-center gap-2 border-b-[3px] py-3.5 font-display text-[15px] font-medium transition-colors', active === tab.id ? 'border-[#002fa7] text-[#002fa7]' : 'border-transparent text-[#4a4c55] hover:text-[#101115]')}>
            {tab.label}
            {tab.badge ? <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold', tab.id === 'leads' ? 'bg-[#002fa7] text-white' : 'bg-[#e4e3de] text-[#4a4c55]')}>{tab.badge}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
};
