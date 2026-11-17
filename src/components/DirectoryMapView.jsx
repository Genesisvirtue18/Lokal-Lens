"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import BusinessCard from "@/components/ds/BusinessCard";
import { businessDetailPath } from "@/lib/directory-data";

const idOf = (business) => String(business._id || business.id || business.slug || business.name);
const pointOf = (business) => {
  const coordinates = business.location?.coordinates;
  return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite) ? [coordinates[1], coordinates[0]] : null;
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Map view: result list on the left, an OpenStreetMap map with one pin per business on the right.
// Hovering a card highlights its pin; clicking a pin opens a popup and scrolls its card into view.
export default function DirectoryMapView({ businesses, emptyState }) {
  const [activeId, setActiveId] = useState("");
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef(new Map());
  const cardRefs = useRef(new Map());

  const mappable = useMemo(() => businesses.map((business) => ({ business, point: pointOf(business) })).filter((item) => item.point), [businesses]);
  const missing = businesses.length - mappable.length;

  function pinIcon(active, approximate) {
    const L = leafletRef.current;
    const size = active ? 38 : 30;
    return L.divIcon({
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(16,17,21,.35));${approximate ? "opacity:.75;" : ""}"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="${active ? "#101115" : "#002fa7"}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>`,
    });
  }

  function drawMarkers() {
    const L = leafletRef.current; const map = mapRef.current;
    if (!L || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    const bounds = [];
    mappable.forEach(({ business, point }) => {
      const id = idOf(business);
      const marker = L.marker(point, { icon: pinIcon(false, business.locationApproximate), title: business.name, riseOnHover: true }).addTo(map);
      const href = business.href || businessDetailPath(business);
      marker.bindPopup(`<div style="min-width:170px;font-family:inherit"><p style="margin:0 0 2px;font-weight:600;font-size:14px;line-height:20px">${escapeHtml(business.name)}</p><p style="margin:0 0 8px;font-size:13px;color:#4a4c55">${escapeHtml([business.category, business.area].filter(Boolean).join(" · "))}${business.locationApproximate ? "<br><em>Approximate location</em>" : ""}</p><a href="${escapeHtml(href)}" style="font-weight:600;font-size:13px;color:#002fa7">View details →</a></div>`);
      marker.on("click", () => { setActiveId(id); cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
      markersRef.current.set(id, marker);
      bounds.push(point);
    });
    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapNode.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapNode.current, { scrollWheelZoom: true, zoomControl: true }).setView([22.5, 79], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
      drawMarkers();
    })();
    const markers = markersRef.current;
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markers.clear(); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { drawMarkers(); }, [mappable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const business = mappable.find((item) => idOf(item.business) === id)?.business;
      marker.setIcon(pinIcon(id === activeId, business?.locationApproximate));
      marker.setZIndexOffset(id === activeId ? 1000 : 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function focus(id) {
    setActiveId(id);
    const marker = markersRef.current.get(id);
    if (marker && mapRef.current) { mapRef.current.panTo(marker.getLatLng(), { animate: true }); }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)]">
      <div className="flex flex-col gap-4 overflow-y-auto pr-1 lg:h-[calc(100vh-9rem)]">
        {businesses.length ? businesses.map((business) => {
          const id = idOf(business);
          return (
            <div key={id} ref={(node) => { if (node) cardRefs.current.set(id, node); else cardRefs.current.delete(id); }} onMouseEnter={() => focus(id)} onFocus={() => focus(id)} className="shrink-0">
              <BusinessCard business={business} layout="grid" selected={activeId === id} className="!h-auto" />
              {!pointOf(business) && <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[13px] text-[#6e7079]"><MapPin size={14} aria-hidden="true" />Map pin not available yet</p>}
            </div>
          );
        }) : emptyState}
      </div>
      <div className="relative min-h-[420px] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-[#e8e7e1] lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)]">
        <div ref={mapNode} className="absolute inset-0 z-0" role="region" aria-label="Map of results" />
        <p className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-white px-3 py-1.5 font-display text-[13px] font-medium shadow">{mappable.length} of {businesses.length} on map{missing > 0 ? ` · ${missing} without a pin` : ""}</p>
      </div>
    </div>
  );
}
