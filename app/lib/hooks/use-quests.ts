"use client";

import { useCallback, useEffect, useState } from "react";

export type Quest = {
  id: string;
  title: string;
  goalKm: number;
  rewardKad: number;
};

// Rotates daily based on day-of-year so it feels dynamic
const QUEST_POOL: Quest[] = [
  { id: "q1", title: "Run 5 km", goalKm: 5, rewardKad: 18 },
  { id: "q2", title: "Run 3 km", goalKm: 3, rewardKad: 10 },
  { id: "q3", title: "Run 10 km", goalKm: 10, rewardKad: 32 },
  { id: "q4", title: "Run 7 km", goalKm: 7, rewardKad: 24 },
  { id: "q5", title: "Run 2 km", goalKm: 2, rewardKad: 6 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function getDailyQuest(): Quest {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUEST_POOL[dayOfYear % QUEST_POOL.length];
}

const STORAGE_KEY = "kad_quest";

export type QuestState = {
  quest: Quest;
  progressKm: number;
  completed: boolean;
  timeUntilReset: string;
  completeQuest: (km: number) => void;
};

function loadQuestProgress(): { km: number; done: boolean } {
  if (typeof window === "undefined") return { km: 0, done: false };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { km: 0, done: false };
  try {
    const { date, km, done } = JSON.parse(raw) as {
      date: string;
      km: number;
      done: boolean;
    };
    if (date === todayStr()) return { km, done };
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return { km: 0, done: false };
}

export function useQuests(): QuestState {
  const [progressKm, setProgressKm] = useState(() => loadQuestProgress().km);
  const [completed, setCompleted] = useState(() => loadQuestProgress().done);
  const [countdown, setCountdown] = useState(msUntilMidnight);

  const quest = getDailyQuest();

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setCountdown(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const completeQuest = useCallback(
    (km: number) => {
      const next = Math.min(km, quest.goalKm);
      const done = next >= quest.goalKm;
      setProgressKm(next);
      setCompleted(done);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayStr(), km: next, done })
      );
    },
    [quest.goalKm]
  );

  return {
    quest,
    progressKm,
    completed,
    timeUntilReset: formatCountdown(countdown),
    completeQuest,
  };
}
