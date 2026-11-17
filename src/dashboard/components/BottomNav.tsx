import React from 'react';
import { UserRole, OwnerTab, AdminTab } from '../types';

interface BottomNavProps {
  role: UserRole;
  ownerTab: OwnerTab;
  adminTab: AdminTab;
  onSelectOwnerTab: (tab: OwnerTab) => void;
  onSelectAdminTab: (tab: AdminTab) => void;
  leadsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  ownerTab,
  adminTab,
  onSelectOwnerTab,
  onSelectAdminTab,
  leadsCount,
}) => {
  if (role === 'owner') {
    return (
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-1.5 bg-[#ffffff] border-t border-[#dcdbd5] shadow-md md:hidden">
        {/* Tab 1: My Business */}
        <button
          onClick={() => onSelectOwnerTab('business')}
          className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-150 cursor-pointer ${
            ownerTab === 'business'
              ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
              : 'text-[#4a4c55] hover:text-[#002fa7]'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={ownerTab === 'business' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            storefront
          </span>
          <span className="text-[12px] mt-0.5">My Business</span>
        </button>

        {/* Tab 2: Leads */}
        <button
          onClick={() => onSelectOwnerTab('leads')}
          className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl relative transition-all duration-150 cursor-pointer ${
            ownerTab === 'leads'
              ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
              : 'text-[#4a4c55] hover:text-[#002fa7]'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={ownerTab === 'leads' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            contact_mail
          </span>
          {leadsCount > 0 && (
            <span className="absolute top-0.5 right-2 w-4 h-4 bg-[#002fa7] text-white text-[12px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {leadsCount}
            </span>
          )}
          <span className="text-[12px] mt-0.5">Leads</span>
        </button>


        {/* Tab 4: Analytics */}
        <button
          onClick={() => onSelectOwnerTab('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-150 cursor-pointer ${
            ownerTab === 'analytics'
              ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
              : 'text-[#4a4c55] hover:text-[#002fa7]'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={ownerTab === 'analytics' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            analytics
          </span>
          <span className="text-[12px] mt-0.5">Analytics</span>
        </button>

        {/* Tab 5: Settings */}
        <button
          onClick={() => onSelectOwnerTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition-all duration-150 cursor-pointer ${
            ownerTab === 'settings'
              ? 'bg-[#e8edfb] text-[#002fa7] font-bold'
              : 'text-[#4a4c55] hover:text-[#002fa7]'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={ownerTab === 'settings' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            settings
          </span>
          <span className="text-[12px] mt-0.5">Settings</span>
        </button>
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
