"use client";

import { useCallback, useEffect, useState } from "react";

export const LEVEL_TITLES = [
  "Beginner",   // 0 – shouldn't appear
  "Jogger",     // 1
  "Runner",     // 2
  "Pacer",      // 3
  "Sprinter",   // 4
  "Racer",      // 5
  "Finisher",   // 6
  "Elite",      // 7
  "Champion",   // 8
  "Legend",     // 9
];

/** XP required to reach a given level (cumulative). Level 1 = 0, level 2 = 100, … */
const XP_PER_LEVEL = 100;

function levelFromTotal(total: number) {
  return Math.max(1, Math.floor(total / XP_PER_LEVEL) + 1);
}
function xpInLevel(total: number) {
  return total % XP_PER_LEVEL;
}
function titleForLevel(level: number) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];
}

const STORAGE_KEY = "kad_xp_total";

export type XPState = {
  totalXP: number;
  level: number;
  levelXP: number;   // 0-99 within current level
  levelTitle: string;
  nextTitle: string;
  addXP: (n: number) => void;
};

export function useXP(): XPState {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTotal(parseInt(stored, 10) || 0);
  }, []);

  const addXP = useCallback((n: number) => {
    setTotal((prev) => {
      const next = prev + n;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const level = levelFromTotal(total);
  return {
    totalXP: total,
    level,
    levelXP: xpInLevel(total),
    levelTitle: titleForLevel(level),
    nextTitle: titleForLevel(level + 1),
    addXP,
  };
}
