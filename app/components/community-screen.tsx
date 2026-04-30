"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useCommunity, COMMUNITIES, type Community } from "../lib/hooks/use-community";
import { useSocialFeed } from "../lib/hooks/use-social-feed";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useCluster } from "./cluster-context";
import { getClaimChallengeBonusInstructionAsync } from "../generated/kadence";
import { parseTransactionError } from "../lib/errors";
import { KCard, KButton, KIcon } from "./ui/primitives";
import { MiniRunMap } from "./mini-run-map";

type SubView = "browse" | "detail";
type Props = { onBack: () => void };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierLabel(tier: Community["tier"]) {
  return tier === "starter" ? "Starter" : "Regular";
}

function typeIcon(type: Community["type"]): Parameters<typeof KIcon>[0]["name"] {
  return type === "road" ? "route" : "nav";
}

function tierColor(tier: Community["tier"]) {
  return tier === "starter" ? "rgba(63,185,119,0.85)" : "#E0F479";
}

function fmtKm(km: number) {
  return km.toFixed(1);
}

// ─── Community Card (browse view) ────────────────────────────────────────────

function CommunityCard({ community, suggested, joined, onJoin }: {
  community: Community; suggested: boolean; joined: boolean; onJoin: () => void;
}) {
  return (
    <KCard padding={0} style={{
      overflow: "hidden",
      border: suggested ? "1px solid rgba(224,244,121,0.5)" : "1px solid rgba(255,255,255,0.08)",
      boxShadow: suggested ? "0 0 16px rgba(224,244,121,0.12)" : "none",
    }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KIcon name={typeIcon(community.type)} size={16} color="rgba(255,255,255,0.7)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{community.name}</span>
          </div>
          {suggested && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#E0F479", background: "rgba(224,244,121,0.12)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 50, padding: "2px 8px" }}>
              Suggested
            </span>
          )}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: tierColor(community.tier), background: "rgba(255,255,255,0.05)", borderRadius: 50, padding: "3px 10px" }}>
          {tierLabel(community.tier)}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>{community.description}</p>
      </div>
      <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <KIcon name="target" size={12} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{community.challenge.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <KIcon name="users" size={12} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{community.memberCount.toLocaleString()} members</span>
          </div>
          <span style={{ fontSize: 12, color: "#E0F479", fontWeight: 700 }}>+{community.challenge.bonusKad} KAD</span>
        </div>
      </div>
      <button
        onClick={joined ? undefined : onJoin}
        style={{
          width: "100%", padding: "13px",
          background: joined ? "rgba(63,185,119,0.15)" : suggested ? "#E0F479" : "rgba(224,244,121,0.1)",
          color: joined ? "#3FB977" : suggested ? "#0D0D0D" : "#E0F479",
          border: "none", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
          textTransform: "uppercase", letterSpacing: "0.06em", cursor: joined ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        {joined ? <><KIcon name="check" size={14} color="#3FB977" /> Joined</> : "Join Community"}
      </button>
    </KCard>
  );
}

// ─── Browse View ─────────────────────────────────────────────────────────────

function BrowseView({ onJoined }: { onJoined: () => void }) {
  const { communities, joinedCommunity, suggestedTier, runCount, joinCommunity } = useCommunity();
  const [activeType, setActiveType] = useState<"all" | "road" | "trail">("all");

  const filtered = activeType === "all" ? communities : communities.filter((c) => c.type === activeType);

  const handleJoin = useCallback(
    (id: string) => { joinCommunity(id); onJoined(); },
    [joinCommunity, onJoined],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>
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
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 50, background: i < runCount ? "#E0F479" : "rgba(255,255,255,0.1)", boxShadow: i < runCount ? "0 0 6px rgba(224,244,121,0.4)" : "none" }} />
            ))}
          </div>
        </KCard>
      ) : suggestedTier ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(224,244,121,0.06)", border: "1px solid rgba(224,244,121,0.2)", borderRadius: 12 }}>
          <KIcon name="sparkle" size={14} color="#E0F479" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
            Based on your runs, we suggest the <strong style={{ color: "#E0F479" }}>{tierLabel(suggestedTier)}</strong> tier.
          </span>
        </div>
      ) : null}

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8 }}>
        {(["all", "road", "trail"] as const).map((t) => (
          <button key={t} onClick={() => setActiveType(t)} style={{
            padding: "7px 16px", borderRadius: 50, border: "1px solid",
            borderColor: activeType === t ? "#E0F479" : "rgba(255,255,255,0.12)",
            background: activeType === t ? "rgba(224,244,121,0.12)" : "transparent",
            color: activeType === t ? "#E0F479" : "rgba(255,255,255,0.5)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", letterSpacing: "0.04em",
          }}>
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((c) => (
          <CommunityCard
            key={c.id} community={c}
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

function formatTimeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatPaceCompact(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function DetailView({ onBack, onLeave }: { onBack: () => void; onLeave: () => void }) {
  const { joinedCommunity, weekProgress, feed, collectiveKm, challengeComplete, leaveCommunity, markClaimed } = useCommunity();
  const { wallet, signer } = useWallet();
  const { send } = useSendTransaction();
  const { mutate: mutateBalance } = useKadBalance(wallet?.account.address);
  const { getExplorerUrl } = useCluster();
  const { sharedRuns, fireRun, hasFired } = useSocialFeed(joinedCommunity?.id ?? null);
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
          <a href={getExplorerUrl(`/tx/${sig}`)} target="_blank" rel="noopener noreferrer" className="underline">
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

  const handleLeave = useCallback(() => { leaveCommunity(); onLeave(); }, [leaveCommunity, onLeave]);

  if (!joinedCommunity) return null;

  const c = joinedCommunity;
  const isCollective = c.challenge.type === "collective_km";
  const progressValue = isCollective ? collectiveKm : weekProgress.myRunCount;
  const progressTarget = c.challenge.target;
  const progressPct = Math.min((progressValue / progressTarget) * 100, 100);

  // Activity feed avatar colors (cycling)
  const avatarColors = ["#E0F479", "#3FB977", "#1F1F1F", "#E0F479", "#3FB977", "#1F1F1F"];
  const avatarTextColors = ["#0D0D0D", "#0D0D0D", "#E0F479", "#0D0D0D", "#0D0D0D", "#E0F479"];

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* ── Editorial hero ─────────────────────────────────────────── */}
      <div style={{ position: "relative", padding: "20px 20px 20px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 85% 30%, rgba(63,185,119,0.25) 0%, transparent 60%), linear-gradient(180deg, rgba(224,244,121,0.06) 0%, transparent 100%)" }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 85% 30%, rgba(63,185,119,0.15) 0%, transparent 50%)",
          animation: "kadHeroBreath 5s ease-in-out infinite",
        }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button
            onClick={onBack}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <KIcon name="chevron" size={16} color="#fff" style={{ transform: "rotate(180deg)" }} />
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>Community</span>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#E0F479", fontWeight: 700, marginBottom: 6 }}>
            Squad · {c.memberCount.toLocaleString()} members
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.92 }}>
            {c.name.split(" ").length > 2
              ? c.name
              : <>{c.name.split(" ").slice(0, -1).join(" ")}<br /><span style={{ color: "#E0F479" }}>{c.name.split(" ").pop()}.</span></>
            }
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #E0F479, #3FB977)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KIcon name={typeIcon(c.type)} size={20} color="#0D0D0D" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{tierLabel(c.tier)} · {c.type.charAt(0).toUpperCase() + c.type.slice(1)} focus</div>
            </div>
            <span style={{ padding: "6px 14px", borderRadius: 50, border: "1px solid #E0F479", color: "#E0F479", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Joined</span>
          </div>
        </div>
      </div>

      {/* ── Bento ──────────────────────────────────────────────────── */}
      <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Challenge */}
        <div style={{ padding: 16, borderRadius: 18, background: "linear-gradient(135deg, rgba(224,244,121,0.12) 0%, rgba(63,185,119,0.06) 100%)", border: "1px solid rgba(224,244,121,0.3)" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 8 }}>This week&apos;s challenge</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25, flex: 1 }}>{c.challenge.label}</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#E0F479", whiteSpace: "nowrap" }}>
              +{c.challenge.bonusKad} <span style={{ fontSize: 9, color: "rgba(224,244,121,0.6)" }}>KAD</span>
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 12 }}>
            {isCollective
              ? `${fmtKm(collectiveKm)} / ${c.challenge.target} km as a group`
              : `${weekProgress.myRunCount} / ${c.challenge.target} runs this week`}
          </div>
          <div style={{ marginTop: 8, height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              width: `${progressPct}%`, height: "100%",
              background: "linear-gradient(90deg, #3FB977, #E0F479)", borderRadius: 4,
              boxShadow: progressPct >= 100 ? "0 0 8px rgba(224,244,121,0.4)" : "none",
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              {isCollective
                ? `${fmtKm(c.challenge.target - collectiveKm)} km left`
                : `${c.challenge.target - weekProgress.myRunCount} runs left`}
            </span>
            <span style={{ color: "#E0F479", fontWeight: 700 }}>{Math.round(progressPct)}%</span>
          </div>

          {/* Your contribution (collective) */}
          {isCollective && weekProgress.myKm > 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(224,244,121,0.06)", border: "1px solid rgba(224,244,121,0.12)", borderRadius: 8, fontSize: 11, color: "rgba(224,244,121,0.8)" }}>
              Your contribution: <strong>{fmtKm(weekProgress.myKm)} km</strong>
            </div>
          )}

          {/* Claim / completion */}
          {weekProgress.claimed ? (
            <div style={{ marginTop: 14, padding: 12, background: "rgba(63,185,119,0.1)", border: "1px solid rgba(63,185,119,0.2)", borderRadius: 10, textAlign: "center", fontSize: 13, color: "#3FB977", fontWeight: 600 }}>
              <KIcon name="check" size={14} color="#3FB977" style={{ marginRight: 6, display: "inline" }} />
              Bonus claimed! Check back next week.
            </div>
          ) : challengeComplete ? (
            <KButton style={{ width: "100%", marginTop: 14 }} onClick={handleClaim} disabled={isClaiming || !signer}>
              {isClaiming ? "Claiming…" : `Claim +${c.challenge.bonusKad} KAD bonus`}
              {!isClaiming && <KIcon name="bolt" size={16} color="#0D0D0D" fill="#0D0D0D" />}
            </KButton>
          ) : (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
              {isCollective
                ? `${fmtKm(c.challenge.target - collectiveKm)} km left for the group`
                : `${c.challenge.target - weekProgress.myRunCount} more run${c.challenge.target - weekProgress.myRunCount !== 1 ? "s" : ""} to complete`}
            </div>
          )}
        </div>

        {/* Personal stats duo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { value: String(weekProgress.myRunCount), label: "Runs this week", accent: false },
            { value: fmtKm(weekProgress.myKm), label: "Km this week", accent: true },
          ].map((s, i) => (
            <div key={i} style={{
              borderRadius: 16, padding: 16,
              background: s.accent ? "#E0F479" : "#1A1A1A",
              color: s.accent ? "#0D0D0D" : "#fff",
              border: s.accent ? "none" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700, opacity: s.accent ? 0.65 : 0.5, marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 10, padding: "0 4px" }}>Activity</div>
          {sharedRuns.length === 0 ? (
            <div style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "28px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                No activity yet this week
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                Complete a run and share it to the feed
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sharedRuns.map((run, i) => {
                const fired = hasFired(run.id);
                return (
                  <div
                    key={run.id}
                    style={{
                      background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 16, padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: avatarColors[i % avatarColors.length],
                        color: avatarTextColors[i % avatarTextColors.length],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {run.runnerName.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{run.runnerName}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                        {formatTimeAgo(run.sharedAt)}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, marginBottom: run.routeCoords.length >= 2 ? 10 : 0 }}>
                      <span>{run.distanceKm.toFixed(2)} km</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>&middot;</span>
                      <span>{formatPaceCompact(run.paceSecPerKm)} /km</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>&middot;</span>
                      <span style={{ color: "#E0F479" }}>{run.kadEarned.toFixed(2)} KAD</span>
                    </div>

                    {run.routeCoords.length >= 2 && (
                      <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 10, height: 120 }}>
                        <MiniRunMap coords={run.routeCoords} />
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => fireRun(run.id)}
                        style={{
                          background: "none", border: "none", cursor: fired ? "default" : "pointer",
                          display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                          borderRadius: 50,
                        }}
                      >
                        <KIcon
                          name="flame"
                          size={16}
                          color={fired ? "#E0F479" : "rgba(255,255,255,0.3)"}
                          fill={fired ? "#E0F479" : "none"}
                        />
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: fired ? "#E0F479" : "rgba(255,255,255,0.35)",
                        }}>
                          {run.fireCount}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleLeave}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer", textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, padding: "4px", marginTop: 8 }}
        >
          Leave community
        </button>
      </div>
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
  // True only when the user joined during this session (came from browse → detail).
  // If they arrived already joined, back from detail goes to home, not browse.
  const [cameFromBrowse, setCameFromBrowse] = useState(false);

  const subTitle = subView === "browse" ? "Communities" : joinedCommunity?.name ?? "Community";

  if (subView === "detail") {
    return (
      <DetailView
        onBack={cameFromBrowse ? () => setSubView("browse") : onBack}
        onLeave={() => { setCameFromBrowse(false); setSubView("browse"); }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "20px 20px 16px",
        position: "sticky", top: 0, background: "#0D0D0D", zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 50, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <KIcon name="arrow" size={16} color="rgba(255,255,255,0.7)" style={{ transform: "rotate(180deg)" }} />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{subTitle}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <BrowseView onJoined={() => { setCameFromBrowse(true); setSubView("detail"); }} />
      </div>
    </div>
  );
}
