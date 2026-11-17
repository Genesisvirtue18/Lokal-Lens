"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { businessDetailPath } from "@/lib/directory-data";

const idOf = (business) => String(business._id || business.id || business.slug || business.name);
const pointOf = (business) => {
  const coordinates = business.location?.coordinates;
  return Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite) ? [coordinates[1], coordinates[0]] : null;
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// OpenStreetMap with one pin per business (no API key needed). Used on Ask Lokal.
export default function PinMap({ businesses = [], activeId = "", onSelect, emptyText = "Results will appear on the map." }) {
  const node = useRef(null);
  const mapRef = useRef(null);
  const L = useRef(null);
  const layer = useRef(null);
  const markers = useRef(new Map());
  const pins = businesses.map((business) => ({ business, point: pointOf(business) })).filter((item) => item.point);

  function icon(active, approximate) {
    const size = active ? 38 : 30;
    return L.current.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size], html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(16,17,21,.35));${approximate ? "opacity:.75;" : ""}"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="${active ? "#101115" : "#002fa7"}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>` });
  }

  function draw() {
    if (!L.current || !mapRef.current) return;
    layer.current?.clearLayers(); markers.current.clear();
    const bounds = [];
    pins.forEach(({ business, point }) => {
      const id = idOf(business);
      const marker = L.current.marker(point, { icon: icon(id === activeId, business.locationApproximate), title: business.name }).addTo(layer.current);
      const href = business.href || businessDetailPath(business);
      marker.bindPopup(`<div style="min-width:170px"><p style="margin:0 0 2px;font-weight:600;font-size:14px;line-height:20px">${escapeHtml(business.name)}</p><p style="margin:0 0 8px;font-size:13px;color:#4a4c55">${escapeHtml([business.category, business.area].filter(Boolean).join(" · "))}${business.locationApproximate ? "<br><em>Approximate location</em>" : ""}</p><a href="${escapeHtml(href)}" style="font-weight:600;font-size:13px;color:#002fa7">View details →</a></div>`);
      marker.on("click", () => onSelect?.(id));
      markers.current.set(id, marker);
      bounds.push(point);
    });
    if (bounds.length === 1) mapRef.current.setView(bounds[0], 15);
    else if (bounds.length > 1) mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !node.current || mapRef.current) return;
      L.current = leaflet;
      const map = leaflet.map(node.current).setView([22.5, 79], 5);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      layer.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
      draw();
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { draw(); }, [businesses]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    markers.current.forEach((marker, id) => {
      const item = pins.find((entry) => idOf(entry.business) === id);
      marker.setIcon(icon(id === activeId, item?.business.locationApproximate));
      marker.setZIndexOffset(id === activeId ? 1000 : 0);
    });
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-[16px] bg-[#e8e7e1]">
      <div ref={node} className="absolute inset-0 z-0" role="region" aria-label="Map of results" />
      {pins.length === 0 && (
        <div className="pointer-events-none absolute left-16 right-4 top-4 z-[500] flex items-center gap-2 rounded-[12px] bg-white px-4 py-3 text-[14px] leading-5 text-[#4a4c55] shadow"><MapPin size={18} className="shrink-0 text-[#002fa7]" aria-hidden="true" />{emptyText}</div>
      )}
    </div>
  );
}
