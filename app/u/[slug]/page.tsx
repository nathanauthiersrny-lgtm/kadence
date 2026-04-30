"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "../../lib/wallet/context";
import { useRunHistory } from "../../lib/hooks/use-run-history";
import { useStreak } from "../../lib/hooks/use-streak";
import { useBadges } from "../../lib/hooks/use-badges";
import { useXP } from "../../lib/hooks/use-xp";
import { useKadBalance } from "../../lib/hooks/use-kad-balance";
import { useSocialFeed, type SharedRun } from "../../lib/hooks/use-social-feed";
import { COMMUNITIES } from "../../lib/hooks/use-community";
import { ellipsify } from "../../lib/explorer";
import { KIcon } from "../../components/ui/primitives";
import type { Address } from "@solana/kit";

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10_000;
  return x - Math.floor(x);
}

function seedFromSlug(slug: string): number {
  return slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

type DemoProfile = {
  name: string;
  totalRuns: number;
  totalDistKm: number;
  totalDurationSec: number;
  kadBalance: number;
  streak: number;
  multiplier: number;
  runsThisWeek: number;
  level: number;
  levelXP: number;
  levelTitle: string;
  earnedBadges: Set<string>;
  communityName: string | null;
  sharedRuns: SharedRun[];
};

const LEVEL_TITLES = ["Beginner", "Jogger", "Runner", "Pacer", "Sprinter", "Racer", "Finisher", "Elite", "Champion", "Legend"];

function buildDemoProfile(slug: string): DemoProfile {
  const s = seedFromSlug(slug);
  const totalRuns = 10 + Math.floor(seededRandom(s) * 41);
  const totalDistKm = 50 + Math.floor(seededRandom(s + 1) * 251);
  const avgPace = 300 + seededRandom(s + 2) * 120;
  const totalDurationSec = Math.round(totalDistKm * avgPace);
  const kadBalance = Math.round(totalDistKm * 1.1 * 100) / 100;
  const streak = 2 + Math.floor(seededRandom(s + 3) * 7);
  const multiplier = streak >= 8 ? 2.0 : streak >= 4 ? 1.6 : streak >= 2 ? 1.4 : streak >= 1 ? 1.2 : 1.0;
  const runsThisWeek = 1 + Math.floor(seededRandom(s + 4) * 4);
  const totalXP = totalRuns * 25 + Math.floor(seededRandom(s + 5) * 200);
  const level = Math.max(1, Math.floor(totalXP / 100) + 1);
  const levelXP = totalXP % 100;
  const levelTitle = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];

  const allBadgeIds = ["first-run", "streak-3", "streak-7", "club-5k", "sub-30", "club-10k", "speed-demon", "half-marathon"];
  const numEarned = 3 + Math.floor(seededRandom(s + 6) * 2);
  const earnedBadges = new Set(allBadgeIds.slice(0, numEarned));

  const commIdx = Math.floor(seededRandom(s + 7) * COMMUNITIES.length);
  const communityName = COMMUNITIES[commIdx]?.name ?? null;

  const demoRuns: SharedRun[] = [];
  for (let i = 0; i < 5; i++) {
    const rs = s + 100 + i * 7;
    const dist = 2 + seededRandom(rs) * 10;
    const pace = 280 + seededRandom(rs + 1) * 140;
    const dur = Math.round(dist * pace);
    const kad = Math.round(dist * 1.1 * 100) / 100;
    const hoursAgo = 2 + seededRandom(rs + 2) * 96;
    demoRuns.push({
      id: `demo-${slug}-${i}`,
      runId: `demo-run-${i}`,
      communityId: "",
      runnerName: slug.replace(/-/g, " "),
      walletAddress: "",
      distanceKm: Math.round(dist * 100) / 100,
      durationSeconds: dur,
      paceSecPerKm: Math.round(pace),
      kadEarned: kad,
      routeCoords: [],
      txSignature: null,
      sharedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
      fireCount: 3 + Math.floor(seededRandom(rs + 3) * 20),
      isSimulated: true,
    });
  }

  return {
    name: slug.replace(/-/g, " "),
    totalRuns,
    totalDistKm,
    totalDurationSec,
    kadBalance,
    streak,
    multiplier,
    runsThisWeek,
    level,
    levelXP,
    levelTitle,
    earnedBadges,
    communityName,
    sharedRuns: demoRuns,
  };
}

function fmtTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ALL_BADGES: { id: string; icon: string; label: string; desc: string }[] = [
  { id: "first-run", icon: "play", label: "First Step", desc: "Complete your first run" },
  { id: "streak-3", icon: "flame", label: "On Fire", desc: "3-week streak" },
  { id: "streak-7", icon: "crown", label: "7-Week Streak", desc: "7-week streak" },
  { id: "club-5k", icon: "route", label: "5K Club", desc: "Run 5 km in one session" },
  { id: "sub-30", icon: "bolt", label: "Sub-30", desc: "5 km under 30 minutes" },
  { id: "club-10k", icon: "medal", label: "10K Club", desc: "Run 10 km in one session" },
  { id: "speed-demon", icon: "zap", label: "Speed Demon", desc: "Reach Sprint zone" },
  { id: "half-marathon", icon: "trophy", label: "Half Marathon", desc: "Run 21 km in one session" },
];

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { wallet } = useWallet();
  const address = wallet?.account.address ?? "";

  const [isOwn, setIsOwn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const profileName = localStorage.getItem("kadence_profile_name") || "";
    const slugFromName = profileName.toLowerCase().replace(/\s+/g, "-");
    setIsOwn(slug === slugFromName || slug === address);
  }, [slug, address]);

  if (!mounted) {
    return <div style={{ background: "#0D0D0D", minHeight: "100dvh" }} />;
  }

  return isOwn ? <OwnProfile slug={slug} address={address} /> : <DemoProfile slug={slug} />;
}

function OwnProfile({ slug, address }: { slug: string; address: string }) {
  const { data: kadBalance } = useKadBalance((address || undefined) as Address | undefined);
  const { level, levelXP, levelTitle } = useXP();
  const { streak, multiplier, runsThisWeek, weeklyGoal } = useStreak();
  const { badges } = useBadges();
  const { runs, totalDistKm, totalRuns } = useRunHistory();
  const joinedCommunityId = typeof window !== "undefined" ? localStorage.getItem("kad_community_joined") : null;
  const joinedCommunity = COMMUNITIES.find(c => c.id === joinedCommunityId) ?? null;
  const { sharedRuns } = useSocialFeed(joinedCommunityId);
  const profileName = typeof window !== "undefined" ? localStorage.getItem("kadence_profile_name") || slug : slug;
  const totalDurationSec = runs.reduce((s, r) => s + r.duration, 0);
  const totalKad = kadBalance?.uiAmount ?? 0;

  return (
    <ProfileLayout
      name={profileName}
      walletAddr={address}
      kadBalance={totalKad}
      level={level}
      levelXP={levelXP}
      levelTitle={levelTitle}
      totalRuns={totalRuns}
      totalDistKm={totalDistKm}
      totalTimeSec={totalDurationSec}
      streak={streak}
      multiplier={multiplier}
      runsThisWeek={runsThisWeek}
      weeklyGoal={weeklyGoal}
      communityName={joinedCommunity?.name ?? null}
      badges={badges.map(b => ({ id: b.id, icon: b.icon, label: b.label, desc: b.desc, earned: b.earned }))}
      recentRuns={sharedRuns.filter(r => !r.isSimulated).slice(0, 5)}
    />
  );
}

function DemoProfile({ slug }: { slug: string }) {
  const demo = buildDemoProfile(slug);
  const badges = ALL_BADGES.map(b => ({ ...b, earned: demo.earnedBadges.has(b.id) }));

  return (
    <ProfileLayout
      name={demo.name}
      walletAddr={null}
      kadBalance={demo.kadBalance}
      level={demo.level}
      levelXP={demo.levelXP}
      levelTitle={demo.levelTitle}
      totalRuns={demo.totalRuns}
      totalDistKm={demo.totalDistKm}
      totalTimeSec={demo.totalDurationSec}
      streak={demo.streak}
      multiplier={demo.multiplier}
      runsThisWeek={demo.runsThisWeek}
      weeklyGoal={2}
      communityName={demo.communityName}
      badges={badges}
      recentRuns={demo.sharedRuns}
    />
  );
}

type ProfileLayoutProps = {
  name: string;
  walletAddr: string | null;
  kadBalance: number;
  level: number;
  levelXP: number;
  levelTitle: string;
  totalRuns: number;
  totalDistKm: number;
  totalTimeSec: number;
  streak: number;
  multiplier: number;
  runsThisWeek: number;
  weeklyGoal: number;
  communityName: string | null;
  badges: { id: string; icon: string; label: string; desc: string; earned: boolean }[];
  recentRuns: SharedRun[];
};

