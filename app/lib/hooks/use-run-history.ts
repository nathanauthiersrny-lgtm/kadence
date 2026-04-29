"use client";

import { useCallback, useEffect, useState } from "react";
import type { LatLon } from "./use-run-tracker";
import { isDemoMode } from "./use-demo-mode";

export type RunEntry = {
  id: string;
  date: string;         // ISO string
  distance: number;     // meters
  duration: number;     // seconds
  pace: number;         // seconds per km
  kadEarned: number;
  routeCoords: LatLon[];
  txSignature: string | null;
  xpEarned: number;
  badgeEarned: string | null;
};

export const RUNS_KEY = "kadence_runs";

function buildSeeds(): RunEntry[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      id: "seed-1",
      date: new Date(now - 6 * day).toISOString(),
      distance: 8_400,
      duration: 2_623,
      pace: 312,
      kadEarned: 8.4,
      routeCoords: [],
      txSignature: null,
      xpEarned: 84,
      badgeEarned: null,
    },
    {
      id: "seed-2",
      date: new Date(now - 4 * day).toISOString(),
      distance: 5_200,
      duration: 1_700,
      pace: 327,
      kadEarned: 5.2,
      routeCoords: [],
      txSignature: null,
      xpEarned: 52,
      badgeEarned: null,
    },
    {
      id: "seed-3",
      date: new Date(now - 2 * day).toISOString(),
      distance: 3_100,
      duration: 1_140,
      pace: 368,
      kadEarned: 3.1,
      routeCoords: [],
      txSignature: null,
      xpEarned: 31,
      badgeEarned: null,
    },
    {
      id: "seed-4",
      date: new Date(now - 1 * day).toISOString(),
      distance: 10_050,
      duration: 3_146,
      pace: 313,
      kadEarned: 10.05,
      routeCoords: [],
      txSignature: null,
      xpEarned: 100,
      badgeEarned: "10K Runner",
    },
  ];
}

function migrate(entry: Record<string, unknown>): RunEntry {
  return {
    id: (entry.id as string) ?? `run-${Date.now()}`,
    date: (entry.date as string) ?? new Date().toISOString(),
    distance: (entry.distance as number) ?? 0,
    duration: (entry.duration as number) ?? 0,
    pace: (entry.pace as number) ?? 0,
    kadEarned: (entry.kadEarned as number) ?? 0,
    routeCoords: (entry.routeCoords as LatLon[]) ?? [],
    txSignature: (entry.txSignature as string) ?? null,
    xpEarned: (entry.xpEarned as number) ?? 0,
    badgeEarned: (entry.badgeEarned as string) ?? null,
  };
}

function load(): RunEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) {
      if (isDemoMode()) {
        const seeds = buildSeeds();
        localStorage.setItem(RUNS_KEY, JSON.stringify(seeds));
        return seeds;
      }
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    const migrated = parsed.map(migrate);
    if (isDemoMode()) return migrated;
    return migrated.filter((r) => !r.id.startsWith("seed-"));
  } catch {
    return [];
  }
}

/** Rolling 7-day window — reliable for demo regardless of weekday. */
function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useRunHistory() {
  const [runs, setRuns] = useState<RunEntry[]>([]);

  useEffect(() => {
    setRuns(load());
  }, []);

  const saveRun = useCallback((entry: Omit<RunEntry, "id">): string => {
    const id = `run-${Date.now()}`;
    const full: RunEntry = { id, ...entry };
    setRuns((prev) => {
      const next = [full, ...prev];
      localStorage.setItem(RUNS_KEY, JSON.stringify(next));
      return next;
    });
    return id;
  }, []);

  const updateRunTx = useCallback((runId: string, txSignature: string) => {
    setRuns((prev) => {
      const next = prev.map((r) => r.id === runId ? { ...r, txSignature } : r);
      localStorage.setItem(RUNS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const totalKad = runs.reduce((s, r) => s + r.kadEarned, 0);
  const totalDistKm = runs.reduce((s, r) => s + r.distance / 1000, 0);

  const cutoff = sevenDaysAgo();
  const thisWeekRuns = runs.filter((r) => new Date(r.date) >= cutoff);
  const weekKad = thisWeekRuns.reduce((s, r) => s + r.kadEarned, 0);
  const weekDistKm = thisWeekRuns.reduce((s, r) => s + r.distance / 1000, 0);

  return {
    runs,
    saveRun,
    updateRunTx,
    totalKad,
    totalDistKm,
    totalRuns: runs.length,
    weekRunCount: thisWeekRuns.length,
    weekKad,
    weekDistKm,
  };
}
