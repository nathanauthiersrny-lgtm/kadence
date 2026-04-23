"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlashRunStatus = "upcoming" | "live" | "past";
export type FlashRunType = "flash" | "event";

export type FlashRun = {
  id: string;
  name: string;
  subtitle: string;
  distanceM: number;
  windowStart: number; // ms timestamp
  windowEnd: number;   // ms timestamp
  prizePoolKad: number;
  participantCount: number;
  type: FlashRunType;
  communityTag?: string;
};

export type Competitor = {
  name: string;
  finishTimeSec: number;
  position: number;
};

export type RaceResult = {
  eventId: string;
  distanceM: number;
  durationSec: number;
  position: number;
  totalParticipants: number;
  dnf?: boolean;
};

// ─── Seeded event catalogue ───────────────────────────────────────────────────

const H = 3_600_000;
const D = 86_400_000;

let _EVENTS: FlashRun[] | null = null;

function buildEvents(): FlashRun[] {
  const now = Date.now();
  return [
    {
      id: "city-5k",
      name: "City 5K",
      subtitle: "Weekly drop · Road",
      distanceM: 5_000,
      windowStart: now - 2 * H,
      windowEnd: now + 4 * H,
      prizePoolKad: 500,
      participantCount: 134,
      type: "flash",
    },
    {
      id: "trail-10k",
      name: "Trail Blaze 10K",
      subtitle: "Nature run · Trail",
      distanceM: 10_000,
      windowStart: now + 3 * H,
      windowEnd: now + 15 * H,
      prizePoolKad: 1_200,
      participantCount: 67,
      type: "flash",
      communityTag: "Trail",
    },
    {
      id: "grand-prix",
      name: "Kadence Grand Prix",
      subtitle: "Half marathon · Organized",
      distanceM: 21_097,
      windowStart: now + 2 * D,
      windowEnd: now + 3 * D,
      prizePoolKad: 5_000,
      participantCount: 312,
      type: "event",
    },
    {
      id: "dawn-3k",
      name: "Dawn Patrol 3K",
      subtitle: "Early birds · Road",
      distanceM: 3_000,
      windowStart: now - 26 * H,
      windowEnd: now - 2 * H,
      prizePoolKad: 200,
      participantCount: 89,
      type: "flash",
    },
  ];
}

export function getFlashRunEvents(): FlashRun[] {
  if (!_EVENTS) _EVENTS = buildEvents();
  return _EVENTS;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

const COMPETITOR_NAMES = [
  "Alex", "Sam", "Jordan", "Miko", "River",
  "Ash", "Quinn", "Casey", "Blake", "Taylor",
  "Sage", "Drew",
];

export function generateCompetitors(event: FlashRun): Competitor[] {
  const seed = event.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const distKm = event.distanceM / 1000;
  const entries = COMPETITOR_NAMES.map((name, i) => {
    const pace = 240 + i * 15 + seededRandom(seed + i * 7) * 10; // sec/km, 4:00–7:10 range
    return { name, finishTimeSec: Math.round(distKm * pace) };
  });
  entries.sort((a, b) => a.finishTimeSec - b.finishTimeSec);
  return entries.map((e, i) => ({ ...e, position: i + 1 }));
}

export function getEventStatus(event: FlashRun): FlashRunStatus {
  const now = Date.now();
  if (now < event.windowStart) return "upcoming";
  if (now > event.windowEnd) return "past";
  return "live";
}

export function getGhostDistanceM(event: FlashRun, elapsedSec: number): number {
  const comps = generateCompetitors(event);
  const distKm = event.distanceM / 1000;
  const leaderPaceSec = comps[0].finishTimeSec / distKm; // sec/km
  return Math.min((elapsedSec / leaderPaceSec) * 1000, event.distanceM);
}

export function isDistanceValid(event: FlashRun, distanceM: number): boolean {
  return distanceM >= event.distanceM * 0.9;
}

export function getPlayerPosition(event: FlashRun, durationSec: number): number {
  if (event.participantCount === 0) return 1;
  const comps = generateCompetitors(event);
  return comps.filter((c) => c.finishTimeSec < durationSec).length + 1;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  if (days > 0) return `${days}d ${Math.floor((totalSec % 86_400) / 3600)}h`;
  const h = Math.floor(totalSec / 3600);
  if (h > 0) return `${h}h ${Math.floor((totalSec % 3600) / 60)}m`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatFinishTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function positionSuffix(pos: number): string {
  if (pos === 1) return "1st";
  if (pos === 2) return "2nd";
  if (pos === 3) return "3rd";
  return `${pos}th`;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const KEY_JOINED = "kad_flash_joined";
const KEY_RESULTS = "kad_flash_results";
const KEY_CUSTOM = "kad_flash_custom";

function loadJoined(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_JOINED) ?? "[]"); }
  catch { return []; }
}

