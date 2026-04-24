"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRunTracker } from "../lib/hooks/use-run-tracker";
import { useStreak } from "../lib/hooks/use-streak";
import { type FlashRun, getGhostDistanceM } from "../lib/hooks/use-flash-run";
import { KCard, KPill, KIcon } from "./ui/primitives";
import type { RunResult } from "../lib/hooks/use-run-tracker";

const RunMap = dynamic(() => import("./run-map").then((m) => m.RunMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 200, background: "#0D0D0D", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
      Loading map…
    </div>
  ),
});

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

function estimateCal(distanceM: number) {
  return Math.round((distanceM / 1000) * 70);
}

const QUEST_GOAL_KM = 5;

type Props = {
  onEnd: (result: RunResult, snapshot: { distanceMeters: number; durationSeconds: number; reachedSprint: boolean }) => void;
  onCancel: () => void;
  flashRun?: FlashRun;
};

export function ActiveRunScreen({ onEnd, onCancel, flashRun }: Props) {
  const { isRunning, isPaused, distanceMeters, durationSeconds, speedKmh, route, geoError, startRun, pauseRun, resumeRun, stopRun } = useRunTracker();
  const { multiplier } = useStreak();

  const [started, setStarted] = useState(false);
  const [comboSeconds, setComboSeconds] = useState(0);
  const comboRef = useRef(0);
  const reachedSprintRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      const zone = speedZone(speedKmh);
      if (zone.index >= 4) reachedSprintRef.current = true;
      if (zone.index >= 2) comboRef.current += 1;
      else comboRef.current = 0;
      setComboSeconds(comboRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, speedKmh]);

  useEffect(() => {
    if (!started) { startRun(); setStarted(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    const result = stopRun();
    onEnd(result, { distanceMeters, durationSeconds, reachedSprint: reachedSprintRef.current });
  };

  const mm = Math.floor(durationSeconds / 60);
  const ss = durationSeconds % 60;
  const distKm = distanceMeters / 1000;
  const paceSecPerKm = distanceMeters > 10 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const paceMm = Math.floor(paceSecPerKm / 60);
  const paceSs = Math.round(paceSecPerKm % 60).toString().padStart(2, "0");
  const paceDisplay = distanceMeters > 10 ? `${paceMm}:${paceSs}` : "—";

  const zone = speedZone(speedKmh);
  const goalDistKm = flashRun ? flashRun.distanceM / 1000 : QUEST_GOAL_KM;
  const goalProgress = Math.min((distKm / goalDistKm) * 100, 100);
  const ghostDistM = flashRun ? getGhostDistanceM(flashRun, durationSeconds) : 0;
  const ghostDistKm = ghostDistM / 1000;
  const ghostProgress = flashRun ? Math.min((ghostDistKm / goalDistKm) * 100, 100) : 0;
  const kadEarned = distKm * multiplier;
  const xpEarned = Math.round(distKm * 10 * multiplier);
  const comboLevel = comboSeconds >= 60 ? Math.min(Math.floor(comboSeconds / 60), 5) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* ── Editorial hero — motion streaks ────────────────────────── */}
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `
          radial-gradient(ellipse at 70% 30%, rgba(224,244,121,0.35) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 80%, rgba(63,185,119,0.3) 0%, transparent 55%),
          linear-gradient(180deg, #1a2418 0%, #0D1510 60%, #0D0D0D 100%)
        ` }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 30%, rgba(224,244,121,0.2) 0%, transparent 40%)",
          animation: "kadHeroBreath 3s ease-in-out infinite",
        }} />
        <svg viewBox="0 0 414 420" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <g stroke="rgba(224,244,121,0.12)" strokeWidth="1" fill="none">
            {Array.from({ length: 14 }).map((_, i) => (
              <path key={i} d={`M -20 ${40 + i * 28} Q 200 ${30 + i * 28 + (i % 2 ? -10 : 10)} 440 ${50 + i * 28}`} />
            ))}
          </g>
          <g fill="rgba(255,255,255,0.04)">
            {Array.from({ length: 60 }).map((_, i) => (
              <circle key={i} cx={(i * 47 + 13) % 414} cy={(i * 31 + 7) % 420} r={(i % 3) * 0.4 + 0.3} />
            ))}
          </g>
        </svg>

        {/* Top bar */}
        <div style={{ position: "absolute", top: 18, left: 18, right: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {flashRun ? (
            <KPill pulse icon={<KIcon name="trophy" size={11} color="#E0F479" />}>
              RACE · {(flashRun.distanceM / 1000).toFixed(0)} km
            </KPill>
          ) : (
            <KPill pulse icon={<KIcon name="target" size={11} color="#E0F479" />}>GPS</KPill>
          )}
          {comboLevel > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(224,244,121,0.12)", borderRadius: 50, border: "1px solid rgba(224,244,121,0.3)" }}>
              <KIcon name="bolt" size={12} color="#E0F479" fill="#E0F479" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#E0F479", letterSpacing: "0.05em" }}>×{comboLevel} COMBO</span>
            </div>
          ) : (
            <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "inherit", fontWeight: 600 }}>
              Cancel
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ position: "absolute", top: 56, left: 18, right: 18 }}>
          {flashRun ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(224,244,121,0.8)", marginBottom: 5, fontWeight: 700 }}>
                  <span>You</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{distKm.toFixed(2)} km</span>
                </div>
                <div style={{ height: 3, borderRadius: 3, background: "rgba(224,244,121,0.15)", overflow: "hidden" }}>
                  <div style={{ width: `${goalProgress}%`, height: "100%", background: "linear-gradient(90deg, #3FB977, #E0F479)", borderRadius: 3, transition: "width 1s linear" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>
                  <span>Leader</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{ghostDistKm.toFixed(2)} km</span>
                </div>
                <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ width: `${ghostProgress}%`, height: "100%", background: "rgba(255,255,255,0.25)", borderRadius: 3, transition: "width 1s linear" }} />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)", fontWeight: 700, marginBottom: 6 }}>
                <span>Today&apos;s goal · {QUEST_GOAL_KM} km</span>
                <span style={{ color: "#E0F479" }}>{Math.round(goalProgress)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${goalProgress}%`, height: "100%", background: "#E0F479", boxShadow: "0 0 8px #E0F479", transition: "width 1s linear" }} />
              </div>
            </div>
          )}
        </div>

        {/* Timer hero */}
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#E0F479", fontWeight: 700, marginBottom: 10 }}>
            {flashRun ? `Race · ${goalDistKm.toFixed(1)} km total` : "Chapter 02 · Live"}
          </div>
          <div style={{
            fontSize: 72, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.88,
            color: "#E0F479", fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 20px rgba(224,244,121,0.25)",
          }}>
            {fmt(mm, ss)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 600 }}>Duration</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: "#E0F479", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <KIcon name="sparkle" size={12} color="#E0F479" fill="#E0F479" stroke={0} />
              +{kadEarned.toFixed(2)} KAD
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>│</span>
            <span style={{ color: "rgba(224,244,121,0.7)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <KIcon name="sparkle" size={12} color="rgba(224,244,121,0.7)" />
              +{xpEarned} XP
            </span>
          </div>
        </div>
      </div>

      {/* ── Bento below ────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 22px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>

        {/* Speed zone */}
        <KCard padding={14}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Speed zone</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>
              {speedKmh.toFixed(1)} km/h · {zone.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {ZONES.map((label, i) => {
              const active = i === zone.index;
              const passed = i < zone.index;
              return (
                <div key={label} style={{
                  flex: 1, padding: "8px 0", textAlign: "center", borderRadius: 50,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
                  background: active ? "#E0F479" : passed ? "rgba(224,244,121,0.15)" : "transparent",
                  color: active ? "#0D0D0D" : passed ? "rgba(224,244,121,0.6)" : "rgba(255,255,255,0.4)",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: active ? "0 0 8px rgba(224,244,121,0.3)" : "none",
                }}>
                  {label}
                </div>
              );
            })}
          </div>
        </KCard>

        {/* Stats 3-col bento */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Pace", value: paceDisplay, unit: "/km", accent: true },
            { label: "Dist", value: distKm.toFixed(2), unit: "km" },
            { label: "Cal",  value: String(estimateCal(distanceMeters)), unit: "kcal" },
          ].map((s, i) => (
            <div key={s.label} style={{
              background: i === 0 ? "#E0F479" : "#1A1A1A",
              color: i === 0 ? "#0D0D0D" : "#fff",
              border: i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 12,
            }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700, opacity: i === 0 ? 0.65 : 0.5 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 4, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, marginTop: 3, opacity: 0.6 }}>{s.unit}</div>
            </div>
          ))}
        </div>

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

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 10, marginTop: "auto" }}>
          <button
            onClick={() => isPaused ? resumeRun() : pauseRun()}
            style={{
              height: 58, borderRadius: 50, border: "1.5px solid #E0F479", background: "transparent",
              color: "#E0F479", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
              letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={handleEnd}
            style={{
              height: 58, borderRadius: 50, border: "none", background: "#E0F479",
              color: "#0D0D0D", fontFamily: "inherit", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
              boxShadow: "0 0 24px rgba(224,244,121,0.3)",
            }}
          >
            End run
          </button>
        </div>
      </div>
    </div>
  );
}
