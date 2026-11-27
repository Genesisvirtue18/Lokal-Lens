"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, LayoutGrid, X } from "lucide-react";
import { optimizedImage } from "@/lib/images";
import { Button, cx } from "@/components/ds";

const columnsFor = (width) => (width < 640 ? 2 : width < 1024 ? 3 : 4);

// Full-screen viewer: one photo at a time with arrows, keys, swipe and a strip of thumbnails; or every photo at once in a grid.
function Lightbox({ photos, name, start = 0, startMode = "viewer", onClose }) {
  const [index, setIndex] = useState(start);
  const [mode, setMode] = useState(startMode);
  const [columns, setColumns] = useState(3);
  const swipe = useRef(null);
  const strip = useRef(null);

  const go = useCallback((step) => setIndex((current) => (current + step + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const key = (event) => {
      if (event.key === "Escape") onClose();
      else if (mode === "viewer" && event.key === "ArrowRight") go(1);
      else if (mode === "viewer" && event.key === "ArrowLeft") go(-1);
    };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = before; document.removeEventListener("keydown", key); };
  }, [go, mode, onClose]);

  useEffect(() => {
    const apply = () => setColumns(columnsFor(window.innerWidth));
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => { strip.current?.querySelector(`[data-thumb="${index}"]`)?.scrollIntoView({ inline: "center", block: "nearest" }); }, [index, mode]);

  const barButton = "grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20";

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", background: "rgba(16,17,21,.97)" }}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="font-display text-[15px] font-medium">{mode === "viewer" ? `${index + 1} / ${photos.length}` : `All photos (${photos.length})`}</p>
        <div className="flex items-center gap-2">
          {mode === "viewer"
            ? <button type="button" onClick={() => setMode("grid")} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 font-display text-[14px] font-medium text-white hover:bg-white/20"><LayoutGrid size={16} aria-hidden="true" />View all</button>
            : null}
          <button type="button" onClick={onClose} aria-label="Close photos" className={barButton}><X size={20} aria-hidden="true" /></button>
        </div>
      </div>

      {mode === "viewer" ? (
        <>
          <div className="relative min-h-0 flex-1" style={{ touchAction: "pan-y" }}
            onPointerDown={(event) => { swipe.current = event.clientX; }}
            onPointerUp={(event) => { if (swipe.current === null) return; const moved = event.clientX - swipe.current; swipe.current = null; if (Math.abs(moved) > 50) go(moved < 0 ? 1 : -1); }}>
            <Image key={photos[index]} src={optimizedImage(photos[index], 1800)} alt={`${name} photo ${index + 1}`} fill unoptimized sizes="100vw" className="select-none object-contain" draggable={false} />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={cx(barButton, "absolute left-3 top-1/2 -translate-y-1/2")}><ChevronLeft size={22} aria-hidden="true" /></button>
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className={cx(barButton, "absolute right-3 top-1/2 -translate-y-1/2")}><ChevronRight size={22} aria-hidden="true" /></button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div ref={strip} className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
              {photos.map((photo, position) => (
                <button key={`${photo}-${position}`} type="button" data-thumb={position} onClick={() => setIndex(position)} aria-label={`Show photo ${position + 1}`} aria-current={position === index}
                  className={cx("relative h-14 w-[72px] shrink-0 overflow-hidden rounded-[8px] border-2 bg-[#2a2c33] transition-opacity", position === index ? "border-white opacity-100" : "border-transparent opacity-60 hover:opacity-100")}>
                  <Image src={optimizedImage(photo, 160)} alt="" fill unoptimized loading="lazy" sizes="72px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12, maxWidth: 1240, margin: "0 auto" }}>
            {photos.map((photo, position) => (
              <button key={`${photo}-${position}`} type="button" onClick={() => { setIndex(position); setMode("viewer"); }} aria-label={`Open photo ${position + 1}`} className="relative block overflow-hidden rounded-[12px] bg-[#2a2c33]" style={{ aspectRatio: "4 / 3" }}>
                <Image src={optimizedImage(photo, 600)} alt={`${name} photo ${position + 1}`} fill unoptimized loading="lazy" sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-300 hover:scale-[1.04]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The photos at the top of a business page: exactly the old layout, but a click opens the viewer (arrows, swipe, all photos) instead of a new tab. */
export function PhotoHero({ photos, name, photoCount }) {
  const [view, setView] = useState(null);
  const thumbs = photos.slice(1, 5);
  const open = (start, startMode = "viewer") => setView({ start, startMode });
  const total = Math.max(Number(photoCount) || 0, photos.length);
  return (
    <>
      <div className="grid gap-3 lg:h-[460px] lg:grid-cols-[minmax(0,1fr)_480px]">
        <button type="button" onClick={() => open(0)} className="relative block h-[260px] overflow-hidden rounded-[16px] bg-[#e4e3de] sm:h-[360px] lg:h-full" aria-label="Open main photo">
          <Image src={optimizedImage(photos[0], 1200)} alt={`${name} main photo`} fill priority fetchPriority="high" unoptimized sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
          {photos.length > 1 && <span className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#bdbcb5] bg-white px-3 font-display text-[13px] font-medium lg:hidden"><ImageIcon size={16} aria-hidden="true" />{photos.length} photos</span>}
        </button>
        {thumbs.length > 0 && (
          <div className="hidden grid-cols-2 grid-rows-2 gap-3 lg:grid">
            {[0, 1, 2, 3].map((index) => {
              const photo = thumbs[index];
              const last = index === 3;
              const showAll = last && total > 5;
              return photo ? (
                <button type="button" key={photo} onClick={() => open(showAll ? 0 : index + 1, showAll ? "grid" : "viewer")} className="relative block overflow-hidden rounded-[16px] bg-[#e4e3de]" aria-label={showAll ? `View all ${total} photos` : `Open photo ${index + 2}`}>
                  <Image src={optimizedImage(photo, 600)} alt={`${name} photo ${index + 2}`} fill unoptimized loading="lazy" sizes="240px" className="object-cover transition duration-500 hover:scale-[1.03]" />
                  {showAll && <span className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#bdbcb5] bg-white px-4 font-display text-[14px] font-medium"><ImageIcon size={18} aria-hidden="true" />All {total} photos</span>}
                </button>
              ) : <div key={index} className="rounded-[16px] bg-[#e4e3de]" aria-hidden="true" />;
            })}
          </div>
        )}
      </div>
      {view && <Lightbox photos={photos} name={name} start={view.start} startMode={view.startMode} onClose={() => setView(null)} />}
    </>
  );
}

/** The "Photos" section lower on the page: the same grid as before; a click opens the viewer and "View all" opens every photo. */
export function PhotoGrid({ photos, name, total }) {
  const [view, setView] = useState(null);
  const count = Math.max(Number(total) || 0, photos.length);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.slice(0, 8).map((photo, index) => (
          <button type="button" key={`${photo}-${index}`} onClick={() => setView({ start: index, startMode: "viewer" })} className="relative block h-40 overflow-hidden rounded-[12px] bg-[#e4e3de]" aria-label={`Open photo ${index + 1}`}>
            <Image src={photo} alt={`${name} photo ${index + 1}`} fill unoptimized sizes="25vw" className="object-cover transition duration-500 hover:scale-[1.03]" />
          </button>
        ))}
      </div>
      {photos.length > 8 && <div><Button type="secondary" onClick={() => setView({ start: 0, startMode: "grid" })}>View all {count} photos</Button></div>}
      {view && <Lightbox photos={photos} name={name} start={view.start} startMode={view.startMode} onClose={() => setView(null)} />}
    </>
  );
}
