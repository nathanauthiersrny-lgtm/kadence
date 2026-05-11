"use client";

import { useCallback, useState } from "react";
import { KIcon } from "./ui/primitives";
import { generateRunCardPNG } from "../lib/run-card-png";
import { useSocialFeed } from "../lib/hooks/use-social-feed";
import { COMMUNITIES } from "../lib/hooks/use-community";
import { modeKey } from "../lib/storage";
import { useWallet } from "../lib/wallet/context";
import type { LatLon } from "../lib/hooks/use-run-tracker";

type Props = {
  runId: string;
  distanceMeters: number;
  durationSeconds: number;
  kadEarned: number;
  runStartedAt: Date;
  routeCoords: LatLon[];
  txSignature: string | null;
  allowSolo?: boolean;
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

export function RunShareControls({
  runId,
  distanceMeters,
  durationSeconds,
  kadEarned,
  runStartedAt,
  routeCoords,
  txSignature,
  allowSolo = false,
  flashRunEventName,
  flashRunPosition,
  flashRunTotalRunners,
}: Props) {
  const { signer } = useWallet();

  const joinedCommunityId =
    typeof window !== "undefined"
      ? localStorage.getItem(modeKey("kad_community_joined"))
      : null;
  const joinedCommunity =
    COMMUNITIES.find((c) => c.id === joinedCommunityId) ?? null;

  const runnerName =
    (typeof window !== "undefined" &&
      localStorage.getItem("kadence_profile_name")) ||
    "Runner";
  const walletAddress = signer?.address?.toString() ?? "";
  const profileSlug =
    typeof window !== "undefined"
      ? (() => {
          const name = localStorage.getItem("kadence_profile_name");
          if (name) return name.toLowerCase().replace(/\s+/g, "-");
          return walletAddress || undefined;
        })()
      : undefined;

  const { sharedRuns, shareRun } = useSocialFeed(joinedCommunity?.id ?? null);
  const alreadyShared = sharedRuns.some(
    (s) => s.runId === runId && !s.isSimulated
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const distKm = distanceMeters / 1000;
  const paceSecPerKm =
    distanceMeters > 0 ? (durationSeconds / distanceMeters) * 1000 : 0;
  const pMin = Math.floor(paceSecPerKm / 60);
  const pSec = Math.round(paceSecPerKm % 60);
  const paceFormatted = `${pMin}:${pSec.toString().padStart(2, "0")}`;

  const handleShareToFeed = useCallback(() => {
    if (!joinedCommunity) return;
    shareRun({
      runId,
      communityId: joinedCommunity.id,
      runnerName,
      walletAddress,
      distanceKm: distKm,
      durationSeconds,
      paceSecPerKm,
      kadEarned,
      routeCoords: routeCoords.filter((_, i) => i % 5 === 0),
      txSignature,
      flashRunEventName,
      flashRunPosition,
      flashRunTotalRunners,
    });
  }, [
    joinedCommunity,
    shareRun,
    runId,
    runnerName,
    walletAddress,
    distKm,
    durationSeconds,
    paceSecPerKm,
    kadEarned,
    routeCoords,
    txSignature,
    flashRunEventName,
    flashRunPosition,
    flashRunTotalRunners,
  ]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await generateRunCardPNG({
        distanceKm: distKm,
        paceFormatted,
        kadEarned,
        runStartedAt,
      });
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
  }, [distKm, paceFormatted, kadEarned, runStartedAt]);

  const handleTweet = useCallback(() => {
    const tweetText = `Just ran ${distKm.toFixed(2)}km at ${paceFormatted}/km and earned ${kadEarned.toFixed(2)} $KAD on @kadenceRun \u{1F525}`;
    const parts = [`text=${encodeURIComponent(tweetText)}`];
    if (profileSlug) {
      const profileUrl = `${window.location.origin}/u/${profileSlug}`;
      parts.push(`url=${encodeURIComponent(profileUrl)}`);
    }
    window.open(
      `https://twitter.com/intent/tweet?${parts.join("&")}`,
      "_blank"
    );
  }, [distKm, paceFormatted, kadEarned, profileSlug]);

  const showInitialShare = !!joinedCommunity && !alreadyShared;
  const showSharedState = !!joinedCommunity && alreadyShared;
  const showSoloButtons =
    !joinedCommunity && (txSignature !== null || allowSolo);

  if (!showInitialShare && !showSharedState && !showSoloButtons) {
    return null;
  }

  if (showInitialShare) {
    return (
      <button
        onClick={handleShareToFeed}
        style={{
          height: 50,
          borderRadius: 50,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "transparent",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.08em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
        }}
      >
        <KIcon name="share" size={14} color="rgba(255,255,255,0.7)" /> Share to{" "}
        {joinedCommunity!.name}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {showSharedState && (
        <div
          style={{
            height: 44,
            borderRadius: 50,
            border: "1px solid rgba(63,185,119,0.3)",
            background: "rgba(63,185,119,0.1)",
            color: "#3FB977",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: "0.08em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <KIcon name="check" size={14} color="#3FB977" /> Shared to{" "}
          {joinedCommunity!.name}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          style={{
            flex: 1,
            height: 46,
            borderRadius: 50,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "transparent",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.06em",
            cursor: isGenerating ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          <KIcon name="download" size={14} color="#fff" />
          {isGenerating ? "Generating…" : "Run Card"}
        </button>
        <button
          onClick={handleTweet}
          style={{
            flex: 1,
            height: 46,
            borderRadius: 50,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "transparent",
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.06em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <KIcon name="share" size={14} color="#fff" />
          Share on X
        </button>
      </div>
    </div>
  );
}
