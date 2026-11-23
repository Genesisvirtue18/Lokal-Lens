"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Heart, LayoutDashboard, LayoutGrid, LogIn, LogOut, MapPin, Menu, MessageCircleQuestion, Plus, Search, Store, Tag, User, X } from "lucide-react";
import { BarContainer, Button, IconButton, Logo, cx } from "@/components/ds";
import CityField from "@/components/CityField";
import { authedFetch, logout as endSession } from "@/dashboard/api";

// Header: Figma "Brand, header & footer / Header".
//  variant="desktop"  80px bar, logo + primary nav + location selector + Saved + Add Your Business + Sign In
//  variant="compact"  76px bar, logo + inline search + nav + actions (directory, profile)
// Below 1024px it becomes the 64px mobile bar with Search and Menu.
const browseItems = [["Explore businesses", "/directory", "explore", Store], ["Categories", "/categories", "categories", LayoutGrid]];
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
  const items = [...(signedIn ? [[role === "customer" ? "My account" : "Dashboard", dashboardHref(role), "dashboard", LayoutDashboard]] : []), ...browseItems, ...moreItems, ...(signedIn ? [] : [["Sign in", "/login", "login", LogIn]])];
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

function InlineSearch({ query = "", city = "", cities = [] }) {
  return (
    <form action="/directory" method="get" role="search" className="flex h-12 w-full items-center rounded-full border border-[#bdbcb5] bg-white pl-4 pr-3 transition-shadow focus-within:border-[#002fa7] focus-within:ring-2 focus-within:ring-[#002fa7]/20">
      <button type="submit" aria-label="Search" className="grid shrink-0 place-items-center text-[#6e7079] transition-colors hover:text-[#002fa7]"><Search size={18} aria-hidden="true" /></button>
      <input name="q" defaultValue={query} placeholder="Business or service" aria-label="Business or service" className="ml-[10px] min-w-0 flex-1 bg-transparent text-[16px] leading-6 text-[#101115] outline-none placeholder:text-[#6e7079]" />
      <span className="mx-3 h-5 w-px shrink-0 bg-[#dcdbd5]" aria-hidden="true" />
      <MapPin size={16} className="shrink-0 text-[#002fa7]" aria-hidden="true" />
      <CityField name="city" defaultValue={city} cities={cities} width="clamp(100px, 10vw, 150px)" className="ml-[6px] gap-1" inputClassName="text-[16px] leading-6 text-[#101115]" />
    </form>
  );
}

// One header on every page. Desktop: logo, a centred search with city, then Categories, Add Your Business and Sign in (or the account menu).
// Phone and tablet: the logo and a menu button on top, the same search underneath, and everything else inside the menu.
export default function SiteHeader({ active = "", cities = [], city = "", query = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = useSyncExternalStore(subscribe, readSignedIn, () => false);
  const menuLinks = [...browseItems, ...moreItems].map(([label, href, key]) => [label, href, key]);
  menuLinks.push(signedIn ? ["My account", "/account", "dashboard"] : ["Sign in", "/login", "login"]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#dcdbd5] bg-[#f1f1ee]">
      <BarContainer>
        <div className="flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
          <Link href="/" aria-label="Lokal Lens home" className="shrink-0"><Logo /></Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex"><div className="w-full" style={{ maxWidth: 560 }}><InlineSearch query={query} city={city} cities={cities} /></div></div>

          <nav aria-label="Primary" className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
            <Link href="/categories" aria-current={active === "categories" ? "page" : undefined} className={cx("flex h-10 items-center whitespace-nowrap rounded-[10px] px-3 font-display text-[15px] font-medium leading-5 transition-colors hover:bg-white", active === "categories" ? "text-[#002fa7]" : "text-[#101115]")}>Categories</Link>
            <Button type="secondary" size="s" href="/add-business" icon={<Plus size={18} aria-hidden="true" />}>Add Your Business</Button>
            {signedIn ? <MoreMenu active={active} signedIn={signedIn} /> : <Button type="primary" size="s" href="/login">Sign in</Button>}
          </nav>

          <div className="ml-auto flex items-center lg:hidden">
            <IconButton label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} className="border-transparent bg-transparent" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</IconButton>
          </div>
        </div>

        <div className="pb-3 lg:hidden"><InlineSearch query={query} city={city} cities={cities} /></div>
      </BarContainer>

      {menuOpen && (
        <div className="border-t border-[#dcdbd5] bg-[#f1f1ee] lg:hidden">
          <BarContainer className="flex flex-col gap-1 py-3">
            {menuLinks.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center border-b border-[#ecebe7] font-display text-[16px] font-medium text-[#101115] last:border-0">{label}</Link>)}
            <div className="pt-3"><Button type="primary" size="m" href="/add-business" className="w-full" icon={<Plus size={18} aria-hidden="true" />}>Add Your Business</Button></div>
          </BarContainer>
        </div>
      )}
    </header>
  );
}
