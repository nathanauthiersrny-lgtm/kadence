"use client";

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

type Props = {
  onBack: () => void;
  onHistory: () => void;
};

export function ProfileScreen({ onBack, onHistory }: Props) {
  const { wallet } = useWallet();
  const address = wallet?.account.address ?? "";
  const initials = address ? address.slice(0, 2).toUpperCase() : "??";

  const { data: kadBalance } = useKadBalance(address || undefined);
  const { level, levelXP, levelTitle } = useXP();
  const { streak, multiplier } = useStreak();
  const { badges } = useBadges();
  const { runs, totalDistKm, totalRuns } = useRunHistory();

  const totalDurationSec = runs.reduce((s, r) => s + r.duration, 0);
  const totalKad = kadBalance?.uiAmount ?? 0;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(
      () => toast.success("Address copied"),
      () => toast.error("Couldn't copy"),
    );
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
            background: "#1A1A1A",
            border: "2px solid rgba(224,244,121,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 700, color: "#E0F479",
            letterSpacing: "-0.02em",
          }}>
            {initials}
          </div>
          {address && (
            <button
              onClick={copyAddress}
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
          )}
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
            { label: "Total km",   value: totalDistKm.toFixed(1) },
            { label: "Total time", value: fmtTotalTime(totalDurationSec) },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16, padding: 14,
            }}>
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
      </div>
    </div>
  );
}
