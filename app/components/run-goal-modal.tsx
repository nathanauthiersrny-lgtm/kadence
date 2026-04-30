"use client";

import { useState } from "react";

type Props = {
  onStart: (goal: { distanceKm: number; timeMinutes: number }) => void;
  onFreeRun: () => void;
};

export function RunGoalModal({ onStart, onFreeRun }: Props) {
  const [distance, setDistance] = useState("");
  const [time, setTime] = useState("");

  const distNum = parseFloat(distance);
  const timeNum = parseFloat(time);
  const valid = distNum > 0 && timeNum > 0 && isFinite(distNum) && isFinite(timeNum);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 32,
      }}
      onClick={onFreeRun}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1A", borderRadius: 20, padding: "28px 24px",
          border: "1px solid rgba(255,255,255,0.1)",
          width: "100%", maxWidth: 320,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          Set a goal
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
          Race a ghost pacer to hit your target
        </div>

        {/* Distance input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
            fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8,
          }}>
            Distance
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="5"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", fontSize: 16, fontFamily: "inherit",
                padding: "0 48px 0 16px",
                outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "rgba(255,255,255,0.4)",
            }}>
              km
            </span>
          </div>
        </div>

        {/* Time input */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
            fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8,
          }}>
            Time
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="30"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", fontSize: 16, fontFamily: "inherit",
                padding: "0 48px 0 16px",
                outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "rgba(255,255,255,0.4)",
            }}>
              min
            </span>
          </div>
        </div>

        {/* Let's run button */}
        <button
          disabled={!valid}
          onClick={() => onStart({ distanceKm: distNum, timeMinutes: timeNum })}
          style={{
            width: "100%", height: 48, borderRadius: 50, border: "none",
            background: valid ? "#E0F479" : "rgba(224,244,121,0.3)",
            color: "#0D0D0D", fontFamily: "inherit", fontWeight: 700, fontSize: 15,
            cursor: valid ? "pointer" : "not-allowed",
            marginBottom: 14,
          }}
        >
          Let&apos;s run
        </button>

        {/* Free run link */}
        <button
          onClick={onFreeRun}
          style={{
            width: "100%", background: "none", border: "none",
            color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "inherit",
            cursor: "pointer", padding: 4,
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Free run (no pacer)
        </button>
      </div>
    </div>
  );
}
