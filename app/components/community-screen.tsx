"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useCommunity, COMMUNITIES, type Community } from "../lib/hooks/use-community";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useCluster } from "./cluster-context";
import { getClaimChallengeBonusInstructionAsync } from "../generated/kadence";
import { parseTransactionError } from "../lib/errors";
import { KCard, KButton, KPill, KIcon } from "./ui/primitives";

type SubView = "browse" | "detail";

type Props = {
  onBack: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierLabel(tier: Community["tier"]) {
  return tier === "starter" ? "Starter" : "Regular";
}

function typeIcon(type: Community["type"]) {
  return type === "road" ? "route" : "nav";
}

function tierColor(tier: Community["tier"]) {
  return tier === "starter" ? "rgba(63,185,119,0.85)" : "#E0F479";
}

function fmtKm(km: number) {
  return km.toFixed(1);
}

// ─── Community Card (browse view) ────────────────────────────────────────────

function CommunityCard({
  community,
  suggested,
  joined,
  onJoin,
}: {
  community: Community;
  suggested: boolean;
  joined: boolean;
  onJoin: () => void;
}) {
  return (
    <KCard
      padding={0}
      style={{
        overflow: "hidden",
        border: suggested
          ? "1px solid rgba(224,244,121,0.5)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: suggested ? "0 0 16px rgba(224,244,121,0.12)" : "none",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KIcon name={typeIcon(community.type)} size={16} color="rgba(255,255,255,0.7)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{community.name}</span>
          </div>
          {suggested && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#E0F479",
                background: "rgba(224,244,121,0.12)",
                border: "1px solid rgba(224,244,121,0.3)",
                borderRadius: 50,
                padding: "2px 8px",
              }}
            >
              Suggested
            </span>
          )}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: tierColor(community.tier),
            background: "rgba(255,255,255,0.05)",
            borderRadius: 50,
            padding: "3px 10px",
          }}
        >
          {tierLabel(community.tier)}
        </div>
        <p
          style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}
        >
          {community.description}
        </p>
      </div>

      {/* Challenge row */}
      <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <KIcon name="target" size={12} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {community.challenge.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KIcon name="users" size={12} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {community.memberCount.toLocaleString()} members
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#E0F479", fontWeight: 700 }}>
            +{community.challenge.bonusKad} KAD
          </span>
        </div>
      </div>

      {/* Join button */}
      <button
        onClick={joined ? undefined : onJoin}
        style={{
          width: "100%",
          padding: "13px",
          background: joined
            ? "rgba(63,185,119,0.15)"
            : suggested
            ? "#E0F479"
            : "rgba(224,244,121,0.1)",
          color: joined ? "#3FB977" : suggested ? "#0D0D0D" : "#E0F479",
          border: "none",
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          cursor: joined ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {joined ? (
          <>
            <KIcon name="check" size={14} color="#3FB977" />
            Joined
          </>
        ) : (
          "Join Community"
        )}
      </button>
    </KCard>
  );
}

// ─── Browse View ─────────────────────────────────────────────────────────────

function BrowseView({
  onJoined,
}: {
  onJoined: () => void;
}) {
  const { communities, joinedCommunity, suggestedTier, runCount, joinCommunity } = useCommunity();
  const [activeType, setActiveType] = useState<"all" | "road" | "trail">("all");

  const filtered = activeType === "all" ? communities : communities.filter((c) => c.type === activeType);

  const handleJoin = useCallback(
    (id: string) => {
      joinCommunity(id);
      onJoined();
    },
    [joinCommunity, onJoined],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Auto-suggest hint */}
      {runCount < 3 ? (
        <KCard padding={14} style={{ border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KIcon name="sparkle" size={16} color="rgba(224,244,121,0.6)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                Auto-match unlocks after {3 - runCount} more run{3 - runCount !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                We&apos;ll suggest your community based on your pace &amp; distance.
              </div>
            </div>
          </div>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 50,
                  background: i < runCount ? "#E0F479" : "rgba(255,255,255,0.1)",
                  boxShadow: i < runCount ? "0 0 6px rgba(224,244,121,0.4)" : "none",
                }}
              />
            ))}
          </div>
        </KCard>
      ) : suggestedTier ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(224,244,121,0.06)",
            border: "1px solid rgba(224,244,121,0.2)",
            borderRadius: 12,
          }}
        >
          <KIcon name="sparkle" size={14} color="#E0F479" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
            Based on your runs, we suggest the{" "}
            <strong style={{ color: "#E0F479" }}>{tierLabel(suggestedTier)}</strong> tier.
          </span>
        </div>
      ) : null}

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["all", "road", "trail"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              padding: "7px 16px",
              borderRadius: 50,
              border: "1px solid",
              borderColor: activeType === t ? "#E0F479" : "rgba(255,255,255,0.12)",
              background: activeType === t ? "rgba(224,244,121,0.12)" : "transparent",
              color: activeType === t ? "#E0F479" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "capitalize",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Community cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((c) => (
          <CommunityCard
            key={c.id}
            community={c}
            suggested={suggestedTier !== null && c.tier === suggestedTier}
            joined={joinedCommunity?.id === c.id}
            onJoin={() => handleJoin(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Detail View ─────────────────────────────────────────────────────────────

function DetailView({ onLeave }: { onLeave: () => void }) {
  const {
    joinedCommunity,
    weekProgress,
    feed,
    collectiveKm,
    challengeComplete,
    leaveCommunity,
    markClaimed,
  } = useCommunity();

  const { wallet, signer } = useWallet();
  const { send } = useSendTransaction();
  const { mutate: mutateBalance } = useKadBalance(wallet?.account.address);
  const { getExplorerUrl } = useCluster();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = useCallback(async () => {
    if (!signer || !joinedCommunity) return;
    setIsClaiming(true);
    try {
      const ix = await getClaimChallengeBonusInstructionAsync({
        runner: signer,
        bonusAmount: BigInt(joinedCommunity.challenge.bonusBaseUnits),
      });
      const sig = await send({ instructions: [ix] });
      markClaimed();
      void mutateBalance();
      toast.success(`+${joinedCommunity.challenge.bonusKad} KAD challenge bonus!`, {
        description: sig ? (
          <a
            href={getExplorerUrl(`/tx/${sig}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View transaction
          </a>
        ) : undefined,
      });
    } catch (err) {
      console.error("claim_challenge_bonus failed:", err);
      toast.error(parseTransactionError(err));
    } finally {
      setIsClaiming(false);
    }
  }, [signer, joinedCommunity, send, markClaimed, mutateBalance, getExplorerUrl]);

  const handleLeave = useCallback(() => {
    leaveCommunity();
    onLeave();
  }, [leaveCommunity, onLeave]);

  if (!joinedCommunity) return null;

  const c = joinedCommunity;
  const isCollective = c.challenge.type === "collective_km";

  // Progress values
  const progressValue = isCollective
    ? collectiveKm
    : weekProgress.myRunCount;
  const progressTarget = c.challenge.target;
  const progressPct = Math.min((progressValue / progressTarget) * 100, 100);

  const myProgressValue = isCollective ? weekProgress.myKm : weekProgress.myRunCount;
  const myProgressTarget = isCollective ? c.challenge.target : c.challenge.target;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Community identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--kad-card)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(224,244,121,0.1)", border: "1px solid rgba(224,244,121,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <KIcon name={typeIcon(c.type)} size={22} color="#E0F479" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            {c.memberCount.toLocaleString()} members · {tierLabel(c.tier)}
          </div>
        </div>
        <KPill style={{ fontSize: 11 }}>Joined</KPill>
      </div>

      {/* This week's challenge */}
      <div>
        <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", margin: "0 0 10px", fontWeight: 600 }}>
          This week&apos;s challenge
        </h3>
        <KCard padding={16}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.challenge.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {isCollective
                  ? `${fmtKm(collectiveKm)} / ${c.challenge.target} km as a group`
                  : `${weekProgress.myRunCount} / ${c.challenge.target} runs this week`}
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#E0F479", flexShrink: 0, marginLeft: 12 }}>
              +{c.challenge.bonusKad} KAD
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 8, borderRadius: 50, background: "rgba(224,244,121,0.1)", overflow: "hidden", marginBottom: 6 }}>
            <div style={{
              width: `${progressPct}%`,
              height: "100%",
              background: progressPct >= 100
                ? "linear-gradient(90deg, #3FB977, #E0F479)"
                : "linear-gradient(90deg, #3FB977 0%, #E0F479 100%)",
              borderRadius: 50,
              boxShadow: progressPct >= 100 ? "0 0 10px rgba(224,244,121,0.5)" : "none",
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "right" }}>
            {Math.round(progressPct)}%
          </div>

          {/* Your contribution (for collective) */}
          {isCollective && weekProgress.myKm > 0 && (
            <div style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(224,244,121,0.06)",
              border: "1px solid rgba(224,244,121,0.12)",
              borderRadius: 8,
              fontSize: 11,
              color: "rgba(224,244,121,0.8)",
            }}>
              Your contribution: <strong>{fmtKm(weekProgress.myKm)} km</strong>
            </div>
          )}

          {/* Claim / completion state */}
          {weekProgress.claimed ? (
            <div style={{
              marginTop: 14,
              padding: "12px",
              background: "rgba(63,185,119,0.1)",
              border: "1px solid rgba(63,185,119,0.2)",
              borderRadius: 10,
              textAlign: "center",
              fontSize: 13,
              color: "#3FB977",
              fontWeight: 600,
            }}>
              <KIcon name="check" size={14} color="#3FB977" style={{ marginRight: 6, display: "inline" }} />
              Bonus claimed! Check back next week.
            </div>
          ) : challengeComplete ? (
            <KButton
              style={{ width: "100%", marginTop: 14 }}
              onClick={handleClaim}
              disabled={isClaiming || !signer}
            >
              {isClaiming ? "Claiming…" : `Claim +${c.challenge.bonusKad} KAD bonus`}
              {!isClaiming && <KIcon name="bolt" size={16} color="#0D0D0D" fill="#0D0D0D" />}
            </KButton>
          ) : (
            <div style={{
              marginTop: 14,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              textAlign: "center",
            }}>
              {isCollective
                ? `${fmtKm(c.challenge.target - collectiveKm)} km left for the group`
                : `${c.challenge.target - weekProgress.myRunCount} more run${c.challenge.target - weekProgress.myRunCount !== 1 ? "s" : ""} to complete`}
            </div>
          )}
        </KCard>
      </div>

      {/* Your stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KCard padding={14} glow={false} style={{ border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#E0F479" }}>{weekProgress.myRunCount}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Runs this week
          </div>
        </KCard>
        <KCard padding={14} glow={false} style={{ border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#E0F479" }}>{fmtKm(weekProgress.myKm)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            km this week
          </div>
        </KCard>
      </div>

      {/* Activity feed */}
      <div>
        <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", margin: "0 0 10px", fontWeight: 600 }}>
          Activity
        </h3>
        <KCard padding={0} glow={false} style={{ border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {feed.map((msg, i) => (
            <div
              key={msg.id}
              style={{
                padding: "11px 16px",
                borderBottom: i < feed.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 13, color: msg.id === "my-run" ? "rgba(224,244,121,0.9)" : "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                {msg.text}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0, paddingTop: 1 }}>
                {msg.time}
              </span>
            </div>
          ))}
        </KCard>
      </div>

      {/* Leave community */}
      <button
        onClick={handleLeave}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          cursor: "pointer",
          textAlign: "center",
          padding: "4px",
        }}
      >
        Leave community
      </button>
    </div>
  );
}

// ─── Community Screen (entry point) ──────────────────────────────────────────

export function CommunityScreen({ onBack }: Props) {
  const { joinedCommunity } = useCommunity();
  const [subView, setSubView] = useState<SubView>(() => {
    if (typeof window === "undefined") return "browse";
    return localStorage.getItem("kad_community_joined") ? "detail" : "browse";
  });

  const subTitle = subView === "browse"
    ? "Communities"
    : joinedCommunity?.name ?? "Community";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "20px 20px 0",
        position: "sticky",
        top: 0,
        background: "var(--kad-bg)",
        zIndex: 10,
        paddingBottom: 16,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 4,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 50,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <KIcon name="arrow" size={16} color="rgba(255,255,255,0.7)" style={{ transform: "rotate(180deg)" }} />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{subTitle}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {subView === "browse" ? (
          <BrowseView onJoined={() => setSubView("detail")} />
        ) : (
          <DetailView onLeave={() => setSubView("browse")} />
        )}
      </div>
    </div>
  );
}