function avatarColor(str: string): string {
  const hex = str.replace(/[^a-fA-F0-9]/g, "").slice(0, 6).padEnd(6, "0");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgb(${Math.min(255, Math.floor(r * 0.6 + 80))},${Math.min(255, Math.floor(g * 0.6 + 80))},${Math.min(255, Math.floor(b * 0.6 + 80))})`;
}

function ProfileLayout({
  name, walletAddr, kadBalance, level, levelXP, levelTitle,
  totalRuns, totalDistKm, totalTimeSec,
  streak, multiplier, runsThisWeek, weeklyGoal,
  communityName, badges, recentRuns,
}: ProfileLayoutProps) {
  const avatarLetter = name ? name[0].toUpperCase() : "?";
  const avatarBg = walletAddr ? avatarColor(walletAddr) : avatarColor(name);

  return (
    <div style={{
      minHeight: "100dvh", background: "#0D0D0D", color: "#fff",
      fontFamily: "var(--font-sans)", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 430, padding: "0 0 60px" }}>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 22px 0",
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
          }}>
            Kadence
          </span>
          <svg width="20" height="16" viewBox="0 0 508 396" fill="none" style={{ opacity: 0.4 }}>
            <path d="M253.7 0L0.5 395.3h98l155.2-247.5L408.8 395.3h98L253.7 0z" fill="#fff" />
          </svg>
        </div>

        {/* Hero */}
        <div style={{ position: "relative", overflow: "hidden", padding: "40px 22px 36px" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 40%, rgba(224,244,121,0.2) 0%, transparent 60%)",
          }} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: avatarBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700, color: "#FFFFFF",
            }}>
              {avatarLetter}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, textAlign: "center" }}>
              {name}
            </div>
            {walletAddr && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                {ellipsify(walletAddr, 4)}
              </span>
            )}
          </div>
        </div>

        {/* KAD balance */}
        <div style={{ textAlign: "center", padding: "0 22px 28px" }}>
          <div style={{
            fontSize: 52, fontWeight: 700, color: "#E0F479",
            letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 28px rgba(224,244,121,0.3)",
          }}>
            {kadBalance.toFixed(2)}
          </div>
          <div style={{ fontSize: 14, color: "#E0F479", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 6 }}>
            KAD
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Lifetime stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Total runs", value: String(totalRuns) },
              { label: "Total km", value: totalDistKm.toFixed(1) },
              { label: "Total time", value: fmtTotalTime(totalTimeSec) },
            ].map((s) => (
              <div key={s.label} style={{
                background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 16, padding: 14,
              }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.3 }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 700, color: "#FFFFFF",
                  letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums",
                }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Streak + Level row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Streak */}
            <div style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 8 }}>
                Streak
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {streak}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {streak === 1 ? "week" : "weeks"}
                </span>
              </div>
              {multiplier > 1 && (
                <span style={{ fontSize: 10, color: "#E0F479", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6, display: "inline-block" }}>
                  {multiplier}x boost
                </span>
              )}
              <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i < runsThisWeek ? "#E0F479" : i < weeklyGoal ? "rgba(224,244,121,0.3)" : "rgba(224,244,121,0.1)",
                  }} />
                ))}
              </div>
            </div>

            {/* Level */}
            <div style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 16, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 8 }}>
                Level
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {level}
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {levelTitle}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", marginTop: 10 }}>
                <div style={{
                  width: `${levelXP}%`, height: "100%",
                  background: "#E0F479", borderRadius: 2,
                }} />
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {levelXP} / 100 XP
              </div>
            </div>
          </div>

          {/* Community badge */}
          {communityName && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px",
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 50,
            }}>
              <KIcon name="users" size={16} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{communityName}</span>
            </div>
          )}

          {/* Badges */}
          <div>
            <div style={{
              fontSize: 18, fontWeight: 600, color: "#FFFFFF",
              marginBottom: 12, letterSpacing: "-0.01em",
            }}>
              Badges
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400, marginLeft: 8 }}>
                {badges.filter(b => b.earned).length} / {badges.length}
              </span>
            </div>
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

          {/* Recent shared runs */}
          {recentRuns.length > 0 && (
            <div>
              <div style={{
                fontSize: 18, fontWeight: 600, color: "#FFFFFF",
                marginBottom: 12, letterSpacing: "-0.01em",
              }}>
                Recent runs
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentRuns.map((run) => (
                  <div key={run.id} style={{
                    background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 16, padding: "14px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {run.distanceKm.toFixed(2)} km
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                        {fmtPace(run.paceSecPerKm)}/km · {timeAgo(run.sharedAt)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#E0F479" }}>
                        {run.kadEarned.toFixed(2)} KAD
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 3 }}>
                        <KIcon name="flame" size={12} color="rgba(255,255,255,0.4)" />
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          {run.fireCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            textAlign: "center", paddingTop: 20, paddingBottom: 10,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>
              Built on Solana
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 6 }}>
              Kadence — Move to Earn
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
