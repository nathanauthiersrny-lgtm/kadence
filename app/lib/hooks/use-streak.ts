"use client";

import { useCallback, useState } from "react";
import { isDemoMode } from "./use-demo-mode";
import { modeKey } from "../storage";

const MULTIPLIERS: [number, number][] = [
  [8, 2.0],
  [4, 1.6],
  [2, 1.4],
  [1, 1.2],
  [0, 1.0],
];

function multiplierForStreak(streak: number) {
  for (const [min, mult] of MULTIPLIERS) {
    if (streak >= min) return mult;
  }
  return 1.0;
}

function getWeekStartStr(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function getPreviousWeekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekStartStr(d);
}

const STORAGE_KEY = "kad_streak";
const WEEKLY_GOAL = 2;

type Stored = { streak: number; weekStart: string; runsThisWeek: number };

function evaluateWeekTransition(stored: Stored, currentWeek: string): Stored {
  const prevWeek = getPreviousWeekStartStr();
  if (stored.weekStart === prevWeek) {
    const newStreak =
      stored.runsThisWeek >= WEEKLY_GOAL ? stored.streak + 1 : 0;
    return { streak: newStreak, weekStart: currentWeek, runsThisWeek: 0 };
  }
  return { streak: 0, weekStart: currentWeek, runsThisWeek: 0 };
}

export type StreakState = {
  streak: number;
  multiplier: number;
  runsThisWeek: number;
  weeklyGoal: number;
  recordRun: () => void;
};

function loadStreakState(): { streak: number; runsThisWeek: number } {
  if (typeof window === "undefined") return { streak: 0, runsThisWeek: 0 };
  const raw = localStorage.getItem(modeKey(STORAGE_KEY));
  if (!raw) {
    if (isDemoMode()) {
      const seed: Stored = {
        streak: 3,
        weekStart: getWeekStartStr(),
        runsThisWeek: 2,
      };
      localStorage.setItem(modeKey(STORAGE_KEY), JSON.stringify(seed));
      return { streak: seed.streak, runsThisWeek: seed.runsThisWeek };
    }
    return { streak: 0, runsThisWeek: 0 };
  }
  try {
    const parsed = JSON.parse(raw);
    if ("lastRunDate" in parsed && !("weekStart" in parsed)) {
      localStorage.setItem(
        modeKey(STORAGE_KEY),
        JSON.stringify({ streak: 0, weekStart: "", runsThisWeek: 0 })
      );
      return { streak: 0, runsThisWeek: 0 };
    }
    const stored: Stored = parsed;
    const currentWeek = getWeekStartStr();
    if (stored.weekStart === currentWeek) {
      return { streak: stored.streak, runsThisWeek: stored.runsThisWeek };
    } else if (stored.weekStart) {
      const resolved = evaluateWeekTransition(stored, currentWeek);
      localStorage.setItem(modeKey(STORAGE_KEY), JSON.stringify(resolved));
      return { streak: resolved.streak, runsThisWeek: resolved.runsThisWeek };
    }
  } catch {
    // ignore parse errors
  }
  return { streak: 0, runsThisWeek: 0 };
}

export function useStreak(): StreakState {
  const [streak, setStreak] = useState(() => loadStreakState().streak);
  const [runsThisWeek, setRunsThisWeek] = useState(
    () => loadStreakState().runsThisWeek
  );

  const recordRun = useCallback(() => {
    const raw = localStorage.getItem(modeKey(STORAGE_KEY));
    const currentWeek = getWeekStartStr();
    let current: Stored = {
      streak: 0,
      weekStart: currentWeek,
      runsThisWeek: 0,
    };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if ("weekStart" in parsed) {
          current = parsed as Stored;
        }
      } catch {
        /* ignore */
      }
    }

    if (current.weekStart === currentWeek) {
      current.runsThisWeek += 1;
    } else {
      const resolved = evaluateWeekTransition(current, currentWeek);
      current = { ...resolved, runsThisWeek: 1 };
    }

    localStorage.setItem(modeKey(STORAGE_KEY), JSON.stringify(current));
    setStreak(current.streak);
    setRunsThisWeek(current.runsThisWeek);
  }, []);

  return {
    streak,
    multiplier: multiplierForStreak(streak),
    runsThisWeek,
    weeklyGoal: WEEKLY_GOAL,
    recordRun,
  };
}
