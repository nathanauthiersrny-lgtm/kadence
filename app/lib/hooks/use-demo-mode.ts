"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kadence_demo_mode";

function isDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useDemoMode() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    setDemo(isDemoActive());
  }, []);

  const toggleDemo = useCallback(() => {
    setDemo((prev) => {
      const next = !prev;
      if (next) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      window.location.reload();
      return next;
    });
  }, []);

  return { demo, toggleDemo };
}

export function isDemoMode(): boolean {
  return isDemoActive();
}
