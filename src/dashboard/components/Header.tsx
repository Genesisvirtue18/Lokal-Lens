import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, LogOut, Plus } from 'lucide-react';
import { Button, Logo } from '@/components/ds';
import { UserRole } from '../types';

interface HeaderProps {
  role: UserRole;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  onOpenProfileMenu?: () => void;
  onOpenMobileMenu?: () => void;
  onLogout: () => void;
  onAddBusiness?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onOpenSearch,
  onOpenMobileMenu,
  onLogout,
  onAddBusiness,
}) => {
  if (role === 'owner') return (
    <header className="sticky top-0 z-40 border-b border-[#dcdbd5] bg-[#f1f1ee] lg:hidden">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 md:px-8 lg:h-20 lg:px-12">
        <Link href="/" aria-label="Lokal Lens home" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {[['Explore Businesses', '/directory'], ['Categories', '/categories'], ['How It Works', '/#how-it-works']].map(([label, href]) => <Link key={href} href={href} className="font-display text-[15px] font-medium text-[#101115] hover:text-[#002fa7]">{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/saved" className="hidden h-11 items-center gap-1.5 px-2 font-display text-[15px] font-medium hover:text-[#002fa7] sm:inline-flex"><Heart size={20} aria-hidden="true" />Saved</Link>
          <Button type="secondary" size="s" onClick={onAddBusiness} icon={<Plus size={18} aria-hidden="true" />}><span className="hidden sm:inline">Add Your Business</span></Button>
          <Button type="ghost" size="s" onClick={onLogout} icon={<LogOut size={18} aria-hidden="true" />}>Log out</Button>
        </div>
      </div>
    </header>
  );

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-6 h-20 sticky top-0 z-40 bg-[#f1f1ee]/95 backdrop-blur border-b border-[#dcdbd5]">
      <div className="flex items-center gap-2 sm:gap-3">
        {role === 'admin' && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open Navigation"
            className="p-1.5 rounded-xl hover:bg-white transition-colors duration-150 active:scale-95 text-[#002fa7] md:hidden"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}

        <Image src="/images/lokal-lens-figma.svg" alt="Lokal Lens" width={230} height={40} className="h-auto w-36 sm:w-44 md:hidden" />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-[#4a4c55] hover:bg-white" aria-label="Log out">
          <span className="material-symbols-outlined text-[20px]">logout</span><span>Log out</span>
        </button>
        <button
          onClick={onOpenSearch}
          aria-label="Search listings"
          className="p-2 rounded-xl text-[#4a4c55] hover:bg-white transition-colors duration-150 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        <div className="ml-1 flex items-center border-l border-[#dcdbd5] pl-2">
          <div title="Administrator" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8edfb] font-display text-[13px] font-bold text-[#002fa7] ring-1 ring-[#dcdbd5]">AD</div>
        </div>
      </div>
    </header>
  );
};
