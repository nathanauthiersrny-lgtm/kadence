"use client";

import { useWallet } from "../lib/wallet/context";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useXP } from "../lib/hooks/use-xp";
import { useStreak } from "../lib/hooks/use-streak";
import { useQuests } from "../lib/hooks/use-quests";
import { useBadges } from "../lib/hooks/use-badges";
import { useCommunity } from "../lib/hooks/use-community";
import { getFlashRunEvents, getEventStatus } from "../lib/hooks/use-flash-run";
import { KCard, KAvatar, KIcon } from "./ui/primitives";
import { WalletButton } from "./wallet-button";
import { ellipsify } from "../lib/explorer";

type Props = { onStart: () => void; onCommunity: () => void; onFlashRuns: () => void };

export function HomeScreen({ onStart, onCommunity, onFlashRuns }: Props) {
  const { wallet, status } = useWallet();
  const address = wallet?.account.address;
  const { data: kadBalance } = useKadBalance(address);
  const { level, levelXP, levelTitle, nextTitle } = useXP();
  const { streak, multiplier } = useStreak();
  const { quest, progressKm, completed, timeUntilReset } = useQuests();
  const { badges } = useBadges();
  const { joinedCommunity, weekProgress, collectiveKm, challengeComplete } = useCommunity();

  const kadDisplay = kadBalance?.uiAmount ?? 0;
  const initials = address ? address.slice(0, 2) : "??";
  const questProgress = Math.min((progressKm / quest.goalKm) * 100, 100);

  const events = getFlashRunEvents();
  const liveEvents = events.filter((e) => getEventStatus(e) === "live");
  const upcomingEvents = events.filter((e) => getEventStatus(e) === "upcoming");
  const hasLive = liveEvents.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* ── Editorial hero ─────────────────────────────────────────── */}
      <div style={{ position: "relative", height: 380, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `
          radial-gradient(ellipse at 30% 20%, rgba(224,244,121,0.35) 0%, transparent 45%),
          radial-gradient(ellipse at 70% 80%, rgba(63,185,119,0.45) 0%, transparent 50%),
          linear-gradient(180deg, #1a2418 0%, #0D1510 60%, #0D0D0D 100%)
        ` }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 20%, rgba(224,244,121,0.2) 0%, transparent 40%)",
          animation: "kadHeroBreath 5s ease-in-out infinite",
        }} />
        <svg viewBox="0 0 414 380" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <g fill="rgba(255,255,255,0.06)">
            {Array.from({ length: 80 }).map((_, i) => (
              <circle key={i} cx={(i * 47 + 13) % 414} cy={(i * 31 + 7) % 380} r={(i % 3) * 0.4 + 0.3} />
            ))}
          </g>
        </svg>

        {/* Top bar */}
        <div style={{ position: "absolute", top: 20, left: 22, right: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E0F479", boxShadow: "0 0 8px #E0F479" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>
              Kadence
            </span>
          </div>
          {status === "connected"
            ? <KAvatar initials={initials} size={40} />
            : <WalletButton />
          }
        </div>

        {/* Editorial headline */}
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#E0F479", fontWeight: 700, marginBottom: 8 }}>
            Today · {multiplier > 1 ? `${multiplier}× boost active` : "Sunset"}
          </div>
          <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.92, color: "#fff" }}>
            Run<br />the<br /><span style={{ color: "#E0F479" }}>distance.</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 10, maxWidth: 280, lineHeight: 1.4 }}>
            {multiplier > 1 ? `${multiplier}× boost active — ` : ""}
            {status === "connected"
              ? `${kadDisplay.toFixed(2)} KAD in wallet.`
              : "Connect wallet to start earning KAD."}
          </div>
        </div>
      </div>

      {/* ── Bento ──────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Start CTA */}
        {status === "connected" ? (
          <button
            onClick={onStart}
            style={{
              width: "100%", height: 60, borderRadius: 18, border: "none", cursor: "pointer",
              background: "#E0F479", color: "#0D0D0D",
              fontFamily: "inherit", fontWeight: 700, fontSize: 16, letterSpacing: "0.04em", textTransform: "uppercase",
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px",
            }}
          >
            <span>{completed ? "Run again" : "Start today's run"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                {quest.goalKm} km · ~{quest.rewardKad} KAD
              </span>
              <KIcon name="arrow" size={18} color="#0D0D0D" />
            </div>
          </button>
        ) : (
          <WalletButton />
        )}

        {/* Quest progress (in-progress only) */}
        {status === "connected" && !completed && progressKm > 0 && (
          <KCard padding={14}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{quest.title}</span>
              <span style={{ fontSize: 10, color: "#E0F479", fontWeight: 700 }}>Resets {timeUntilReset}</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
              {progressKm.toFixed(1)} / {quest.goalKm} km
            </div>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(224,244,121,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${questProgress}%`, height: "100%", background: "#E0F479", borderRadius: 3, transition: "width 0.6s ease" }} />
            </div>
          </KCard>
        )}

        {/* Flash Runs / LIVE event widget */}
        {(hasLive || upcomingEvents.length > 0) && (
          <button
            onClick={onFlashRuns}
            style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <div style={{
              position: "relative", padding: 16, borderRadius: 18,
              background: hasLive
                ? "linear-gradient(135deg, rgba(224,244,121,0.12) 0%, rgba(63,185,119,0.08) 100%)"
                : "#1A1A1A",
              border: hasLive ? "1px solid rgba(224,244,121,0.3)" : "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {hasLive ? (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", borderRadius: 50,
                    background: "#E0F479", color: "#0D0D0D",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0D0D0D", animation: "kadPulse 1.2s infinite" }} />
                    LIVE NOW
                  </span>
                ) : (
                  <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Flash Runs</span>
                )}
                {hasLive && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                    · {liveEvents.length} live
                  </span>
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                {hasLive ? liveEvents[0].name : `${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? "s" : ""}`}
              </div>
              {hasLive && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                  {(liveEvents[0].distanceM / 1000).toFixed(1)} km · {liveEvents[0].prizePoolKad.toLocaleString()} KAD pool
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: hasLive ? "#E0F479" : "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  View all →
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Community + Streak row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
          <button
            onClick={onCommunity}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <KCard padding={14} style={{ height: "100%", minHeight: 120 }}>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(224,244,121,0.7)", fontWeight: 700 }}>Community</div>
              {joinedCommunity ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, lineHeight: 1.25 }}>{joinedCommunity.name}</div>
                  <div style={{ marginTop: 10, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(
                        joinedCommunity.challenge.type === "collective_km"
                          ? (collectiveKm / joinedCommunity.challenge.target) * 100
                          : (weekProgress.myRunCount / joinedCommunity.challenge.target) * 100,
                        100
                      )}%`,
                      height: "100%",
                      background: challengeComplete ? "linear-gradient(90deg, #3FB977, #E0F479)" : "#E0F479",
                      borderRadius: 3,
                    }} />
                  </div>
                  {challengeComplete && !weekProgress.claimed && (
                    <div style={{ fontSize: 10, color: "#E0F479", fontWeight: 700, marginTop: 6 }}>Claim ready!</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, lineHeight: 1.25 }}>Join a squad</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Run together, earn more</div>
                </>
              )}
            </KCard>
          </button>

          <KCard padding={14}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Streak</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {streak}
              </span>
              <span style={{ fontSize: 11, color: "rgba(224,244,121,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>days</span>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < Math.min(streak, 7) ? "#E0F479" : "rgba(224,244,121,0.15)" }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
              {multiplier > 1 ? `${multiplier}× boost` : "keep it up"}
            </div>
          </KCard>
        </div>

        {/* Level / XP widget */}
        <KCard padding={16}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Level {level}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{levelTitle}</div>
            </div>
            <span style={{ fontSize: 13, color: "#E0F479", fontVariantNumeric: "tabular-nums" }}>{levelXP}/100 XP</span>
          </div>
          <div style={{ height: 4, borderRadius: 3, background: "rgba(224,244,121,0.12)", overflow: "hidden" }}>
            <div style={{ width: `${levelXP}%`, height: "100%", background: "linear-gradient(90deg, #3FB977, #E0F479)", borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            {100 - levelXP} XP to unlock <span style={{ color: "#E0F479" }}>{nextTitle}</span>
          </div>
        </KCard>

        {/* Badges */}
        <div>
          <h3 style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", margin: "0 0 10px", fontWeight: 700 }}>
            Badges · {badges.filter((b) => b.earned).length}/{badges.length}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {badges.map((b) => (
              <div
                key={b.id}
                title={b.desc}
                style={{
                  aspectRatio: "1", borderRadius: 14,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
                  background: b.earned ? "rgba(224,244,121,0.1)" : "transparent",
                  border: `1px solid ${b.earned ? "rgba(224,244,121,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <KIcon name={b.icon as Parameters<typeof KIcon>[0]["name"]} size={20} color={b.earned ? "#E0F479" : "rgba(255,255,255,0.2)"} />
                <span style={{ fontSize: 9, color: b.earned ? "rgba(224,244,121,0.8)" : "rgba(255,255,255,0.3)", letterSpacing: "0.04em", textAlign: "center", padding: "0 4px" }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
