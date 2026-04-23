"use client";

import { useEffect, useRef, useState } from "react";
import { useXP } from "../lib/hooks/use-xp";
import { useStreak } from "../lib/hooks/use-streak";
import { useQuests } from "../lib/hooks/use-quests";
import { useBadges, incrementTotalRuns, getTotalRuns } from "../lib/hooks/use-badges";
import { type RaceResult, positionSuffix } from "../lib/hooks/use-flash-run";
import { RacePodium } from "./flash-run-screen";
import { KCard, KButton, KIcon } from "./ui/primitives";
import type { Badge } from "../lib/hooks/use-badges";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDuration(s: number) {
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPace(distM: number, sec: number) {
  if (distM < 10) return "—";
  const secPerKm = (sec / distM) * 1000;
  return `${Math.floor(secPerKm / 60)}:${Math.round(secPerKm % 60).toString().padStart(2, "0")} /km`;
}

function rarity(distKm: number, paceMinPerKm: number): { stars: number; label: string } {
  let stars = 1;
  if (distKm >= 2)  stars = 2;
  if (distKm >= 5)  stars = 3;
  if (distKm >= 10) stars = 4;
  if (distKm >= 21) stars = 5;
  if (paceMinPerKm < 5 && stars < 5) stars = Math.min(stars + 1, 5);
  const labels = ["", "Common", "Common", "Rare", "Epic", "Legendary"];
  return { stars, label: labels[stars] };
}

// ─── Star row ─────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <KIcon
          key={i}
          name="sparkle"
          size={16}
          color="#E0F479"
          fill={i <= count ? "#E0F479" : "none"}
        />
      ))}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RunSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
  reachedSprint: boolean;
};

type Props = {
  snapshot: RunSnapshot;
  multiplier: number;
  onClaim: () => Promise<void>;
  onBack: () => void;
  isClaiming: boolean;
  claimed: boolean;
  raceResult?: RaceResult;
};

// ─── Post-run screen ──────────────────────────────────────────────────────────

