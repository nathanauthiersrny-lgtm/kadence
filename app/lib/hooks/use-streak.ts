"use client";

import { useCallback, useEffect, useState } from "react";

/** Multiplier thresholds: [minStreak, multiplier] */
const MULTIPLIERS: [number, number][] = [
  [30, 2.0],
  [14, 1.6],
  [7,  1.4],
  [3,  1.2],
  [1,  1.1],
  [0,  1.0],
];

function multiplierForStreak(streak: number) {
  for (const [min, mult] of MULTIPLIERS) {
    if (streak >= min) return mult;
  }
  return 1.0;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const STORAGE_KEY = "kad_streak";

type Stored = { streak: number; lastRunDate: string };

export type StreakState = {
  streak: number;
  multiplier: number;
  recordRun: () => void;
};

export function useStreak(): StreakState {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const { streak: s, lastRunDate }: Stored = JSON.parse(raw);
      // If last run was yesterday or today, streak is still valid
      if (lastRunDate === todayStr() || lastRunDate === yesterdayStr()) {
        setStreak(s);
      } else {
        // Gap > 1 day — reset
        setStreak(0);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak: 0, lastRunDate: "" }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const recordRun = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    let current = 0;
    if (raw) {
      try {
        const { streak: s, lastRunDate }: Stored = JSON.parse(raw);
        const today = todayStr();
        if (lastRunDate === today) {
          // Already ran today — don't increment
          return;
        }
        current = lastRunDate === yesterdayStr() ? s : 0;
      } catch { /* ignore */ }
    }
    const next = current + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak: next, lastRunDate: todayStr() }));
    setStreak(next);
  }, []);

  return { streak, multiplier: multiplierForStreak(streak), recordRun };
}
