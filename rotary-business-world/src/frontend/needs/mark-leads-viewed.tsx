"use client";

import { useEffect } from "react";
import { markLeadsViewedAction } from "@/backend/actions/needs";

/**
 * Marks the owner's delivered leads viewed on mount. Deliberately a client effect,
 * not an in-render write: route prefetch of the bell's leads link renders the page
 * but never mounts client components, so the badge only clears once the inbox is
 * actually opened. The bell count refreshes on the next navigation (same as the
 * messaging unread badge).
 */
export function MarkLeadsViewed() {
  useEffect(() => {
    void markLeadsViewedAction();
  }, []);
  return null;
}
