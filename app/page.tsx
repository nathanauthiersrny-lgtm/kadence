"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWallet } from "./lib/wallet/context";
import { useSendTransaction } from "./lib/hooks/use-send-transaction";
import { useKadBalance } from "./lib/hooks/use-kad-balance";
import { useStreak } from "./lib/hooks/use-streak";
import { getCompleteRunInstructionAsync } from "./generated/kadence";
import { parseTransactionError } from "./lib/errors";
import { useCluster } from "./components/cluster-context";
import { HomeScreen } from "./components/home-screen";
import { ActiveRunScreen } from "./components/active-run-screen";
import { PostRunScreen } from "./components/post-run-screen";
import { CommunityScreen } from "./components/community-screen";
import { FlashRunScreen } from "./components/flash-run-screen";
import { ActivityScreen } from "./components/activity-screen";
import { ProfileScreen } from "./components/profile-screen";
import { useCommunity } from "./lib/hooks/use-community";
import { useFlashRun, type FlashRun, type RaceResult } from "./lib/hooks/use-flash-run";
import { useRunHistory } from "./lib/hooks/use-run-history";
import type { RunResult, LatLon } from "./lib/hooks/use-run-tracker";

type View = "home" | "running" | "post-run" | "community" | "flash-runs" | "history" | "profile";

type RunSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
  reachedSprint: boolean;
  routeCoords: LatLon[];
  result: RunResult;
  raceResult?: RaceResult;
};

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [activeFlashRun, setActiveFlashRun] = useState<FlashRun | null>(null);

  const { wallet, signer } = useWallet();
  const { send } = useSendTransaction();
  const { getExplorerUrl } = useCluster();
  const { multiplier } = useStreak();
  const { mutate: mutateBalance } = useKadBalance(wallet?.account.address);
  const { addRunContribution } = useCommunity();
  const { submitResult } = useFlashRun();
  const { saveRun } = useRunHistory();

  const handleStart = useCallback(() => {
    setClaimed(false);
    setActiveFlashRun(null);
    setView("running");
  }, []);

  const handleStartRace = useCallback((event: FlashRun) => {
    setClaimed(false);
    setActiveFlashRun(event);
    setView("running");
  }, []);

  const handleEnd = useCallback(
    (result: RunResult, snapshot: { distanceMeters: number; durationSeconds: number; reachedSprint: boolean; routeCoords: LatLon[] }) => {
      if (activeFlashRun) {
        const raceResult = submitResult(activeFlashRun.id, snapshot.distanceMeters, snapshot.durationSeconds);
        setRunSnapshot({ ...snapshot, result, raceResult });
        setActiveFlashRun(null);
      } else {
        setRunSnapshot({ ...snapshot, result });
      }
      setView("post-run");
    },
    [activeFlashRun, submitResult],
  );

  const handleCancel = useCallback(() => {
    setActiveFlashRun(null);
    setView("home");
  }, []);

  const handleCommunity = useCallback(() => {
    setView("community");
  }, []);

  const handleFlashRuns = useCallback(() => {
    setView("flash-runs");
  }, []);

  const handleClaim = useCallback(async () => {
    if (!signer || !runSnapshot) return;
    if (runSnapshot.result.distance < 100n) {
      toast.error("Run too short — need at least 100 m to earn KAD.");
      return;
    }

    setIsClaiming(true);
    try {
      const ix = await getCompleteRunInstructionAsync({
        runner: signer,
        distance: runSnapshot.result.distance,
        duration: runSnapshot.result.duration,
      });
      const sig = await send({ instructions: [ix] });
      void mutateBalance();
      // Persist run to history (on-chain confirmed)
      const distKm = Number(runSnapshot.result.distance) / 1000;
      const paceSecPerKm = runSnapshot.distanceMeters > 0
        ? (runSnapshot.durationSeconds / runSnapshot.distanceMeters) * 1000
        : 0;
      saveRun({
        date: new Date().toISOString(),
        distance: runSnapshot.distanceMeters,
        duration: runSnapshot.durationSeconds,
        pace: paceSecPerKm,
        kadEarned: distKm * multiplier,
        routeCoords: runSnapshot.routeCoords,
        txSignature: sig ?? null,
        xpEarned: Math.round(distKm * 10),
        badgeEarned: null,
      });
      setClaimed(true);
      // Record contribution to community challenge
      addRunContribution(distKm, paceSecPerKm);
      toast.success("KAD minted!", {
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
      console.error("complete_run failed:", err);
      toast.error(parseTransactionError(err));
    } finally {
      setIsClaiming(false);
    }
  }, [signer, runSnapshot, send, getExplorerUrl, mutateBalance]);

  const handleBack = useCallback(() => {
    setRunSnapshot(null);
    setActiveFlashRun(null);
    setView("home");
  }, []);

  const handleHistory = useCallback(() => {
    setView("history");
  }, []);

  const handleProfile = useCallback(() => {
    setView("profile");
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--kad-bg)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      {/* Centered mobile column */}
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          minHeight: "100dvh",
          background: "var(--kad-bg)",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        {view === "home" && (
          <HomeScreen onStart={handleStart} onCommunity={handleCommunity} onFlashRuns={handleFlashRuns} onProfile={handleProfile} />
        )}

        {view === "history" && (
          <ActivityScreen onBack={() => setView("home")} onStart={handleStart} />
        )}

        {view === "profile" && (
          <ProfileScreen onBack={() => setView("home")} onHistory={handleHistory} />
        )}

        {view === "running" && (
          <ActiveRunScreen onEnd={handleEnd} onCancel={handleCancel} flashRun={activeFlashRun ?? undefined} />
        )}

        {view === "community" && (
          <CommunityScreen onBack={() => setView("home")} />
        )}

        {view === "flash-runs" && (
          <FlashRunScreen onBack={() => setView("home")} onStartRace={handleStartRace} />
        )}

        {view === "post-run" && runSnapshot && (
          <PostRunScreen
            snapshot={runSnapshot}
            multiplier={multiplier}
            onClaim={handleClaim}
            onBack={handleBack}
            isClaiming={isClaiming}
            claimed={claimed}
            raceResult={runSnapshot.raceResult}
          />
        )}
      </div>
    </div>
  );
}
