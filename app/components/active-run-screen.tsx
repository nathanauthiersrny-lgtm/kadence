"use client";

import { useEffect, useRef, useState } from "react";
import { useRunTracker, type LatLon } from "../lib/hooks/use-run-tracker";
import { useStreak } from "../lib/hooks/use-streak";
import { type FlashRun, getActiveBoost, getPlayerPosition } from "../lib/hooks/use-flash-run";
import { KPill, KIcon } from "./ui/primitives";
import type { RunResult } from "../lib/hooks/use-run-tracker";

function fmt(mm: number, ss: number) {
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function isSprint(kmh: number) {
  return kmh >= 16;
}

type RunGoal = { distanceKm: number; timeMinutes: number };

type Props = {
  onEnd: (result: RunResult, snapshot: { distanceMeters: number; durationSeconds: number; reachedSprint: boolean; routeCoords: LatLon[] }) => void;
  onCancel: () => void;
  flashRun?: FlashRun;
  runGoal?: RunGoal;
};

export function ActiveRunScreen({ onEnd, onCancel, flashRun, runGoal }: Props) {
  const { isRunning, isPaused, distanceMeters, durationSeconds, speedKmh, route, geoError, startRun, pauseRun, resumeRun, stopRun } = useRunTracker();
  const { multiplier } = useStreak();

  const [started, setStarted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const reachedSprintRef = useRef(false);

  const [activeBoost, setActiveBoost] = useState(getActiveBoost);
  useEffect(() => {
    const t = setInterval(() => setActiveBoost(getActiveBoost()), 60_000);
    return () => clearInterval(t);
  }, []);

  const racePosition = flashRun ? getPlayerPosition(flashRun, durationSeconds) : 0;
  const isUnderdog = flashRun != null && racePosition >= 4;

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => {
      if (isSprint(speedKmh)) reachedSprintRef.current = true;
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning, speedKmh]);

  useEffect(() => {
    if (!started) { startRun(); setStarted(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = () => {
    const coords = route;
    const result = stopRun();
    onEnd(result, { distanceMeters, durationSeconds, reachedSprint: reachedSprintRef.current, routeCoords: coords });
  };

  const mm = Math.floor(durationSeconds / 60);
  const ss = durationSeconds % 60;
  const distKm = distanceMeters / 1000;
  const paceSecPerKm = distanceMeters > 10 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const paceMm = Math.floor(paceSecPerKm / 60);
  const paceSs = Math.round(paceSecPerKm % 60).toString().padStart(2, "0");
  const paceDisplay = distanceMeters > 10 ? `${paceMm}:${paceSs}` : "—";
  const ghostDelta = runGoal
    ? distanceMeters - ((runGoal.distanceKm * 1000) / (runGoal.timeMinutes * 60)) * durationSeconds
    : null;
  const kadEarned = distKm * multiplier;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      color: "#fff", fontFamily: "var(--font-sans)",
      background: "#000000", minHeight: "100dvh",
      padding: "18px 18px 28px",
    }}>

      {/* Top bar: GPS pill left — Cancel + KAD right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {flashRun ? (
          <KPill pulse icon={<KIcon name="trophy" size={11} color="#E0F479" />}>
            RACE · {(flashRun.distanceM / 1000).toFixed(0)} km
          </KPill>
        ) : runGoal ? (
          <KPill pulse icon={<KIcon name="target" size={11} color="#E0F479" />}>
            GOAL · {runGoal.distanceKm} km
          </KPill>
        ) : (
          <KPill pulse icon={<KIcon name="target" size={11} color="#E0F479" />}>GPS</KPill>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>
            +{kadEarned.toFixed(2)} KAD
          </span>
        </div>
      </div>

      {/* Boost / race / underdog pills */}
      {(!flashRun && activeBoost) && (
        <div style={{
          marginTop: 10,
          padding: "6px 12px",
          background: "rgba(224,244,121,0.15)",
          border: "1px solid rgba(224,244,121,0.4)",
          borderRadius: 50,
          fontSize: 13, fontWeight: 400, color: "#E0F479",
          alignSelf: "flex-start",
        }}>
          ☀️ {activeBoost.multiplier}x BOOST
        </div>
      )}
      {flashRun && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <div style={{
            padding: "6px 12px",
            background: "rgba(224,244,121,0.15)",
            border: "1px solid rgba(224,244,121,0.4)",
            borderRadius: 50,
            fontSize: 13, fontWeight: 400, color: "#E0F479",
            alignSelf: "flex-start",
          }}>
            🏆 RACE ACTIVE · {flashRun.name}
          </div>
          {isUnderdog && (
            <div style={{
              padding: "4px 12px",
              fontSize: 12, color: "rgba(224,244,121,0.6)",
              alignSelf: "flex-start",
            }}>
              🔥 Underdog boost active
            </div>
          )}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 32,
        }}>
          <div style={{
            background: "#1A1A1A", borderRadius: 20, padding: "28px 24px",
            border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 320,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Cancel this run?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
              No KAD will be earned.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  height: 48, borderRadius: 50, border: "none", cursor: "pointer",
                  background: "#E0F479", color: "#0D0D0D",
                  fontFamily: "inherit", fontWeight: 700, fontSize: 15,
                }}
              >
                Keep running
              </button>
              <button
                onClick={() => { stopRun(); onCancel(); }}
                style={{
                  height: 48, borderRadius: 50, cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
                  color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontWeight: 500, fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer — centered in the space between top bar and bottom group */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          fontSize: 12, color: "#FFFFFF", letterSpacing: "0.2em",
          textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
        }}>
          Duration
        </div>
        <div style={{
          fontSize: 156, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.85,
          color: "#FFFFFF", fontVariantNumeric: "tabular-nums",
        }}>
          {fmt(mm, ss)}
        </div>
      </div>

      {/* Bottom group: stat cards + buttons — flex-end */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Stat cards — Distance / Pace */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Distance", value: distKm.toFixed(2), unit: "km" },
            { label: "Pace",     value: paceDisplay,        unit: "/km" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#1A1A1A",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16, padding: "14px 16px",
            }}>
              <div style={{
                fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
                fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em",
                color: "#FFFFFF", fontVariantNumeric: "tabular-nums", lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: "rgba(255,255,255,0.4)" }}>
                {s.unit}
              </div>
            </div>
          ))}
        </div>

        {/* Ghost pacer */}
        {runGoal && ghostDelta !== null && (
          <div style={{
            background: "#1A1A1A",
            border: `1px solid ${ghostDelta >= 0 ? "rgba(224,244,121,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 16, padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{
                fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
                fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4,
              }}>
                Ghost pacer
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {runGoal.distanceKm} km in {runGoal.timeMinutes} min
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: ghostDelta >= 0 ? "#E0F479" : "#ef4444",
                lineHeight: 1,
              }}>
                {ghostDelta >= 0 ? "+" : ""}{Math.round(ghostDelta)} m
              </div>
              <div style={{
                fontSize: 11, marginTop: 2,
                color: ghostDelta >= 0 ? "rgba(224,244,121,0.6)" : "rgba(239,68,68,0.6)",
              }}>
                {ghostDelta >= 0 ? "Ahead" : "Behind"}
              </div>
            </div>
          </div>
        )}

        {/* GPS error */}
        {geoError && (
          <div style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 12, fontSize: 13, color: "#ef4444",
          }}>
            GPS error: {geoError}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12 }}>
          <button
            onClick={() => isPaused ? resumeRun() : pauseRun()}
            style={{
              height: 68, borderRadius: 50,
              border: "2.5px solid #FFFFFF", background: "transparent",
              color: "#FFFFFF", fontFamily: "inherit", fontWeight: 700, fontSize: 16,
              letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={handleEnd}
            style={{
              height: 68, borderRadius: 50, border: "none",
              background: "#E0F479", color: "#000000",
              fontFamily: "inherit", fontWeight: 700, fontSize: 16,
              letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            End run
          </button>
        </div>

      </div>
    </div>
  );
}
