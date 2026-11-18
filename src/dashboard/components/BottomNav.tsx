import React from 'react';
import { BarChart3, LayoutGrid, MessageSquare, Settings, Star, Tag } from 'lucide-react';
import { UserRole, OwnerTab, AdminTab } from '../types';

interface BottomNavProps {
  role: UserRole;
  ownerTab: OwnerTab;
  adminTab: AdminTab;
  onSelectOwnerTab: (tab: OwnerTab) => void;
  onSelectAdminTab: (tab: AdminTab) => void;
  leadsCount?: number;
  newLeads?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  ownerTab,
  adminTab,
  onSelectOwnerTab,
  onSelectAdminTab,
  newLeads = 0,
}) => {
  if (role === 'owner') {
    const items: { id: OwnerTab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; badge?: number }[] = [
      { id: 'business', label: 'Overview', icon: LayoutGrid },
      { id: 'leads', label: 'Inquiries', icon: MessageSquare, badge: newLeads },
      { id: 'reviews', label: 'Reviews', icon: Star },
      { id: 'offers', label: 'Offers', icon: Tag },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'settings', label: 'Account', icon: Settings },
    ];
    return (
      <nav aria-label="Owner sections" className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-6 border-t border-[#dcdbd5] bg-white px-1 pb-[max(4px,env(safe-area-inset-bottom))] pt-1 shadow-md md:hidden">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const active = ownerTab === id || (id === 'business' && ownerTab === 'form');
          return (
            <button key={id} type="button" onClick={() => onSelectOwnerTab(id)} aria-current={active ? 'page' : undefined} className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] text-[11px] font-medium leading-4 transition-colors ${active ? 'bg-[#e8edfb] text-[#002fa7]' : 'text-[#4a4c55]'}`}>
              <span className="relative"><Icon size={20} strokeWidth={active ? 2.4 : 2} />{badge ? <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#002fa7] px-1 text-[10px] font-semibold text-white">{badge}</span> : null}</span>
              {label}
            </button>
          );
        })}
      </nav>
    );
  }

  // Admin Role Bottom Navigation
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-1.5 bg-[#ffffff] border-t border-[#dcdbd5] shadow-md md:hidden">
      {/* Tab 1: Overview */}
      <button
        onClick={() => onSelectAdminTab('overview')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
          adminTab === 'overview'
            ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
            : 'text-[#4a4c55] hover:text-[#002fa7]'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={adminTab === 'overview' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          dashboard
        </span>
        <span className="text-[12px] mt-0.5">Overview</span>
      </button>

      {/* Tab 2: Businesses */}
      <button
        onClick={() => onSelectAdminTab('businesses')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
          adminTab === 'businesses'
            ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
            : 'text-[#4a4c55] hover:text-[#002fa7]'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={adminTab === 'businesses' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          storefront
        </span>
        <span className="text-[12px] mt-0.5">Businesses</span>
      </button>

      {/* Tab 3: Leads */}
      <button
        onClick={() => onSelectAdminTab('leads')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
          adminTab === 'leads'
            ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
            : 'text-[#4a4c55] hover:text-[#002fa7]'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={adminTab === 'leads' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          contact_mail
        </span>
        <span className="text-[12px] mt-0.5">Leads</span>
      </button>


      {/* Tab 5: More */}
      <button
        onClick={() => onSelectAdminTab('more')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 cursor-pointer ${
          adminTab === 'more'
            ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
            : 'text-[#4a4c55] hover:text-[#002fa7]'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={adminTab === 'more' ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          more_horiz
        </span>
        <span className="text-[12px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
