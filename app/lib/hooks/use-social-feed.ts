"use client";

import { useCallback, useEffect, useState } from "react";
import { isDemoMode } from "./use-demo-mode";
import type { LatLon } from "./use-run-tracker";

export type SharedRun = {
  id: string;
  runId: string;
  communityId: string;
  runnerName: string;
  walletAddress: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecPerKm: number;
  kadEarned: number;
  routeCoords: LatLon[];
  txSignature: string | null;
  sharedAt: string;
  fireCount: number;
  isSimulated: boolean;
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

export type ShareRunParams = {
  runId: string;
  communityId: string;
  runnerName: string;
  walletAddress: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecPerKm: number;
  kadEarned: number;
  routeCoords: LatLon[];
  txSignature: string | null;
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

const KEY_SHARED_RUNS = "kadence_shared_runs";
const KEY_FIRES = "kadence_fires";

const DEMO_NAMES = ["Alex", "Sam", "Jordan", "Miko", "River", "Casey", "Blake", "Quinn"];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

function getMondayOfWeek(): Date {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function loadSharedRuns(): SharedRun[] {
  try {
    const raw = localStorage.getItem(KEY_SHARED_RUNS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSharedRuns(runs: SharedRun[]) {
  localStorage.setItem(KEY_SHARED_RUNS, JSON.stringify(runs));
}

function loadFires(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY_FIRES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFires(fires: Record<string, boolean>) {
  localStorage.setItem(KEY_FIRES, JSON.stringify(fires));
}

function generateSimulatedRuns(communityId: string): SharedRun[] {
  if (!isDemoMode()) return [];

  const monday = getMondayOfWeek();
  const weekSeed = monday.getTime();
  const commSeed = communityId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseSeed = commSeed + weekSeed;

  const count = 5 + Math.floor(seededRandom(baseSeed) * 4); // 5-8
  const runs: SharedRun[] = [];

  for (let i = 0; i < count; i++) {
    const s = baseSeed + i * 7;
    const name = DEMO_NAMES[Math.floor(seededRandom(s) * DEMO_NAMES.length)];
    const distKm = 1.5 + seededRandom(s + 1) * 9;
    const paceSecPerKm = 280 + seededRandom(s + 2) * 180;
    const duration = Math.round(distKm * paceSecPerKm);
    const kad = Math.round(distKm * (1 + seededRandom(s + 3) * 0.5) * 100) / 100;
    const fireCount = 3 + Math.floor(seededRandom(s + 4) * 23);
    const hoursAgo = 1 + seededRandom(s + 5) * 120;
    const sharedAt = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

    const walletChars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
    let fakeAddr = "";
    for (let j = 0; j < 8; j++) {
      fakeAddr += walletChars[Math.floor(seededRandom(s + 10 + j) * walletChars.length)];
    }

    runs.push({
      id: `sim-${communityId}-${i}`,
      runId: `sim-run-${i}`,
      communityId,
      runnerName: name,
      walletAddress: fakeAddr,
      distanceKm: Math.round(distKm * 100) / 100,
      durationSeconds: duration,
      paceSecPerKm: Math.round(paceSecPerKm),
      kadEarned: kad,
      routeCoords: [],
      txSignature: null,
      sharedAt,
      fireCount,
      isSimulated: true,
    });
  }

  return runs;
}

function getSocialMultiplier(weeklyFires: number): number {
  if (weeklyFires >= 16) return 1.08;
  if (weeklyFires >= 6) return 1.05;
  if (weeklyFires >= 1) return 1.02;
  return 1;
}

export function useSocialFeed(communityId: string | null) {
  const [sharedRuns, setSharedRuns] = useState<SharedRun[]>([]);
  const [fires, setFires] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSharedRuns(loadSharedRuns());
    setFires(loadFires());
  }, []);

  const shareRun = useCallback(
    (params: ShareRunParams): SharedRun => {
      const run: SharedRun = {
        id: `shared-${Date.now()}`,
        ...params,
        sharedAt: new Date().toISOString(),
        fireCount: 0,
        isSimulated: false,
      };
      const updated = [run, ...loadSharedRuns()];
      saveSharedRuns(updated);
      setSharedRuns(updated);
      return run;
    },
    [],
  );

  const fireRun = useCallback(
    (sharedRunId: string) => {
      const currentFires = loadFires();
      if (currentFires[sharedRunId]) return;

      currentFires[sharedRunId] = true;
      saveFires(currentFires);
      setFires({ ...currentFires });

      const runs = loadSharedRuns();
      const idx = runs.findIndex((r) => r.id === sharedRunId);
      if (idx >= 0) {
        runs[idx] = { ...runs[idx], fireCount: runs[idx].fireCount + 1 };
        saveSharedRuns(runs);
        setSharedRuns(runs);
      }
    },
    [],
  );

  const hasFired = useCallback(
    (sharedRunId: string): boolean => {
      return !!fires[sharedRunId];
    },
    [fires],
  );

  const monday = getMondayOfWeek();
  const walletAddr =
    typeof window !== "undefined"
      ? localStorage.getItem("kadence_profile_name") || ""
      : "";

  const communityRuns = communityId
    ? [
        ...sharedRuns.filter((r) => r.communityId === communityId),
        ...generateSimulatedRuns(communityId).map((r) => ({
          ...r,
          fireCount: r.fireCount + (fires[r.id] ? 1 : 0),
        })),
      ].sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime())
    : [];

  const weeklyFiresReceived = sharedRuns
    .filter(
      (r) =>
        !r.isSimulated &&
        r.runnerName === walletAddr &&
        new Date(r.sharedAt) >= monday,
    )
    .reduce((sum, r) => sum + r.fireCount, 0);

  const socialMultiplier = getSocialMultiplier(weeklyFiresReceived);

  return {
    sharedRuns: communityRuns,
    shareRun,
    fireRun,
    hasFired,
    weeklyFiresReceived,
    socialMultiplier,
  };
}
