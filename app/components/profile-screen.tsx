"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "../lib/wallet/context";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useXP } from "../lib/hooks/use-xp";
import { useStreak } from "../lib/hooks/use-streak";
import { useBadges } from "../lib/hooks/use-badges";
import { useRunHistory } from "../lib/hooks/use-run-history";
import { ellipsify } from "../lib/explorer";
import { KIcon } from "./ui/primitives";

function fmtTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function avatarColor(addr: string): string {
  const hex = addr.replace(/[^a-fA-F0-9]/g, "").slice(0, 6).padEnd(6, "0");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lr = Math.min(255, Math.floor(r * 0.6 + 80));
  const lg = Math.min(255, Math.floor(g * 0.6 + 80));
  const lb = Math.min(255, Math.floor(b * 0.6 + 80));
  return `rgb(${lr},${lg},${lb})`;
}

const KM_PER_MI = 1.60934;

type Props = {
  onBack: () => void;
  onHistory: () => void;
};

export function ProfileScreen({ onBack, onHistory }: Props) {
  const { wallet, disconnect } = useWallet();
  const address = wallet?.account.address ?? "";

  const [profileName, setProfileName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [unit, setUnit] = useState<"km" | "mi">("km");

  useEffect(() => {
    const saved = localStorage.getItem("kadence_profile_name");
    if (saved) setProfileName(saved);
    const savedUnit = localStorage.getItem("kadence_unit");
    if (savedUnit === "mi") setUnit("mi");
  }, []);

  const avatarLetter = profileName
    ? profileName[0].toUpperCase()
    : address
      ? address[0].toUpperCase()
      : "?";
  const avatarBg = address ? avatarColor(address) : "#555";

  const { data: kadBalance } = useKadBalance(address || undefined);
  const { level, levelXP, levelTitle } = useXP();
  const { streak, multiplier } = useStreak();
  const { badges } = useBadges();
  const { runs, totalDistKm, totalRuns } = useRunHistory();

  const totalDurationSec = runs.reduce((s, r) => s + r.duration, 0);
  const totalKad = kadBalance?.uiAmount ?? 0;

  const displayDist = unit === "mi" ? totalDistKm / KM_PER_MI : totalDistKm;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(
      () => toast.success("Address copied"),
      () => toast.error("Couldn't copy"),
    );
  };

  const saveName = () => {
    const trimmed = nameInput.trim().slice(0, 20);
    if (trimmed) {
      localStorage.setItem("kadence_profile_name", trimmed);
      setProfileName(trimmed);
    }
    setEditingName(false);
  };

  const startEditing = () => {
    setNameInput(profileName);
    setEditingName(true);
  };

  const toggleUnit = (u: "km" | "mi") => {
    setUnit(u);
    localStorage.setItem("kadence_unit", u);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      color: "#fff", fontFamily: "var(--font-sans)",
      background: "#0D0D0D", minHeight: "100dvh",
    }}>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 18px 8px",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "inline-flex", alignItems: "center",
          }}
        >
          <KIcon name="chevron" size={18} color="rgba(255,255,255,0.6)" style={{ transform: "rotate(180deg)" }} />
        </button>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
          Profile
        </span>
        <span style={{ width: 26 }} />
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 40px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Avatar + identity */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 8 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 700, color: "#FFFFFF",
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}>
            {avatarLetter}
          </div>

          {editingName ? (
            <form
              onSubmit={(e) => { e.preventDefault(); saveName(); }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                onBlur={saveName}
                placeholder="Add your name"
                maxLength={20}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(224,244,121,0.4)",
                  borderRadius: 10,
                  padding: "8px 14px",
                  color: "#fff",
                  fontSize: 16,
                  fontFamily: "inherit",
                  outline: "none",
                  textAlign: "center",
                  width: 200,
                }}
              />
            </form>
          ) : profileName ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <button
                onClick={startEditing}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>
                  {profileName}
                </span>
              </button>
              {address && (
                <button
                  onClick={copyAddress}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "none", border: "none", cursor: "pointer",
                    padding: "2px 8px", borderRadius: 8,
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    fontSize: 13, color: "rgba(255,255,255,0.45)",
                    fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
                  }}>
                    {ellipsify(address, 4)}
                  </span>
                  <KIcon name="share" size={12} color="rgba(255,255,255,0.3)" />
                </button>
              )}
            </div>
          ) : address ? (
            <button
              onClick={startEditing}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 8px", borderRadius: 8,
                fontFamily: "inherit",
              }}
            >
              <span style={{
                fontSize: 14, color: "rgba(255,255,255,0.7)",
                fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
              }}>
                {ellipsify(address, 4)}
              </span>
              <KIcon name="share" size={13} color="rgba(255,255,255,0.4)" />
            </button>
          ) : null}
        </div>

        {/* KAD balance hero */}
        <div style={{ textAlign: "center", paddingBottom: 4 }}>
          <div style={{
            fontSize: 48, fontWeight: 700, color: "#FFFFFF",
            letterSpacing: "-0.04em", lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {totalKad.toFixed(2)} <span style={{ fontSize: 22, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.05em" }}>KAD</span>
          </div>
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8,
            letterSpacing: "0.05em",
          }}>
            Total earned
          </div>
        </div>

        {/* Level card */}
        <div style={{
          background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 16, padding: "16px 18px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
              Level {level} · {levelTitle}
            </span>
            <span style={{ fontSize: 14, color: "#E0F479", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
              {levelXP} / 100 XP
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{
              width: `${levelXP}%`, height: "100%",
              background: "#E0F479", borderRadius: 3,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>

        {/* Lifetime stats — 3 cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { label: "Total runs", value: String(totalRuns) },
            { label: `Total ${unit}`, value: displayDist.toFixed(1), tap: true },
            { label: "Total time", value: fmtTotalTime(totalDurationSec) },
          ].map((s) => (
            <div
              key={s.label}
              onClick={s.tap ? () => toggleUnit(unit === "km" ? "mi" : "km") : undefined}
              style={{
                background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 16, padding: 14,
                cursor: s.tap ? "pointer" : undefined,
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.3 }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700, color: "#FFFFFF",
                letterSpacing: "-0.04em", lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Streak card */}
        <div style={{
          background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 16, padding: "16px 18px",
        }}>
          <div style={{
            fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 8,
          }}>
            Current streak
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <span style={{
              fontSize: 32, fontWeight: 700, color: "#FFFFFF",
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", lineHeight: 1,
            }}>
              {streak}
            </span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              {streak === 1 ? "day" : "days"}
            </span>
            {multiplier > 1 && (
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#E0F479", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {multiplier}× boost
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < Math.min(streak, 7) ? "#E0F479" : "rgba(224,244,121,0.15)",
              }} />
            ))}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 style={{
            fontSize: 20, fontWeight: 600, color: "#FFFFFF",
            margin: "0 0 12px", letterSpacing: "-0.01em",
          }}>
            Badges
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400, marginLeft: 8 }}>
              {badges.filter((b) => b.earned).length} / {badges.length}
            </span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {badges.map((b) => (
              <div
                key={b.id}
                title={b.desc}
                style={{
                  aspectRatio: "1", borderRadius: 14,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 6,
                  background: b.earned ? "rgba(224,244,121,0.08)" : "transparent",
                  border: `1px solid ${b.earned ? "#E0F479" : "rgba(255,255,255,0.2)"}`,
                  padding: "0 4px",
                }}
              >
                <KIcon
                  name={b.icon as Parameters<typeof KIcon>[0]["name"]}
                  size={22}
                  color={b.earned ? "#E0F479" : "rgba(255,255,255,0.25)"}
                />
                <span style={{
                  fontSize: 9, textAlign: "center",
                  color: b.earned ? "rgba(224,244,121,0.9)" : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.04em", lineHeight: 1.15,
                }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity history link */}
        <button
          onClick={onHistory}
          style={{
            width: "100%", height: 56, borderRadius: 16,
            background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
            cursor: "pointer", padding: "0 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <KIcon name="timer" size={18} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
              Activity history
            </span>
          </div>
          <KIcon name="chevron" size={16} color="rgba(255,255,255,0.4)" />
        </button>

        {/* Disconnect */}
        <button
          onClick={disconnect}
          style={{
            width: "100%", height: 56, borderRadius: 16,
            background: "transparent",
            border: "1px solid rgba(255,80,80,0.25)",
            cursor: "pointer", padding: "0 18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,80,80,0.8)" }}>
            Disconnect wallet
          </span>
        </button>
      </div>
    </div>
  );
}
