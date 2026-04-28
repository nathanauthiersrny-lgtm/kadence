"use client";

import { useCallback, useEffect, useState } from "react";
import { isDemoMode } from "./use-demo-mode";

// --- Types ---

export type CommunityTier = "starter" | "regular";
export type CommunityType = "road" | "trail";
export type ChallengeType = "min_runs" | "collective_km";

export type Community = {
  id: string;
  name: string;
  tier: CommunityTier;
  type: CommunityType;
  memberCount: number;
  description: string;
  challenge: {
    type: ChallengeType;
    target: number;
    label: string;
    bonusKad: number;
    bonusBaseUnits: number;
  };
};

export type RunEntry = {
  distanceKm: number;
  paceSecPerKm: number;
  date: string;
};

export type FeedMessage = {
  id: string;
  text: string;
  time: string;
};

export type WeekProgress = {
  weekKey: string;
  myRunCount: number;
  myKm: number;
  claimed: boolean;
};

// --- Static community data ---

export const COMMUNITIES: Community[] = [
  {
    id: "road-starter",
    name: "Road Starters",
    tier: "starter",
    type: "road",
    memberCount: 847,
    description: "Building the habit, one street at a time.",
    challenge: {
      type: "min_runs",
      target: 3,
      label: "Everyone runs at least 3× this week",
      bonusKad: 5,
      bonusBaseUnits: 5_000_000,
    },
  },
  {
    id: "road-regular",
    name: "Road Regulars",
    tier: "regular",
    type: "road",
    memberCount: 634,
    description: "Weekly routine locked in. Now push the distance.",
    challenge: {
      type: "collective_km",
      target: 50,
      label: "Group covers 50 km together",
      bonusKad: 10,
      bonusBaseUnits: 10_000_000,
    },
  },
  {
    id: "trail-starter",
    name: "Trail Explorers",
    tier: "starter",
    type: "trail",
    memberCount: 412,
    description: "Finding your trail legs in nature.",
    challenge: {
      type: "min_runs",
      target: 2,
      label: "Everyone runs at least 2× this week",
      bonusKad: 5,
      bonusBaseUnits: 5_000_000,
    },
  },
  {
    id: "trail-regular",
    name: "Trail Regulars",
    tier: "regular",
    type: "trail",
    memberCount: 289,
    description: "Consistent trail miles, week after week.",
    challenge: {
      type: "collective_km",
      target: 40,
      label: "Group covers 40 km together",
      bonusKad: 10,
      bonusBaseUnits: 10_000_000,
    },
  },
];

// --- Week helpers ---

function getWeekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Auto-assign: compute suggested tier from recent run history ---

function computeSuggestedTier(runs: RunEntry[]): CommunityTier | null {
  if (runs.length < 3) return null;
  const recent = runs.slice(-5);
  const avgPace = recent.reduce((s, r) => s + r.paceSecPerKm, 0) / recent.length;
  const avgDist = recent.reduce((s, r) => s + r.distanceKm, 0) / recent.length;
  // Regular: avg pace < 7:00/km (420 s) AND avg distance ≥ 5 km
  return avgPace < 420 && avgDist >= 5 ? "regular" : "starter";
}

// --- Deterministic fake group progress (stable per community + week) ---

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

function simulatedGroupKm(
  community: Community,
  weekKey: string,
  myKm: number,
): number {
  if (!isDemoMode()) return myKm;
  const seed =
    community.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
    weekKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseline = community.challenge.target * (0.45 + seededRandom(seed) * 0.2);
  return Math.min(baseline + myKm, community.challenge.target * 1.5);
}

// --- Auto-generated activity feed ---

