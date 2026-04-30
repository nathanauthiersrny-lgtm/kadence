"use client";

import { useCallback, useEffect, useState } from "react";

export type Badge = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  earned: boolean;
};

const ALL_BADGES: Omit<Badge, "earned">[] = [
  { id: "first-run",     icon: "play",    label: "First Step",    desc: "Complete your first run" },
  { id: "streak-3",      icon: "flame",   label: "On Fire",       desc: "3-week streak" },
  { id: "streak-7",      icon: "crown",   label: "7-Week Streak", desc: "7-week streak" },
  { id: "club-5k",       icon: "route",   label: "5K Club",       desc: "Run 5 km in one session" },
  { id: "sub-30",        icon: "bolt",    label: "Sub-30",        desc: "5 km under 30 minutes" },
  { id: "club-10k",      icon: "medal",   label: "10K Club",      desc: "Run 10 km in one session" },
  { id: "speed-demon",   icon: "zap",     label: "Speed Demon",   desc: "Reach Sprint zone (>16 km/h)" },
  { id: "half-marathon", icon: "trophy",  label: "Half Marathon", desc: "Run 21 km in one session" },
];

const STORAGE_KEY = "kad_badges";

export type BadgesState = {
  badges: Badge[];
  checkAndUnlock: (params: {
    distanceKm: number;
    durationSeconds: number;
    streak: number;
    reachedSprint: boolean;
    totalRuns: number;
  }) => Badge[]; // returns newly unlocked badges
};

export function useBadges(): BadgesState {
  const [earned, setEarned] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const checkAndUnlock = useCallback(
    ({
      distanceKm,
      durationSeconds,
      streak,
      reachedSprint,
      totalRuns,
    }: {
      distanceKm: number;
      durationSeconds: number;
      streak: number;
      reachedSprint: boolean;
      totalRuns: number;
    }): Badge[] => {
      const paceMinPerKm = distanceKm > 0 ? durationSeconds / 60 / distanceKm : Infinity;

      const candidates: string[] = [];
      if (totalRuns >= 1)           candidates.push("first-run");
      if (streak >= 3)              candidates.push("streak-3");
      if (streak >= 7)              candidates.push("streak-7");
      if (distanceKm >= 5)          candidates.push("club-5k");
      if (distanceKm >= 5 && paceMinPerKm <= 6) candidates.push("sub-30"); // 5km in 30min = 6min/km
      if (distanceKm >= 10)         candidates.push("club-10k");
      if (reachedSprint)            candidates.push("speed-demon");
      if (distanceKm >= 21)         candidates.push("half-marathon");

      setEarned((prev) => {
        const next = new Set(prev);
        for (const id of candidates) next.add(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });

      // Return newly unlocked only
      return candidates
        .filter((id) => !earned.has(id))
        .map((id) => {
          const def = ALL_BADGES.find((b) => b.id === id)!;
          return { ...def, earned: true };
        });
    },
    [earned],
  );

  const badges: Badge[] = ALL_BADGES.map((b) => ({ ...b, earned: earned.has(b.id) }));
  return { badges, checkAndUnlock };
}

// ─── total run counter ────────────────────────────────────────────────────────
const RUNS_KEY = "kad_total_runs";
export function incrementTotalRuns(): number {
  const n = (parseInt(localStorage.getItem(RUNS_KEY) ?? "0", 10) || 0) + 1;
  localStorage.setItem(RUNS_KEY, String(n));
  return n;
}
export function getTotalRuns(): number {
  return parseInt(localStorage.getItem(RUNS_KEY) ?? "0", 10) || 0;
}
