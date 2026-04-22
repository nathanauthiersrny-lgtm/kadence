"use client";

import { useWallet } from "../lib/wallet/context";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useXP } from "../lib/hooks/use-xp";
import { useStreak } from "../lib/hooks/use-streak";
import { useQuests } from "../lib/hooks/use-quests";
import { useBadges } from "../lib/hooks/use-badges";
import { useCommunity } from "../lib/hooks/use-community";
import { KCard, KButton, KPill, KAvatar, KIcon } from "./ui/primitives";
import { WalletButton } from "./wallet-button";
import { ellipsify } from "../lib/explorer";

type Props = { onStart: () => void; onCommunity: () => void };

// ─── Streak Ring ─────────────────────────────────────────────────────────────

function StreakRing({ streak, multiplier }: { streak: number; multiplier: number }) {
  const SEGMENTS = 14;
  const R_OUTER = 108;
  const R_TRACK = 88;
  const cx = R_OUTER;
  const cy = R_OUTER;

  const segments = Array.from({ length: SEGMENTS }).map((_, i) => {
    const a1 = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2 + 0.05;
    const a2 = ((i + 1) / SEGMENTS) * Math.PI * 2 - Math.PI / 2 - 0.05;
    const x1 = cx + R_TRACK * Math.cos(a1);
    const y1 = cy + R_TRACK * Math.sin(a1);
    const x2 = cx + R_TRACK * Math.cos(a2);
    const y2 = cy + R_TRACK * Math.sin(a2);
    const active = i < Math.min(streak, SEGMENTS);
    return (
      <path
        key={i}
        d={`M ${x1} ${y1} A ${R_TRACK} ${R_TRACK} 0 0 1 ${x2} ${y2}`}
        stroke={active ? "#E0F479" : "rgba(255,255,255,0.1)"}
        strokeWidth={active ? 5 : 3}
        strokeLinecap="round"
        fill="none"
        style={{ filter: active ? "drop-shadow(0 0 4px #E0F479)" : "none" }}
      />
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg
        width={R_OUTER * 2}
        height={R_OUTER * 2}
        viewBox={`0 0 ${R_OUTER * 2} ${R_OUTER * 2}`}
        style={{ display: "block" }}
      >
        {segments}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill="#E0F479"
          fontSize="56"
          fontWeight="700"
          fontFamily="var(--font-sans)"
          style={{ letterSpacing: "-0.04em" }}
        >
          {streak}
        </text>
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize="11"
          fontFamily="var(--font-sans)"
          letterSpacing="0.18em"
        >
          DAY STREAK
        </text>
      </svg>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
        {multiplier}× boost active
      </span>
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

export function HomeScreen({ onStart, onCommunity }: Props) {
  const { wallet, status } = useWallet();
  const address = wallet?.account.address;
  const { data: kadBalance } = useKadBalance(address);
  const { level, levelXP, levelTitle, nextTitle } = useXP();
  const { streak, multiplier } = useStreak();
  const { quest, progressKm, completed, timeUntilReset } = useQuests();
  const { badges } = useBadges();
  const { joinedCommunity, weekProgress, collectiveKm, challengeComplete } = useCommunity();

  const kadDisplay = kadBalance?.uiAmount ?? 0;
  const displayName = address ? ellipsify(address, 4) : "—";
  const initials = address ? address.slice(0, 2) : "??";

  const questProgress = Math.min((progressKm / quest.goalKm) * 100, 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <KAvatar initials={initials} size={44} />
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Runner</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{displayName}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {status === "connected" ? (
            <KPill icon={<KIcon name="bolt" size={13} color="#0D0D0D" fill="#0D0D0D" />} filled>
              <span style={{ fontWeight: 700 }}>{kadDisplay.toFixed(2)}</span>
              <span style={{ opacity: 0.65, marginLeft: 2, fontWeight: 500 }}>KAD</span>
            </KPill>
          ) : (
            <WalletButton />
          )}
        </div>
      </div>

      {/* Streak ring */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        <StreakRing streak={streak} multiplier={multiplier} />
      </div>

      {/* Level / XP */}
      <KCard padding={16}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)" }}>Level</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{level}</span>
            <span style={{ fontSize: 13, color: "rgba(224,244,121,0.7)" }}>{levelTitle}</span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{levelXP}/100 XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 50, background: "rgba(224,244,121,0.12)", overflow: "hidden" }}>
          <div style={{
            width: `${levelXP}%`,
            height: "100%",
            background: "linear-gradient(90deg, #3FB977 0%, #E0F479 100%)",
            borderRadius: 50,
            boxShadow: "0 0 8px rgba(224,244,121,0.5)",
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span>{levelTitle}</span>
          <span>{nextTitle} · unlocks at lvl {level + 1}</span>
        </div>
      </KCard>

      {/* Today's quest */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 600 }}>
            Today&apos;s quest
          </h3>
          <span style={{ fontSize: 11, color: "rgba(224,244,121,0.7)" }}>Resets in {timeUntilReset}</span>
        </div>

        <KCard padding={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{quest.title}</span>
              <span style={{ fontSize: 13, color: "#E0F479", fontWeight: 700 }}>+{quest.rewardKad} KAD</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              {completed
                ? "Completed today!"
                : `${progressKm.toFixed(1)} / ${quest.goalKm} km`}
            </div>
            <div style={{ marginTop: 14, height: 6, background: "rgba(224,244,121,0.12)", borderRadius: 50, overflow: "hidden" }}>
              <div style={{
                width: `${questProgress}%`,
                height: "100%",
                background: "#E0F479",
                borderRadius: 50,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>

          {status !== "connected" ? (
            <div style={{ width: "100%", padding: "14px", background: "rgba(224,244,121,0.08)", borderTop: "1px solid rgba(224,244,121,0.1)", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              Connect wallet to start
            </div>
          ) : (
            <button
              onClick={onStart}
              style={{
                width: "100%",
                padding: "14px",
                background: completed ? "rgba(63,185,119,0.2)" : "#E0F479",
                color: completed ? "#3FB977" : "#0D0D0D",
                border: "none",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 15,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <KIcon name="play" size={14} fill={completed ? "#3FB977" : "#0D0D0D"} color={completed ? "#3FB977" : "#0D0D0D"} />
              {completed ? "Run again" : "Start run"}
            </button>
          )}
        </KCard>
      </div>

      {/* Community widget */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", margin: 0, fontWeight: 600 }}>
            Community
          </h3>
        </div>
        <button
          onClick={onCommunity}
          style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        >
          <KCard padding={0} style={{ overflow: "hidden" }}>
            {joinedCommunity ? (
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <KIcon
                      name={joinedCommunity.type === "road" ? "route" : "nav"}
                      size={15}
                      color="rgba(255,255,255,0.6)"
                    />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{joinedCommunity.name}</span>
                  </div>
                  {challengeComplete && !weekProgress.claimed ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#E0F479", background: "rgba(224,244,121,0.12)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 50, padding: "2px 8px" }}>
                      Claim ready!
                    </span>
                  ) : (
                    <KIcon name="chevron" size={14} color="rgba(255,255,255,0.3)" />
                  )}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                  {joinedCommunity.challenge.type === "collective_km"
                    ? `${collectiveKm.toFixed(1)} / ${joinedCommunity.challenge.target} km · Group challenge`
                    : `${weekProgress.myRunCount} / ${joinedCommunity.challenge.target} runs · Individual challenge`}
                </div>
                <div style={{ height: 5, borderRadius: 50, background: "rgba(224,244,121,0.1)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.min(
                      joinedCommunity.challenge.type === "collective_km"
                        ? (collectiveKm / joinedCommunity.challenge.target) * 100
                        : (weekProgress.myRunCount / joinedCommunity.challenge.target) * 100,
                      100
                    )}%`,
                    height: "100%",
                    background: challengeComplete ? "linear-gradient(90deg, #3FB977, #E0F479)" : "#E0F479",
                    borderRadius: 50,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ) : (
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <KIcon name="users" size={16} color="rgba(255,255,255,0.4)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Join a community</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Run together, earn more KAD</div>
                  </div>
                </div>
                <KIcon name="chevron" size={14} color="rgba(255,255,255,0.3)" />
              </div>
            )}
          </KCard>
        </button>
      </div>

      {/* Badges */}
      <div>
        <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", margin: "0 0 10px", fontWeight: 600 }}>
          Badges · {badges.filter((b) => b.earned).length} of {badges.length}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {badges.map((b) => (
            <div
              key={b.id}
              title={b.desc}
              style={{
                aspectRatio: "1",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                background: b.earned ? "rgba(224,244,121,0.1)" : "transparent",
                border: `1px solid ${b.earned ? "rgba(224,244,121,0.3)" : "rgba(255,255,255,0.08)"}`,
                transition: "all 0.3s ease",
              }}
            >
              <KIcon
                name={b.icon as Parameters<typeof KIcon>[0]["name"]}
                size={20}
                color={b.earned ? "#E0F479" : "rgba(255,255,255,0.2)"}
              />
              <span style={{
                fontSize: 9,
                color: b.earned ? "rgba(224,244,121,0.8)" : "rgba(255,255,255,0.3)",
                letterSpacing: "0.04em",
                textAlign: "center",
                padding: "0 4px",
              }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA (if connected and quest not done) */}
      {status === "connected" && (
        <KButton size="lg" style={{ width: "100%" }} onClick={onStart}>
          Start run
          <KIcon name="arrow" size={18} color="#0D0D0D" />
        </KButton>
      )}
    </div>
  );
}
