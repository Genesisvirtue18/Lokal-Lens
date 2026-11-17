"use client";

import { useEffect, useRef } from "react";
import { recordBusinessView } from "@/lib/api";

// Counts one profile view per visit. The counters are shown to the owner in the dashboard, not on the public profile.
export default function BusinessActivityStats({ businessId }) {
  const tracked = useRef("");
  useEffect(() => {
    if (!businessId || tracked.current === businessId) return;
    tracked.current = businessId;
    recordBusinessView(businessId).catch(() => {});
  }, [businessId]);
  return null;
}
