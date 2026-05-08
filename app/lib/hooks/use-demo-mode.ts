"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "kadence_demo_mode";

function isDemoActive(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function useDemoMode() {
  const [demo] = useState(isDemoActive);

  const toggleDemo = useCallback(() => {
    const isCurrentlyDemo = localStorage.getItem(STORAGE_KEY) !== "false";
    localStorage.setItem(STORAGE_KEY, isCurrentlyDemo ? "false" : "true");
    window.location.reload();
  }, []);

  return { demo, toggleDemo };
}

export function isDemoMode(): boolean {
  return isDemoActive();
}