function loadResults(): Record<string, RaceResult> {
  try { return JSON.parse(localStorage.getItem(KEY_RESULTS) ?? "{}"); }
  catch { return {}; }
}

function persistJoined(ids: string[]) {
  localStorage.setItem(KEY_JOINED, JSON.stringify(ids));
}

function loadCustomEvents(): FlashRun[] {
  try { return JSON.parse(localStorage.getItem(KEY_CUSTOM) ?? "[]"); }
  catch { return []; }
}

function persistCustomEvents(events: FlashRun[]) {
  localStorage.setItem(KEY_CUSTOM, JSON.stringify(events));
}

function persistResult(r: RaceResult) {
  const all = loadResults();
  all[r.eventId] = r;
  localStorage.setItem(KEY_RESULTS, JSON.stringify(all));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type CreateEventInput = {
  name: string;
  distanceM: number;
  durationMs: number;
  prizePoolKad: number;
};

export type FlashRunHookState = {
  events: FlashRun[];
  joinedIds: string[];
  results: Record<string, RaceResult>;
  joinEvent: (id: string) => void;
  submitResult: (eventId: string, distanceM: number, durationSec: number) => RaceResult;
  resetResult: (eventId: string) => void;
  createEvent: (input: CreateEventInput) => FlashRun;
  deleteEvent: (eventId: string) => void;
};

export function useFlashRun(): FlashRunHookState {
  const seededEvents = getFlashRunEvents();
  const [customEvents, setCustomEvents] = useState<FlashRun[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, RaceResult>>({});

  useEffect(() => {
    setJoinedIds(loadJoined());
    setResults(loadResults());
    setCustomEvents(loadCustomEvents());
  }, []);

  const events = [...customEvents, ...seededEvents];

  const joinEvent = useCallback((id: string) => {
    setJoinedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistJoined(next);
      return next;
    });
  }, []);

  const submitResult = useCallback(
    (eventId: string, distanceM: number, durationSec: number): RaceResult => {
      const event = events.find((e) => e.id === eventId)!;

      if (!isDistanceValid(event, distanceM)) {
        return { eventId, distanceM, durationSec, position: 0, totalParticipants: event.participantCount + 1, dnf: true };
      }

      const position = getPlayerPosition(event, durationSec);
      const r: RaceResult = { eventId, distanceM, durationSec, position, totalParticipants: event.participantCount + 1 };
      persistResult(r);
      setResults((prev) => ({ ...prev, [eventId]: r }));
      return r;
    },
    [events],
  );

  const createEvent = useCallback((input: CreateEventInput): FlashRun => {
    const now = Date.now();
    const event: FlashRun = {
      id: `custom-${now}`,
      name: input.name,
      subtitle: "Custom event · Live now",
      distanceM: input.distanceM,
      windowStart: now,
      windowEnd: now + input.durationMs,
      prizePoolKad: input.prizePoolKad,
      participantCount: 0,
      type: "flash",
    };
    setCustomEvents((prev) => {
      const next = [event, ...prev];
      persistCustomEvents(next);
      return next;
    });
    return event;
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setCustomEvents((prev) => {
      const next = prev.filter((e) => e.id !== eventId);
      persistCustomEvents(next);
      return next;
    });
  }, []);

  const resetResult = useCallback((eventId: string) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[eventId];
      const all = loadResults();
      delete all[eventId];
      localStorage.setItem(KEY_RESULTS, JSON.stringify(all));
      return next;
    });
  }, []);

  return { events, joinedIds, results, joinEvent, submitResult, resetResult, createEvent, deleteEvent };
}
