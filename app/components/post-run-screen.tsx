"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useXP } from "../lib/hooks/use-xp";
import { useStreak } from "../lib/hooks/use-streak";
import { useQuests } from "../lib/hooks/use-quests";
import { useBadges, incrementTotalRuns } from "../lib/hooks/use-badges";
import { type RaceResult, positionSuffix } from "../lib/hooks/use-flash-run";
import { RacePodium } from "./flash-run-screen";
import { KIcon } from "./ui/primitives";
import { generateRunCardPNG } from "../lib/run-card-png";
import type { Badge } from "../lib/hooks/use-badges";
import type { LatLon } from "../lib/hooks/use-run-tracker";

function formatDuration(s: number) {
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPace(distM: number, sec: number) {
  if (distM < 10) return "—";
  const secPerKm = (sec / distM) * 1000;
  return `${Math.floor(secPerKm / 60)}:${Math.round(secPerKm % 60).toString().padStart(2, "0")}`;
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

type RunSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
  reachedSprint: boolean;
  baseKAD: number;
  boostMultiplier: number;
  boostName: string | null;
  underdogMultiplier: number;
  socialMultiplier: number;
  finalKAD: number;
};

type Props = {
  snapshot: RunSnapshot;
  multiplier: number;
  onClaim: () => Promise<void>;
  onBack: () => void;
  isClaiming: boolean;
  claimed: boolean;
  raceResult?: RaceResult;
  onShare?: () => void;
  isShared?: boolean;
  communityName?: string;
  routeCoords?: LatLon[];
  runnerName?: string;
  profileSlug?: string;
  txSignature?: string | null;
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

// Deterministic sparkle positions (avoids hydration mismatch from Math.random)
const SPARKLE_POS = [[140, 200], [280, 160], [100, 320], [320, 320]] as const;

export function PostRunScreen({ snapshot, multiplier, onClaim, onBack, isClaiming, claimed, raceResult, onShare, isShared, communityName, routeCoords, runnerName, profileSlug, txSignature, flashRunEventName, flashRunPosition, flashRunTotalRunners }: Props) {
  const { distanceMeters, durationSeconds, reachedSprint, baseKAD, boostMultiplier: boostMult, underdogMultiplier: underdogMult, socialMultiplier: socialMult, finalKAD } = snapshot;
  const distKm = distanceMeters / 1000;
  const paceSecPerKm = distanceMeters > 0 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const paceMinPerKm = paceSecPerKm / 60;
  const calsBurned = Math.round(distKm * 70);
  const { stars, label: rarityLabel } = rarity(distKm, paceMinPerKm);
  const xpEarned = Math.round(distKm * 10 * multiplier);

  const hasMultipliers = multiplier > 1 || boostMult > 1 || underdogMult > 1 || socialMult > 1;
  const afterStreak = baseKAD * multiplier;
  const streakContrib = afterStreak - baseKAD;
  const afterBoost = afterStreak * boostMult;
  const boostContrib = afterBoost - afterStreak;
  const afterUnderdog = afterBoost * underdogMult;
  const underdogContrib = afterUnderdog - afterBoost;
  const socialContrib = afterUnderdog * socialMult - afterUnderdog;

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
    recordRun();
    const stored = JSON.parse(localStorage.getItem("kad_streak") ?? "{}");
    const currentStreak: number = stored.streak ?? 0;
    completeQuest(distKm);
    addXP(xpEarned);
    const newTotal = xpBefore + xpEarned;
    setLevelAfter(Math.max(1, Math.floor(newTotal / 100) + 1));
    setXpAfter(newTotal % 100);
    const totalRuns = incrementTotalRuns();
    const unlocked = checkAndUnlock({ distanceKm: distKm, durationSeconds, streak: currentStreak, reachedSprint, totalRuns });
    setNewBadges(unlocked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);

  const buildPngParams = useCallback(() => {
    const paceSecPerKmVal = distanceMeters > 0 ? (durationSeconds / distanceMeters) * 1000 : 0;
    const pMin = Math.floor(paceSecPerKmVal / 60);
    const pSec = Math.round(paceSecPerKmVal % 60);
    const hh = Math.floor(durationSeconds / 3600);
    const mm = Math.floor((durationSeconds % 3600) / 60).toString().padStart(2, "0");
    const ss = (durationSeconds % 60).toString().padStart(2, "0");
    return {
      distanceKm: distKm,
      durationFormatted: hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`,
      paceFormatted: `${pMin}:${pSec.toString().padStart(2, "0")}`,
      kadEarned: finalKAD,
      routeCoords: routeCoords || [],
      txSignature: txSignature ?? null,
      runnerName: runnerName || "Runner",
      rarity: { stars, label: rarityLabel },
      flashRunEventName,
      flashRunPosition,
      flashRunTotalRunners,
    };
  }, [distKm, distanceMeters, durationSeconds, finalKAD, routeCoords, txSignature, runnerName, stars, rarityLabel, flashRunEventName, flashRunPosition, flashRunTotalRunners]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await generateRunCardPNG(buildPngParams());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kadence-run-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate run card:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [buildPngParams]);

  const handleTweet = useCallback(() => {
    const paceSecPerKmVal = distanceMeters > 0 ? (durationSeconds / distanceMeters) * 1000 : 0;
    const pMin = Math.floor(paceSecPerKmVal / 60);
    const pSec = Math.round(paceSecPerKmVal % 60);
    const paceStr = `${pMin}:${pSec.toString().padStart(2, "0")}`;
    const tweetText = `Just ran ${distKm.toFixed(2)}km at ${paceStr}/km and earned ${finalKAD.toFixed(2)} $KAD on @kadenceRun \u{1F525}`;
    const parts = [`text=${encodeURIComponent(tweetText)}`];
    if (profileSlug) {
      const profileUrl = `${window.location.origin}/u/${profileSlug}`;
      parts.push(`url=${encodeURIComponent(profileUrl)}`);
    }
    window.open(`https://twitter.com/intent/tweet?${parts.join("&")}`, "_blank");
  }, [distKm, distanceMeters, durationSeconds, finalKAD, profileSlug]);

  const xpBarWidth = Math.min(xpAfter, 100);
  const didLevelUp = levelAfter > levelBefore;

  const heroTitle = raceResult
    ? raceResult.dnf ? "Distance not\nreached." : `${positionSuffix(raceResult.position)} at submission`
    : distKm >= 10 ? "Incredible\neffort." : distKm >= 5 ? "Solid\nrun." : "Good\nwork.";

  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const weekday = new Date().toLocaleDateString([], { weekday: "short" });

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* ── Editorial hero ─────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 440, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `
          radial-gradient(ellipse at 50% 55%, rgba(224,244,121,0.45) 0%, rgba(224,244,121,0.1) 30%, transparent 60%),
          linear-gradient(180deg, #0D1510 0%, #0D0D0D 80%)
        ` }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 55%, rgba(224,244,121,0.3) 0%, transparent 40%)",
          animation: "kadHeroBreath 4s ease-in-out infinite",
        }} />
        <svg viewBox="0 0 414 440" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <g fill="rgba(255,255,255,0.05)">
            {Array.from({ length: 70 }).map((_, i) => (
              <circle key={i} cx={(i * 47 + 13) % 414} cy={(i * 31 + 7) % 440} r={(i % 3) * 0.4 + 0.3} />
            ))}
          </g>
          {SPARKLE_POS.map((p, i) => (
            <g key={i} transform={`translate(${p[0]} ${p[1]})`} stroke="#E0F479" strokeWidth="1" opacity="0.6">
              <path d="M0 -8 V -3 M0 8 V 3 M-8 0 H -3 M8 0 H 3" />
            </g>
          ))}
        </svg>

        <div style={{ position: "absolute", top: 18, left: 22, right: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3FB977", boxShadow: "0 0 8px #3FB977" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              {raceResult ? "Race complete" : "Run complete"}
            </span>
          </div>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
            {timestamp} · {weekday}
          </span>
        </div>

        <div style={{ position: "absolute", left: 22, right: 22, bottom: 36, textAlign: "center" }}>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.92 }}>
            {heroTitle.split("\n").map((line, i) => <span key={i}>{line}{i < heroTitle.split("\n").length - 1 && <br />}</span>)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.24em", fontWeight: 700 }}>You earned</div>
          <div style={{
            fontSize: 84, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.05em", lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 32px rgba(224,244,121,0.4)",
            marginTop: 6,
          }}>
            {finalKAD.toFixed(2)}
          </div>
          <div style={{ fontSize: 14, color: "#E0F479", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>KAD</div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <KIcon key={i} name="sparkle" size={14} color={i <= stars ? "#E0F479" : "rgba(255,255,255,0.2)"} fill={i <= stars ? "#E0F479" : "none"} stroke={i <= stars ? 0 : 1.5} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 6, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>{rarityLabel} run</div>
        </div>
      </div>

      {/* ── Bento ──────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Race result (flash run) */}
        {raceResult && (raceResult.dnf ? (
          <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(239,68,68,0.7)", fontWeight: 700, marginBottom: 8 }}>Race · Distance not met</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Run doesn&apos;t count</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              You covered {(raceResult.distanceM / 1000).toFixed(2)} km. Your KAD reward still applies.
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

        {/* KAD breakdown */}
        {hasMultipliers && (
          <div style={{ padding: 16, background: "#1A1A1A", borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              <span>Base</span>
              <span style={{ color: "#fff" }}>{baseKAD.toFixed(2)} KAD</span>
            </div>
            {multiplier > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span>Streak ({multiplier}x)</span>
                <span style={{ color: "#E0F479" }}>+{streakContrib.toFixed(2)} KAD</span>
              </div>
            )}
            {boostMult > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span>Boost ({boostMult}x)</span>
                <span style={{ color: "#E0F479" }}>+{boostContrib.toFixed(2)} KAD</span>
              </div>
            )}
            {underdogMult > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span>Underdog ({underdogMult}x)</span>
                <span style={{ color: "#E0F479" }}>+{underdogContrib.toFixed(2)} KAD</span>
              </div>
            )}
            {socialMult > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                <span>Social ({socialMult}x)</span>
                <span style={{ color: "#E0F479" }}>+{socialContrib.toFixed(2)} KAD</span>
              </div>
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: "#E0F479" }}>{finalKAD.toFixed(2)} KAD</span>
            </div>
            {underdogMult > 1 && raceResult && (
              <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                You finished {positionSuffix(raceResult.position)} — every finish counts. 🔥
              </div>
            )}
          </div>
        )}

        {/* Level + XP bar */}
        <div style={{ padding: 14, borderRadius: 18, background: "linear-gradient(135deg, rgba(224,244,121,0.12) 0%, rgba(63,185,119,0.06) 100%)", border: "1px solid rgba(224,244,121,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>
                {didLevelUp ? `Level ${levelBefore} → ${levelAfter}` : `Level ${levelBefore}`}
              </span>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{levelTitle}</div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>
              +{xpEarned} <span style={{ fontSize: 10, color: "rgba(224,244,121,0.6)" }}>XP</span>
            </span>
          </div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${xpBarWidth}%`, height: "100%", background: "linear-gradient(90deg, #3FB977, #E0F479)", borderRadius: 3, transition: "width 0.8s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
            <span>{xpAfter} / 100 XP</span>
            <span style={{ color: "rgba(224,244,121,0.7)" }}>
              {100 - xpAfter > 0 ? `${100 - xpAfter} XP to ` : ""}<strong>{nextTitle}</strong>
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["Time",  formatDuration(durationSeconds)],
            ["Dist",  `${distKm.toFixed(2)} km`],
            ["Pace",  formatPace(distanceMeters, durationSeconds)],
            ["Cal",   String(calsBurned)],
            ["XP",    `+${xpEarned}`],
            ["Boost", `${multiplier}×`],
          ].map(([l, v], i) => (
            <div key={l} style={{
              borderRadius: 14, padding: 12,
              background: i === 5 ? "#E0F479" : "#1A1A1A",
              color: i === 5 ? "#0D0D0D" : "#fff",
              border: i === 5 ? "none" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700, opacity: i === 5 ? 0.7 : 0.5 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Badge unlocks */}
        {newBadges.map((badge) => (
          <div key={badge.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(224,244,121,0.08)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#E0F479", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <KIcon name={badge.icon as Parameters<typeof KIcon>[0]["name"]} size={22} color="#0D0D0D" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "#E0F479", fontWeight: 700 }}>Badge unlocked</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{badge.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{badge.desc}</div>
            </div>
          </div>
        ))}

        {/* Claim CTA */}
        <button
          onClick={onClaim}
          disabled={isClaiming || claimed}
          style={{
            height: 62, borderRadius: 50, border: "none",
            background: claimed ? "rgba(63,185,119,0.2)" : "#E0F479",
            color: claimed ? "#3FB977" : "#0D0D0D",
            fontFamily: "inherit", fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase",
            cursor: isClaiming || claimed ? "default" : "pointer",
            boxShadow: claimed ? "none" : "0 0 28px rgba(224,244,121,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: isClaiming ? 0.7 : 1,
          }}
        >
          {claimed ? (
            <><KIcon name="check" size={16} color="#3FB977" /> Claimed</>
          ) : isClaiming ? "Recording…" : (
            <><KIcon name="sparkle" size={16} color="#0D0D0D" fill="#0D0D0D" stroke={0} /> Claim {finalKAD.toFixed(2)} KAD</>
          )}
        </button>

        {onShare && !isShared && (
          <button
            onClick={onShare}
            style={{
              height: 50, borderRadius: 50, border: "1px solid rgba(255,255,255,0.16)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "inherit", fontWeight: 600, fontSize: 13, letterSpacing: "0.08em",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%",
            }}
          >
            <KIcon name="share" size={14} color="rgba(255,255,255,0.7)" /> Share to {communityName}
          </button>
        )}

        {isShared && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              height: 44, borderRadius: 50, border: "1px solid rgba(63,185,119,0.3)",
              background: "rgba(63,185,119,0.1)", color: "#3FB977",
              fontFamily: "inherit", fontWeight: 600, fontSize: 13, letterSpacing: "0.08em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <KIcon name="check" size={14} color="#3FB977" /> Shared to {communityName}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                style={{
                  flex: 1, height: 46, borderRadius: 50,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent", color: "#fff",
                  fontFamily: "inherit", fontWeight: 600, fontSize: 12, letterSpacing: "0.06em",
                  cursor: isGenerating ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  opacity: isGenerating ? 0.6 : 1,
                }}
              >
                <KIcon name="download" size={14} color="#fff" />
                {isGenerating ? "Generating…" : "Run Card"}
              </button>

              <button
                onClick={handleTweet}
                style={{
                  flex: 1, height: 46, borderRadius: 50,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent", color: "#fff",
                  fontFamily: "inherit", fontWeight: 600, fontSize: 12, letterSpacing: "0.06em",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                <KIcon name="share" size={14} color="#fff" />
                Share on X
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer",
            textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600,
            padding: "4px 0", fontFamily: "inherit", marginTop: 2,
          }}
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
