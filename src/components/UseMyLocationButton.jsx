"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button, cx } from "@/components/ds";
import { getSavedLocation, requestUserLocation } from "@/lib/user-location";

export default function UseMyLocationButton({ category, searchTerm, compact = false }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  function locate() {
    setLoading(true); setFailed(false);
    setMessage("");
    const continueWithLocation = ({ lat, lng }) => {
        const query = new URLSearchParams(window.location.search);
        if (category) query.set("category", category);
        if (searchTerm) query.set("q", searchTerm);
        query.delete("city"); query.delete("locality"); query.delete("state");
        query.set("lat", Number(lat).toFixed(6));
        query.set("lng", Number(lng).toFixed(6));
        query.set("radiusMeters", query.get("radiusMeters") || "10000");
        query.set("sort", "distance"); query.delete("page");
        window.location.assign(`/directory?${query.toString()}`);
    };
    const savedLocation = getSavedLocation();
    if (savedLocation) return continueWithLocation(savedLocation);
    requestUserLocation(continueWithLocation, (reason) => {
      setLoading(false); setFailed(true);
      setMessage(reason === "denied" ? "Location is blocked. Click the lock icon next to the web address, allow Location, then try again. Or search by city." : reason === "unsupported" ? "This browser can’t share your location. Search by city instead." : "Couldn’t find your location. Turn on Location in your device settings and try again, or search by city.");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type={compact ? "ghost" : "secondary"} size="s" onClick={locate} disabled={loading} icon={<LocateFixed size={18} aria-hidden="true" />}>{loading ? "Finding your location…" : "Use my location"}</Button>
      {message && <p role="status" aria-live="polite" className={cx("max-w-[320px] text-[13px] leading-[18px]", failed ? "text-[#b42318]" : "text-[#4a4c55]")}>{message}</p>}
    </div>
  );
}