export function PostRunScreen({ snapshot, multiplier, onClaim, onBack, isClaiming, claimed, raceResult }: Props) {
  const { distanceMeters, durationSeconds, reachedSprint } = snapshot;
  const distKm = distanceMeters / 1000;
  const paceSecPerKm = distanceMeters > 0 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const paceMinPerKm = paceSecPerKm / 60;
  const calsBurned = Math.round(distKm * 70);
  const { stars, label: rarityLabel } = rarity(distKm, paceMinPerKm);

  const kadEarned = distKm * multiplier;
  const xpEarned = Math.round(distKm * 10 * multiplier);

  const { level: levelBefore, levelXP: xpBefore, levelTitle, nextTitle, addXP } = useXP();
  const { streak, recordRun } = useStreak();
  const { completeQuest } = useQuests();
  const { checkAndUnlock } = useBadges();

  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [levelAfter, setLevelAfter] = useState(levelBefore);
  const [xpAfter, setXpAfter] = useState(xpBefore);
  const hasApplied = useRef(false);

  useEffect(() => {
    if (hasApplied.current) return;
    hasApplied.current = true;

    // Update streak
    recordRun();

    // Update quest progress
    completeQuest(distKm);

    // Update XP
    addXP(xpEarned);
    const newTotal = xpBefore + xpEarned; // approximate for display
    setLevelAfter(Math.max(1, Math.floor(newTotal / 100) + 1));
    setXpAfter(newTotal % 100);

    // Unlock badges
    const totalRuns = incrementTotalRuns();
    const unlocked = checkAndUnlock({
      distanceKm: distKm,
      durationSeconds,
      streak: streak + 1,
      reachedSprint,
      totalRuns,
    });
    setNewBadges(unlocked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const xpBarWidth = Math.min(xpAfter, 100);
  const didLevelUp = levelAfter > levelBefore;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.24em", color: "rgba(255,255,255,0.5)" }}>
          {raceResult ? "Race complete" : "Run complete"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>
          {raceResult
            ? raceResult.dnf ? "Distance not reached." : `${positionSuffix(raceResult.position)} at submission`
            : distKm >= 10 ? "Incredible effort." : distKm >= 5 ? "Solid run." : "Good work."}
        </div>
      </div>

      {/* Race result (if this was a flash run) */}
      {raceResult && (raceResult.dnf ? (
        <div style={{ padding: "20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(239,68,68,0.7)", fontWeight: 700, marginBottom: 8 }}>
            Race · Distance not met
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Run doesn&apos;t count
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            You covered {(raceResult.distanceM / 1000).toFixed(2)} km.
            Your KAD reward still applies.
          </div>
        </div>
      ) : (
        <RacePodium
          eventId={raceResult.eventId}
          position={raceResult.position}
          totalParticipants={raceResult.totalParticipants}
          durationSec={raceResult.durationSec}
        />
      ))}

      {/* KAD hero */}
      <div style={{
        position: "relative",
        textAlign: "center",
        padding: "28px 0 20px",
        borderRadius: 24,
        background: "radial-gradient(ellipse at center, rgba(224,244,121,0.18) 0%, rgba(224,244,121,0) 60%)",
      }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", color: "#E0F479", fontWeight: 700 }}>You earned</div>
        <div style={{
          fontSize: 88,
          fontWeight: 700,
          color: "#E0F479",
          letterSpacing: "-0.05em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          marginTop: 8,
          textShadow: "0 0 40px rgba(224,244,121,0.5)",
        }}>
          {kadEarned.toFixed(2)}
        </div>
        <div style={{ fontSize: 18, color: "rgba(224,244,121,0.7)", letterSpacing: "0.08em", marginTop: 4, fontWeight: 500 }}>KAD</div>
        <Stars count={stars} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {rarityLabel} run
        </div>
      </div>

      {/* Level / XP bar */}
      <KCard padding={14}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
            {didLevelUp ? `Level ${levelBefore} → ${levelAfter} 🎉` : `Level ${levelBefore}`}
          </span>
          <span style={{ fontSize: 12, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>+{xpEarned} XP</span>
        </div>
        <div style={{ height: 10, borderRadius: 50, background: "rgba(224,244,121,0.1)", overflow: "hidden" }}>
          <div style={{
            width: `${xpBarWidth}%`,
            height: "100%",
            background: "linear-gradient(90deg, #3FB977, #E0F479)",
            boxShadow: "0 0 8px rgba(224,244,121,0.5)",
            borderRadius: 50,
            transition: "width 0.8s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
          {100 - xpAfter > 0
            ? <>{100 - xpAfter} XP to unlock <span style={{ color: "#E0F479" }}>{nextTitle}</span></>
            : <span style={{ color: "#3FB977" }}>Level up!</span>
          }
        </div>
      </KCard>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Time",  value: formatDuration(durationSeconds) },
          { label: "Dist",  value: `${distKm.toFixed(2)} km` },
          { label: "Pace",  value: formatPace(distanceMeters, durationSeconds) },
          { label: "Cal",   value: String(calsBurned) },
          { label: "XP",    value: `+${xpEarned}` },
          { label: "Boost", value: `${multiplier}×` },
        ].map((s) => (
          <div key={s.label} style={{ padding: "12px 10px", background: "#1A1A1A", border: "1px solid rgba(224,244,121,0.15)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* New badge unlocks */}
      {newBadges.map((badge) => (
        <div key={badge.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(224,244,121,0.08)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "#E0F479", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <KIcon name={badge.icon as Parameters<typeof KIcon>[0]["name"]} size={22} color="#0D0D0D" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#E0F479", fontWeight: 700 }}>Badge unlocked</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 1 }}>{badge.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{badge.desc}</div>
          </div>
        </div>
      ))}

      {/* CTAs */}
      <KButton
        size="lg"
        style={{ width: "100%" }}
        onClick={onClaim}
        disabled={isClaiming || claimed}
      >
        {claimed ? "Claimed ✓" : isClaiming ? "Recording…" : `Claim ${kadEarned.toFixed(2)} KAD`}
      </KButton>

      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0" }}
      >
        Back to home
      </button>
    </div>
  );
}
