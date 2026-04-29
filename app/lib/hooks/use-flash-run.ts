"use client";

import { useCallback, useEffect, useState } from "react";
import { isDemoMode } from "./use-demo-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlashRunStatus = "upcoming" | "live" | "past";
export type FlashRunType = "boost" | "race";

export type FlashRun = {
  id: string;
  name: string;
  subtitle: string;
  distanceM: number;       // race: race distance, boost: min distance (0 = any)
  windowStart: number;     // ms timestamp
  windowEnd: number;       // ms timestamp
  prizePoolKad: number;    // 0 for boost events
  participantCount: number; // 0 for boost events
  type: FlashRunType;
  boostMultiplier?: number; // only for boost events
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

// ─── Weekly schedule ─────────────────────────────────────────────────────────

type ScheduleEntry = {
  dayOfWeek: number; // 0=Sun … 6=Sat
  id: string;
  name: string;
  subtitle: string;
  type: FlashRunType;
  startHour: number;
  endHour: number; // 24 = end of day
  distanceM: number;
  prizePoolKad: number;
  participantCount: number;
  boostMultiplier?: number;
};

const SCHEDULE: ScheduleEntry[] = [
  { dayOfWeek: 1, id: "morning-kickstart", name: "Morning Kickstart", subtitle: "Early boost · Road",          type: "boost", startHour: 6,  endHour: 10, distanceM: 3_000,  prizePoolKad: 0,  participantCount: 0,   boostMultiplier: 1.5 },
  { dayOfWeek: 2, id: "tempo-tuesday",     name: "Tempo Tuesday",     subtitle: "Weekly race · 5K",            type: "race",  startHour: 0,  endHour: 24, distanceM: 5_000,  prizePoolKad: 25, participantCount: 89  },
  { dayOfWeek: 3, id: "midweek-push",      name: "Midweek Push",      subtitle: "Afternoon boost · Any distance", type: "boost", startHour: 12, endHour: 20, distanceM: 0,      prizePoolKad: 0,  participantCount: 0,   boostMultiplier: 1.3 },
  { dayOfWeek: 4, id: "speed-session",     name: "Speed Session",     subtitle: "Evening boost · Road",        type: "boost", startHour: 17, endHour: 21, distanceM: 3_000,  prizePoolKad: 0,  participantCount: 0,   boostMultiplier: 2.0 },
  { dayOfWeek: 5, id: "friday-burn",       name: "Friday Burn",       subtitle: "All-day boost · Road",        type: "boost", startHour: 0,  endHour: 24, distanceM: 3_000,  prizePoolKad: 0,  participantCount: 0,   boostMultiplier: 1.5 },
  { dayOfWeek: 6, id: "weekend-warrior",   name: "Weekend Warrior",   subtitle: "Weekend race · 10K",          type: "race",  startHour: 0,  endHour: 24, distanceM: 10_000, prizePoolKad: 50, participantCount: 134 },
];

function getSundayEntry(date: Date): ScheduleEntry {
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  if (weekOfMonth === 2) {
    return { dayOfWeek: 0, id: "sunday-10k",  name: "Sunday 10K",  subtitle: "Featured race · 10K",            type: "race", startHour: 0, endHour: 24, distanceM: 10_000, prizePoolKad: 75,  participantCount: 95 };
  }
  if (weekOfMonth === 3) {
    return { dayOfWeek: 0, id: "sunday-half",  name: "Sunday Half",  subtitle: "Featured race · Half marathon", type: "race", startHour: 0, endHour: 24, distanceM: 21_097, prizePoolKad: 150, participantCount: 67 };
  }
  return { dayOfWeek: 0, id: "sunday-5k", name: "Sunday 5K", subtitle: "Featured race · 5K", type: "race", startHour: 0, endHour: 24, distanceM: 5_000, prizePoolKad: 50, participantCount: 112 };
}

function getEntryForDay(date: Date): ScheduleEntry {
  const dow = date.getDay();
  if (dow === 0) return getSundayEntry(date);
  return SCHEDULE.find((e) => e.dayOfWeek === dow)!;
}

function makeTimestamp(date: Date, hour: number): number {
  const d = new Date(date);
  if (hour >= 24) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(hour, 0, 0, 0);
  }
  return d.getTime();
}

function buildEventForDate(date: Date): FlashRun {
  const entry = getEntryForDay(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  return {
    id: `${entry.id}-${dateStr}`,
    name: entry.name,
    subtitle: entry.subtitle,
    distanceM: entry.distanceM,
    windowStart: makeTimestamp(date, entry.startHour),
    windowEnd: makeTimestamp(date, entry.endHour),
    prizePoolKad: entry.prizePoolKad,
    participantCount: isDemoMode() ? entry.participantCount : 0,
    type: entry.type,
    boostMultiplier: entry.boostMultiplier,
  };
}

function buildWeeklyEvents(): FlashRun[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Monday of current week
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  // Two days before today (so PAST tab is never empty)
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  const startDate = twoDaysAgo < monday ? twoDaysAgo : monday;

  // Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const events: FlashRun[] = [];
  for (const d = new Date(startDate); d <= sunday; d.setDate(d.getDate() + 1)) {
    events.push(buildEventForDate(new Date(d)));
  }

  return events.sort((a, b) => a.windowStart - b.windowStart);
}

// Day-based cache — events only change when the calendar date rolls over
let _cache: { key: string; events: FlashRun[] } | null = null;

export function getFlashRunEvents(): FlashRun[] {
  const key = `${new Date().toISOString().slice(0, 10)}-${isDemoMode() ? "demo" : "real"}`;
  if (_cache?.key === key) return _cache.events;
  const events = buildWeeklyEvents();
  _cache = { key, events };
  return events;
}

// ─── Active boost ────────────────────────────────────────────────────────────

export function getActiveBoost(): { multiplier: number; eventName: string; eventId: string } | null {
  const events = getFlashRunEvents();
  const now = Date.now();
  const active = events.find(
    (e) => e.type === "boost" && e.boostMultiplier != null && now >= e.windowStart && now < e.windowEnd,
  );
  if (!active) return null;
  return { multiplier: active.boostMultiplier!, eventName: active.name, eventId: active.id };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (event.type === "boost") return [];
  if (!isDemoMode()) return [];
  const seed = event.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const distKm = event.distanceM / 1000;
  const entries = COMPETITOR_NAMES.map((name, i) => {
    const pace = 240 + i * 15 + seededRandom(seed + i * 7) * 10;
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
  if (comps.length === 0) {
    const defaultPace = 300;
    return Math.min((elapsedSec / defaultPace) * 1000, event.distanceM);
  }
  const distKm = event.distanceM / 1000;
  const leaderPaceSec = comps[0].finishTimeSec / distKm;
  return Math.min((elapsedSec / leaderPaceSec) * 1000, event.distanceM);
}

export function isDistanceValid(event: FlashRun, distanceM: number): boolean {
  return distanceM >= event.distanceM * 0.9;
}

export function getPlayerPosition(event: FlashRun, durationSec: number): number {
  const comps = generateCompetitors(event);
  if (comps.length === 0) return 1;
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

// ─── Storage ─────────────────────────────────────────────────────────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────────

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
      subtitle: "Custom race · Live now",
      distanceM: input.distanceM,
      windowStart: now,
      windowEnd: now + input.durationMs,
      prizePoolKad: input.prizePoolKad,
      participantCount: 0,
      type: "race",
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
