"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Heart, LayoutDashboard, LogIn, LogOut, MapPin, Menu, MessageCircleQuestion, Plus, Search, Tag, User, X } from "lucide-react";
import { BarContainer, Button, IconButton, Logo, cx } from "@/components/ds";
import CitySelector from "@/components/CitySelector";
import CityField from "@/components/CityField";
import { authedFetch, logout as endSession } from "@/dashboard/api";

// Header: Figma "Brand, header & footer / Header".
//  variant="desktop"  80px bar, logo + primary nav + location selector + Saved + Add Your Business + Sign In
//  variant="compact"  76px bar, logo + inline search + nav + actions (directory, profile)
// Below 1024px it becomes the 64px mobile bar with Search and Menu.
const navItems = [["Explore Businesses", "/directory", "explore"], ["Categories", "/categories", "categories"]];
const moreItems = [["Offers near you", "/offers", "offers", Tag], ["Ask Lokal", "/ask", "ask", MessageCircleQuestion], ["Saved businesses", "/saved", "saved", Heart]];

const subscribe = (callback) => { window.addEventListener("storage", callback); return () => window.removeEventListener("storage", callback); };
const readSignedIn = () => { try { return Boolean(localStorage.getItem("directflow_access_token")); } catch { return false; } };
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");
const dashboardHref = (role) => role === "customer" ? "/account" : ["admin", "super_admin"].includes(role) ? "/admin" : "/business-owner";
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

// Account / More menu. Signed out: "More" (Saved, Offers, Ask Lokal, Sign in). Signed in: the person's name, with Dashboard and Log out too.
function MoreMenu({ active, signedIn }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const box = useRef(null);
  useEffect(() => {
    if (!signedIn) return undefined;
    let live = true;
    authedFetch(`${apiUrl}/auth/me`).then(async (res) => { if (!res.ok) return; const body = await res.json(); if (live) { setName(body.data?.user?.name || ""); setRole(body.data?.user?.role || ""); } }).catch(() => {});
    return () => { live = false; };
  }, [signedIn]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    const key = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);
  const logout = async () => { try { await endSession(); } catch { /* the local sign-in is cleared anyway */ } window.dispatchEvent(new Event("storage")); window.location.href = "/"; };
  const items = [...(signedIn ? [[role === "customer" ? "My account" : "Dashboard", dashboardHref(role), "dashboard", LayoutDashboard]] : []), ...moreItems, ...(signedIn ? [] : [["Sign in", "/login", "login", LogIn]])];
  const current = items.some(([, , key]) => key === active);
  const first = signedIn ? name.split(/\s+/)[0] : "";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} className={cx("flex h-11 items-center gap-2 rounded-[12px] px-3 font-display text-[15px] font-medium leading-5 transition-colors hover:bg-[#e6ebf7]", open && "bg-[#e6ebf7]", current || open ? "text-[#002fa7]" : "text-[#101115]")}>
        {signedIn && <span className="grid h-7 w-7 place-items-center rounded-full bg-[#002fa7] text-[12px] font-semibold text-white">{name ? initials(name) : <User size={14} aria-hidden="true" />}</span>}
        <span className="max-w-[110px] truncate">{signedIn ? first || "Account" : "More"}</span>
        <ChevronDown size={16} className={cx("transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[52px] z-50 w-[250px] rounded-[16px] border border-[#dcdbd5] bg-white p-2 shadow-[0_8px_24px_rgba(16,17,21,.12)]">
          {signedIn && <div className="px-3 pb-2 pt-1.5"><p className="truncate font-display text-[15px] font-semibold">{name || "Your account"}</p><p className="text-[12px] text-[#6e7079]">Signed in</p></div>}
          {items.map(([label, href, key, Icon]) => <Link key={key} href={href} role="menuitem" onClick={() => setOpen(false)} className={cx("flex h-11 items-center gap-3 rounded-[10px] px-3 font-display text-[14px] font-medium hover:bg-[#f1f1ee]", active === key ? "bg-[#e6ebf7] text-[#002fa7]" : "text-[#101115]")}><Icon size={18} aria-hidden="true" />{label}</Link>)}
          {signedIn && <><div className="my-1 h-px bg-[#ecebe7]" /><button type="button" role="menuitem" onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 font-display text-[14px] font-medium text-[#b42318] hover:bg-[#fff6f5]"><LogOut size={18} aria-hidden="true" />Log out</button></>}
        </div>
      )}
    </div>
  );
}

