"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRunTracker } from "../lib/hooks/use-run-tracker";
import { useStreak } from "../lib/hooks/use-streak";
import { KCard, KButton, KPill, KIcon } from "./ui/primitives";
import type { RunResult } from "../lib/hooks/use-run-tracker";

const RunMap = dynamic(() => import("./run-map").then((m) => m.RunMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 220, background: "#0D0D0D", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
      Loading map…
    </div>
  ),
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(mm: number, ss: number) {
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function speedZone(kmh: number): { label: string; index: number } {
  if (kmh < 6)  return { label: "Walk",   index: 0 };
  if (kmh < 9)  return { label: "Jog",    index: 1 };
  if (kmh < 12) return { label: "Run",    index: 2 };
  if (kmh < 16) return { label: "Tempo",  index: 3 };
  return              { label: "Sprint",  index: 4 };
}

const ZONES = ["Walk", "Jog", "Run", "Tempo", "Sprint"] as const;

// calories: ~1 kcal per kg per km, assume 70 kg runner
function estimateCal(distanceM: number) {
  return Math.round((distanceM / 1000) * 70);
}

const QUEST_GOAL_KM = 5; // mirrors the quest from use-quests

type Props = {
  onEnd: (result: RunResult, snapshot: { distanceMeters: number; durationSeconds: number; reachedSprint: boolean }) => void;
  onCancel: () => void;
};

export function ActiveRunScreen({ onEnd, onCancel }: Props) {
  const { isRunning, distanceMeters, durationSeconds, speedKmh, route, geoError, startRun, stopRun } =
    useRunTracker();
  const { multiplier } = useStreak();

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Combo: count consecutive seconds in Run+ zone
  const [comboSeconds, setComboSeconds] = useState(0);
  const comboRef = useRef(0);

  // Track sprint for badge
  const reachedSprintRef = useRef(false);

  // Update combo every second based on GPS speed from hook
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      const zone = speedZone(speedKmh);
      if (zone.index >= 4) reachedSprintRef.current = true;

      if (zone.index >= 2) {
        comboRef.current += 1;
      } else {
        comboRef.current = 0;
      }
      setComboSeconds(comboRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, speedKmh]);

  // Auto-start GPS when component mounts
  useEffect(() => {
    if (!started) {
      startRun();
      setStarted(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    const result = stopRun();
    onEnd(result, {
      distanceMeters,
      durationSeconds,
      reachedSprint: reachedSprintRef.current,
    });
  };

  const mm = Math.floor(durationSeconds / 60);
  const ss = durationSeconds % 60;
  const distKm = distanceMeters / 1000;
  const paceSecPerKm = distanceMeters > 10 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const paceMm = Math.floor(paceSecPerKm / 60);
  const paceSs = Math.round(paceSecPerKm % 60).toString().padStart(2, "0");
  const paceDisplay = distanceMeters > 10 ? `${paceMm}:${paceSs}` : "—";

  const zone = speedZone(speedKmh);
  const goalProgress = Math.min((distKm / QUEST_GOAL_KM) * 100, 100);
  const kadEarned = distKm * multiplier;
  const xpEarned = Math.round(distKm * 10 * multiplier);
  const comboLevel = comboSeconds >= 60 ? Math.min(Math.floor(comboSeconds / 60), 5) : 0;
  const displayZone = zone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 20px 24px", color: "#fff", fontFamily: "var(--font-sans)", minHeight: "100%" }}>

      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <KPill pulse icon={<KIcon name="nav" size={11} color="#E0F479" />}>GPS</KPill>
        {comboLevel > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(224,244,121,0.12)", borderRadius: 50, border: "1px solid rgba(224,244,121,0.3)" }}>
            <KIcon name="bolt" size={12} color="#E0F479" fill="#E0F479" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#E0F479", letterSpacing: "0.05em" }}>×{comboLevel} COMBO</span>
          </div>
        ) : (
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Goal progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
          <span>Today&apos;s goal · {QUEST_GOAL_KM} km</span>
          <span style={{ color: "#E0F479" }}>{Math.round(goalProgress)}%</span>
        </div>
        <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 50, overflow: "hidden" }}>
          <div style={{ width: `${goalProgress}%`, height: "100%", background: "linear-gradient(90deg, #3FB977, #E0F479)", borderRadius: 50, boxShadow: "0 0 8px rgba(224,244,121,0.5)", transition: "width 1s linear" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
          <span>{distKm.toFixed(2)} km done</span>
          <span>{Math.max(0, QUEST_GOAL_KM - distKm).toFixed(2)} km to go</span>
        </div>
      </div>

      {/* Hero timer */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.2em" }}>Duration</div>
        <div style={{ fontSize: 80, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {fmt(mm, ss)}
        </div>

        {/* KAD + XP */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KIcon name="bolt" size={16} color="#E0F479" fill="#E0F479" />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>
              +{kadEarned.toFixed(2)} KAD
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KIcon name="sparkle" size={14} color="#E0F479" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(224,244,121,0.75)" }}>+{xpEarned} XP</span>
          </div>
        </div>
      </div>

      {/* Speed zone bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)" }}>Speed zone</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>
            {speedKmh.toFixed(1)} km/h · {displayZone.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, height: 24 }}>
          {ZONES.map((label, i) => {
            const active = i === displayZone.index;
            const passed = i < displayZone.index;
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  background: active ? "#E0F479" : passed ? "rgba(224,244,121,0.22)" : "rgba(255,255,255,0.06)",
                  borderRadius: 4,
                  boxShadow: active ? "0 0 8px rgba(224,244,121,0.6)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: active ? "#0D0D0D" : "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <KCard padding={14} style={{ display: "flex" }}>
        {[
          { label: "Pace", value: paceDisplay, icon: "timer" as const },
          { label: "Dist", value: `${distKm.toFixed(2)} km`, icon: "route" as const },
          { label: "Cal",  value: String(estimateCal(distanceMeters)), icon: "flame" as const },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <KIcon name={icon} size={18} color="rgba(224,244,121,0.6)" />
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </KCard>

      {/* GPS error */}
      {geoError && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, fontSize: 13, color: "#ef4444" }}>
          GPS error: {geoError}
        </div>
      )}

      {/* Map */}
      {route.length > 0 && (
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(224,244,121,0.2)" }}>
          <RunMap route={route} className="w-full" />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
        <KButton
          variant="secondary"
          style={{ flex: 1 }}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Resume" : "Pause"}
        </KButton>
        <KButton style={{ flex: 1 }} onClick={handleEnd}>
          End run
        </KButton>
      </div>
    </div>
  );
}
