"use client";

import dynamic from "next/dynamic";
import { useRunHistory } from "../lib/hooks/use-run-history";
import { KIcon } from "./ui/primitives";
import type { RunEntry } from "../lib/hooks/use-run-history";

const MiniRunMap = dynamic(() => import("./mini-run-map").then((m) => m.MiniRunMap), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: 80, background: "#111" }} />,
});

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const num = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${weekday} ${num} ${month} · ${time}`;
}

function fmtDuration(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function fmtPace(paceSecPerKm: number): string {
  if (!paceSecPerKm) return "—";
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60).toString().padStart(2, "0");
  return `${m}'${s}"`;
}

type Props = {
  onBack: () => void;
  onStart: () => void;
};

export function ActivityScreen({ onBack, onStart }: Props) {
  const {
    runs,
    totalKad, totalDistKm, totalRuns,
    weekRunCount, weekKad, weekDistKm,
  } = useRunHistory();

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      color: "#fff", fontFamily: "var(--font-sans)",
      background: "#0D0D0D", minHeight: "100dvh",
    }}>

      {/* Header */}
      <div style={{ padding: "20px 18px 0" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "rgba(255,255,255,0.5)", fontSize: 13,
            fontFamily: "inherit", padding: "0 0 16px",
          }}
        >
          <KIcon name="chevron" size={15} color="rgba(255,255,255,0.5)" style={{ transform: "rotate(180deg)" }} />
          Back
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Activity</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            {totalRuns} {totalRuns === 1 ? "run" : "runs"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 18px 40px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Lifetime summary — 3 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Total KAD",    value: totalKad.toFixed(1) },
            { label: "Distance · km", value: totalDistKm.toFixed(1) },
            { label: "Total runs",   value: String(totalRuns) },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16, padding: 16,
            }}>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.45)",
                fontWeight: 400, marginBottom: 8, lineHeight: 1.3,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em",
                color: "#FFFFFF", lineHeight: 1, fontVariantNumeric: "tabular-nums",
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* This week card */}
        <div style={{
          background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 16, padding: "14px 16px",
        }}>
          <div style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.4)", fontWeight: 700, marginBottom: 12,
          }}>
            This week
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { label: "Runs", value: String(weekRunCount) },
              { label: "KAD",  value: weekKad.toFixed(1) },
              { label: "km",   value: weekDistKm.toFixed(1) },
            ].map((s, i) => (
              <div key={s.label} style={{
                borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                paddingLeft: i > 0 ? 16 : 0,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 700, color: "#E0F479",
                  fontVariantNumeric: "tabular-nums", lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section label */}
        <div style={{
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 4,
        }}>
          Recent runs
        </div>

        {/* Run list or empty state */}
        {runs.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "64px 20px", gap: 12, textAlign: "center",
          }}>
            <KIcon name="route" size={42} color="rgba(255,255,255,0.18)" />
            <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
              No runs yet.
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 240, lineHeight: 1.55 }}>
              Complete your first run to see your history.
            </div>
            <button
              onClick={onStart}
              style={{
                marginTop: 12, padding: "10px 28px", borderRadius: 50,
                border: "1.5px solid #E0F479", background: "transparent",
                color: "#E0F479", fontFamily: "inherit", fontWeight: 700,
                fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Start a Run
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

function RunCard({ run }: { run: RunEntry }) {
  const hasRoute = run.routeCoords.length >= 2;
  const distKm = run.distance / 1000;

  return (
    <div style={{
      background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 16, padding: 16, overflow: "hidden",
    }}>

      {/* Top row: date + KAD */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
          {fmtDate(run.date)}
        </span>
        <span style={{
          fontSize: 16, fontWeight: 700, color: "#E0F479",
          fontVariantNumeric: "tabular-nums",
        }}>
          +{run.kadEarned.toFixed(2)} KAD
        </span>
      </div>

      {/* Middle row: Distance / Duration / Pace */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{
            fontSize: 24, fontWeight: 700, color: "#FFFFFF",
            fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 4,
          }}>
            {distKm.toFixed(2)} km
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Distance</div>
        </div>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 400, color: "#FFFFFF",
            fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 4,
          }}>
            {fmtDuration(run.duration)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Duration</div>
        </div>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 400, color: "#FFFFFF",
            fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 4,
          }}>
            {fmtPace(run.pace)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>/km</div>
        </div>
      </div>

      {/* Bottom: mini map or lime divider */}
      {hasRoute ? (
        <div style={{ borderRadius: 8, overflow: "hidden" }}>
          <MiniRunMap coords={run.routeCoords} />
        </div>
      ) : (
        <div style={{ height: 1, background: "rgba(224,244,121,0.25)" }} />
      )}

    </div>
  );
}
