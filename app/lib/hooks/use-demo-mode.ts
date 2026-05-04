"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "kadence_demo_mode";

function isDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useDemoMode() {
  const [demo] = useState(isDemoActive);

  const toggleDemo = useCallback(() => {
    const isCurrentlyOn = localStorage.getItem(STORAGE_KEY) === "true";
    if (isCurrentlyOn) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    window.location.reload();
  }, []);

  return { demo, toggleDemo };
}

export function isDemoMode(): boolean {
  return isDemoActive();
}