function NavLink({ href, active, children }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cx("relative flex h-11 items-center whitespace-nowrap px-1 font-display text-[15px] font-medium leading-5 transition-colors", active ? "text-[#002fa7]" : "text-[#101115] hover:text-[#002fa7]")}>
      {children}
      {active && <span className="absolute inset-x-1 bottom-[2px] h-[2px] rounded-full bg-[#002fa7]" />}
    </Link>
  );
}

function InlineSearch({ query = "", city = "", cities = [] }) {
  return (
    <form action="/directory" method="get" role="search" className="flex h-12 w-full max-w-[460px] items-center rounded-[12px] border border-[#bdbcb5] bg-white pl-4 pr-3 focus-within:border-2 focus-within:border-[#002fa7]">
      <button type="submit" aria-label="Search" className="grid shrink-0 place-items-center text-[#6e7079] transition-colors hover:text-[#002fa7]"><Search size={18} aria-hidden="true" /></button>
      <input name="q" defaultValue={query} placeholder="Business or service" aria-label="Business or service" className="ml-[10px] min-w-0 flex-1 bg-transparent text-[16px] leading-6 text-[#101115] outline-none placeholder:text-[#6e7079]" />
      <span className="mx-3 h-6 w-px shrink-0 bg-[#dcdbd5]" aria-hidden="true" />
      <MapPin size={18} className="shrink-0 text-[#002fa7]" aria-hidden="true" />
      <CityField name="city" defaultValue={city} cities={cities} className="ml-[8px] w-[100px] min-[1400px]:w-[116px] 2xl:w-[136px] gap-1" inputClassName="text-[16px] leading-6 text-[#101115]" />
    </form>
  );
}

export default function SiteHeader({ active = "", cities = [], city = "", cityBasePath = "/directory", query = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = useSyncExternalStore(subscribe, readSignedIn, () => false);
  // One header for every page: logo, search with city, primary links, Add Your Business and the account menu.
  const compact = true;

  return (
    <header className="sticky top-0 z-40 overflow-x-clip border-b border-[#dcdbd5] bg-[#f1f1ee]">
      <BarContainer className={cx("flex items-center gap-4 min-[1400px]:gap-6", compact ? "h-16 lg:h-[76px]" : "h-16 lg:h-20")}>
        <Link href="/" aria-label="Lokal Lens home" className="shrink-0"><Logo /></Link>

        {compact && <div className="hidden min-w-0 xl:flex xl:w-[400px] xl:flex-none min-[1400px]:w-[460px] 2xl:w-[520px]"><InlineSearch query={query} city={city} cities={cities} /></div>}

        <nav aria-label="Primary" className={cx("hidden items-center lg:flex", compact ? "gap-4 min-[1400px]:gap-6" : "gap-7")}>
          {navItems.map(([label, href, key]) => <NavLink key={key} href={href} active={active === key}>{label}</NavLink>)}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-2 min-[1400px]:gap-3 lg:flex">
          {!compact && cities.length > 0 && <CitySelector cities={cities} current={city} basePath={cityBasePath} />}
          <Button type="secondary" size="s" href="/add-business" icon={<Plus size={18} aria-hidden="true" />}>Add Your Business</Button>
          <MoreMenu active={active} signedIn={signedIn} />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <IconButton label="Search businesses" className="border-transparent bg-transparent" onClick={() => { window.location.href = "/directory"; }}><Search size={22} aria-hidden="true" /></IconButton>
          <IconButton label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} className="border-transparent bg-transparent" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</IconButton>
        </div>
      </BarContainer>

      {menuOpen && (
        <div className="border-t border-[#dcdbd5] bg-[#f1f1ee] lg:hidden">
          <BarContainer className="flex flex-col gap-1 py-4">
            {cities.length > 0 && <div className="pb-2"><CitySelector cities={cities} current={city} basePath={cityBasePath} className="w-fit" /></div>}
            {[...navItems, ...moreItems.map(([label, href, key]) => [label, href, key]), signedIn ? ["Dashboard", "/business-owner", "dashboard"] : ["Sign in", "/login", "login"]].map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center font-display text-[15px] font-medium text-[#101115]">{label}</Link>)}
            <div className="flex flex-wrap gap-3 pt-3">
              <Button type="secondary" size="s" href="/add-business" icon={<Plus size={18} aria-hidden="true" />}>Add Your Business</Button>
            </div>
          </BarContainer>
        </div>
      )}
    </header>
  );
}
