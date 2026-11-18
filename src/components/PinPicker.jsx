"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ds";

// Map where the owner sets the exact pin: drag the pin, tap the map, use the live location, or find it from the address.
// value: { lat, lng } | null.  onChange(point, source) where source is "user" (set by hand / live location) or "address".
export default function PinPicker({ value, source, onChange, onFindFromAddress, canFind }) {
  const node = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const L = useRef(null);
  const latest = useRef(onChange);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => { latest.current = onChange; }, [onChange]);

  const pin = (point, zoom) => {
    if (!map.current || !L.current) return;
    if (!marker.current) {
      const icon = L.current.divIcon({ className: "", iconSize: [38, 38], iconAnchor: [19, 38], html: '<svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(16,17,21,.35))"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="#002fa7" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>' });
      marker.current = L.current.marker([point.lat, point.lng], { icon, draggable: true, autoPan: true, title: "Drag to your exact entrance" }).addTo(map.current);
      marker.current.on("dragend", () => { const at = marker.current.getLatLng(); latest.current({ lat: at.lat, lng: at.lng }, "user"); setStatus({ type: "ok", text: "Pin moved. This is now your exact location." }); });
    } else marker.current.setLatLng([point.lat, point.lng]);
    map.current.setView([point.lat, point.lng], zoom || Math.max(map.current.getZoom(), 17));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !node.current || map.current) return;
      L.current = leaflet;
      map.current = leaflet.map(node.current, { scrollWheelZoom: false }).setView(value ? [value.lat, value.lng] : [22.5, 79], value ? 17 : 5);
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
      map.current.on("click", (event) => { const point = { lat: event.latlng.lat, lng: event.latlng.lng }; pin(point); latest.current(point, "user"); setStatus({ type: "ok", text: "Pin placed. Drag it to fine-tune." }); });
      setTimeout(() => map.current?.invalidateSize(), 200);
      if (value) pin(value, 17);
    })();
    return () => { cancelled = true; if (map.current) { map.current.remove(); map.current = null; marker.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the value changes from outside (address lookup, loaded listing), follow it.
  useEffect(() => { if (value && map.current && L.current) pin(value, source === "address" ? 16 : undefined); }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  function useLive() {
    if (!navigator.geolocation) { setStatus({ type: "error", text: "This browser can’t share your location. Drop the pin on the map instead." }); return; }
    setBusy("live"); setStatus({ type: "", text: "Finding your location…" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { const point = { lat: coords.latitude, lng: coords.longitude }; pin(point, 18); onChange(point, "user"); setBusy(""); setStatus({ type: "ok", text: `Location found (accurate to about ${Math.round(coords.accuracy)} m). Drag the pin if it’s not on your entrance.` }); },
      (error) => { setBusy(""); setStatus({ type: "error", text: error.code === 1 ? "Location is blocked. Click the lock icon next to the web address, allow Location, then try again. Or tap the map to drop the pin." : "Couldn’t get your location. Turn on Location in your device settings, or tap the map to drop the pin." }); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function find() {
    setBusy("find"); setStatus({ type: "", text: "Looking up your address…" });
    try { const point = await onFindFromAddress(); if (point) { pin(point, 17); setStatus({ type: "ok", text: "Pin placed from your address. Drag it to your exact entrance." }); } else setStatus({ type: "error", text: "We couldn’t find that address on the map. Tap the map or use your live location." }); }
    catch { setStatus({ type: "error", text: "The address lookup isn’t available right now. Tap the map or use your live location." }); }
    finally { setBusy(""); }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="secondary" size="s" onClick={useLive} disabled={busy === "live"} icon={<LocateFixed size={18} aria-hidden="true" />}>{busy === "live" ? "Locating…" : "Use my live location"}</Button>
        <Button type="ghost" size="s" onClick={find} disabled={busy === "find" || !canFind} icon={<Search size={18} aria-hidden="true" />}>Find from address</Button>
      </div>
      <div className="relative h-[300px] overflow-hidden rounded-[16px] border border-[#dcdbd5] bg-[#e8e7e1]">
        <div ref={node} className="absolute inset-0 z-0" role="region" aria-label="Map: set your exact pin" />
        {!value && <p className="pointer-events-none absolute left-14 right-3 top-3 z-[500] flex items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-[13px] leading-[18px] text-[#4a4c55] shadow"><MapPin size={16} className="shrink-0 text-[#002fa7]" aria-hidden="true" />No pin yet. Tap the map, use your live location, or find it from your address.</p>}
      </div>
      {status.text && <p role={status.type === "error" ? "alert" : "status"} className={`text-[14px] leading-5 ${status.type === "error" ? "text-[#b42318]" : status.type === "ok" ? "text-[#2b7a26]" : "text-[#4a4c55]"}`}>{status.text}</p>}
      <p className="text-[14px] leading-5 text-[#6e7079]">{value ? (source === "user" ? "Exact pin set by you." : "Pin placed from your address. Drag it onto your entrance for the best directions.") : "A pin helps customers find you and shows your business on the map."} Customers use this for directions.</p>
    </div>
  );
}