const ROAD_NAMES = ["Alex", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Quinn", "Taylor", "Drew", "Avery"];
const TRAIL_NAMES = ["Blake", "Sage", "River", "Cedar", "Wren", "Scout", "Ash", "Forest"];

function generateFeed(community: Community, myKm: number): FeedMessage[] {
  const messages: FeedMessage[] = [];

  if (myKm > 0) {
    messages.push({
      id: "my-run",
      text: `You've contributed ${myKm.toFixed(1)} km this week — keep it up!`,
      time: "just now",
    });
  }

  if (!isDemoMode()) return messages;

  const names = community.type === "trail" ? TRAIL_NAMES : ROAD_NAMES;
  const seed = community.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  const templates = [
    (n: string, km: string) => `${n} ran ${km} km`,
    (n: string, km: string) => `${n} just finished a ${km} km run!`,
    (n: string, km: string) => `${n} is on a roll — ${km} km today`,
    (n: string, km: string) => `${n} smashed ${km} km this morning`,
  ];

  for (let i = 0; i < 6; i++) {
    const name = names[Math.floor(seededRandom(seed + i) * names.length)];
    const km = (2 + seededRandom(seed + i * 3) * 8).toFixed(1);
    const minsAgo = Math.floor(seededRandom(seed + i * 7) * 240 + 5);
    const time = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`;
    const tpl = templates[Math.floor(seededRandom(seed + i * 11) * templates.length)];

    messages.push({ id: `feed-${i}`, text: tpl(name, km), time });
  }

  return messages;
}

// --- Storage keys ---

const KEY_RUN_HISTORY = "kad_run_history";
const KEY_JOINED = "kad_community_joined";
const KEY_WEEK = "kad_community_week";

function loadWeekProgress(): WeekProgress {
  try {
    const raw = localStorage.getItem(KEY_WEEK);
    if (raw) {
      const p: WeekProgress = JSON.parse(raw);
      if (p.weekKey === getWeekKey()) return p;
    }
  } catch { /* ignore */ }
  return { weekKey: getWeekKey(), myRunCount: 0, myKm: 0, claimed: false };
}

function saveWeekProgress(p: WeekProgress) {
  localStorage.setItem(KEY_WEEK, JSON.stringify(p));
}

// --- Hook ---

export type CommunityState = {
  communities: Community[];
  joinedCommunity: Community | null;
  suggestedTier: CommunityTier | null;
  runCount: number;
  weekProgress: WeekProgress;
  feed: FeedMessage[];
  collectiveKm: number;
  challengeComplete: boolean;
  joinCommunity: (id: string) => void;
  leaveCommunity: () => void;
  addRunContribution: (distanceKm: number, paceSecPerKm: number) => void;
  markClaimed: () => void;
};

export function useCommunity(): CommunityState {
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<RunEntry[]>([]);
  const [weekProgress, setWeekProgress] = useState<WeekProgress>({
    weekKey: getWeekKey(),
    myRunCount: 0,
    myKm: 0,
    claimed: false,
  });

  useEffect(() => {
    const joined = localStorage.getItem(KEY_JOINED);
    if (joined) setJoinedId(joined);

    try {
      const raw = localStorage.getItem(KEY_RUN_HISTORY);
      if (raw) setRunHistory(JSON.parse(raw));
    } catch { /* ignore */ }

    setWeekProgress(loadWeekProgress());
  }, []);

  const joinCommunity = useCallback((id: string) => {
    localStorage.setItem(KEY_JOINED, id);
    setJoinedId(id);
  }, []);

  const leaveCommunity = useCallback(() => {
    localStorage.removeItem(KEY_JOINED);
    setJoinedId(null);
  }, []);

  const addRunContribution = useCallback(
    (distanceKm: number, paceSecPerKm: number) => {
      const entry: RunEntry = { distanceKm, paceSecPerKm, date: todayStr() };
      const next = [...runHistory, entry];
      localStorage.setItem(KEY_RUN_HISTORY, JSON.stringify(next));
      setRunHistory(next);

      setWeekProgress((prev) => {
        const updated: WeekProgress = {
          ...prev,
          myRunCount: prev.myRunCount + 1,
          myKm: prev.myKm + distanceKm,
        };
        saveWeekProgress(updated);
        return updated;
      });
    },
    [runHistory],
  );

  const markClaimed = useCallback(() => {
    setWeekProgress((prev) => {
      const updated = { ...prev, claimed: true };
      saveWeekProgress(updated);
      return updated;
    });
  }, []);

  const joinedCommunity = COMMUNITIES.find((c) => c.id === joinedId) ?? null;
  const suggestedTier = computeSuggestedTier(runHistory);

  const collectiveKm = joinedCommunity
    ? simulatedGroupKm(joinedCommunity, weekProgress.weekKey, weekProgress.myKm)
    : 0;

  let challengeComplete = false;
  if (joinedCommunity && !weekProgress.claimed) {
    if (joinedCommunity.challenge.type === "min_runs") {
      challengeComplete = weekProgress.myRunCount >= joinedCommunity.challenge.target;
    } else {
      challengeComplete = collectiveKm >= joinedCommunity.challenge.target;
    }
  }

  const feed = joinedCommunity ? generateFeed(joinedCommunity, weekProgress.myKm) : [];

  return {
    communities: COMMUNITIES,
    joinedCommunity,
    suggestedTier,
    runCount: runHistory.length,
    weekProgress,
    feed,
    collectiveKm,
    challengeComplete,
    joinCommunity,
    leaveCommunity,
    addRunContribution,
    markClaimed,
  };
}
