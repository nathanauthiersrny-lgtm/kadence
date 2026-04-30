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
import { useFlashRun, getActiveBoost, type FlashRun, type RaceResult } from "./lib/hooks/use-flash-run";
import { useRunHistory } from "./lib/hooks/use-run-history";
import { useChainSync } from "./lib/hooks/use-chain-sync";
import type { RunResult, LatLon } from "./lib/hooks/use-run-tracker";

type Trophy = {
  id: string;
  eventName: string;
  eventType: string;
  date: string;
  position: number;
  totalRunners: number;
  timeSeconds: number;
  distanceMeters: number;
  kadWon: number;
};

const TROPHIES_KEY = "kadence_trophies";

function saveTrophy(trophy: Trophy) {
  try {
    const raw = localStorage.getItem(TROPHIES_KEY);
    const trophies: Trophy[] = raw ? JSON.parse(raw) : [];
    trophies.unshift(trophy);
    localStorage.setItem(TROPHIES_KEY, JSON.stringify(trophies));
  } catch { /* ignore */ }
}

type View = "home" | "running" | "post-run" | "community" | "flash-runs" | "history" | "profile";

type RunSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
  reachedSprint: boolean;
  routeCoords: LatLon[];
  result: RunResult;
  raceResult?: RaceResult;
  savedRunId?: string;
  baseKAD: number;
  boostMultiplier: number;
  boostName: string | null;
  underdogMultiplier: number;
  finalKAD: number;
  flashRunEvent?: FlashRun;
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
  const { chainRuns, syncing: chainSyncing, syncNow: chainSyncNow } = useChainSync(wallet?.account.address);
  const { saveRun, updateRunTx } = useRunHistory(chainRuns);

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
      let raceResult: RaceResult | undefined;
      let savedRunId: string | undefined;
      try {
        if (activeFlashRun) {
          raceResult = submitResult(activeFlashRun.id, snapshot.distanceMeters, snapshot.durationSeconds);
        }
        const distKm = snapshot.distanceMeters / 1000;
        const paceSecPerKm = snapshot.distanceMeters > 0
          ? (snapshot.durationSeconds / snapshot.distanceMeters) * 1000
          : 0;

        const baseKAD = distKm;
        const boost = getActiveBoost();
        const boostMult = boost?.multiplier ?? 1;
        const boostName = boost?.eventName ?? null;
        const underdogMult = (raceResult && !raceResult.dnf && raceResult.position >= 4) ? 1.2 : 1;
        const finalKAD = Math.round(baseKAD * multiplier * boostMult * underdogMult * 100) / 100;

        savedRunId = saveRun({
          date: new Date().toISOString(),
          distance: snapshot.distanceMeters,
          duration: snapshot.durationSeconds,
          pace: paceSecPerKm,
          kadEarned: finalKAD,
          routeCoords: snapshot.routeCoords,
          txSignature: null,
          xpEarned: Math.round(distKm * 10),
          badgeEarned: null,
        });
        addRunContribution(distKm, paceSecPerKm);
        if (activeFlashRun) setActiveFlashRun(null);

        setRunSnapshot({
          ...snapshot, result, raceResult, savedRunId,
          baseKAD, boostMultiplier: boostMult, boostName, underdogMultiplier: underdogMult, finalKAD,
          flashRunEvent: activeFlashRun ?? undefined,
        });
      } catch (err) {
        console.error("Failed to persist run data:", err);
        if (activeFlashRun) setActiveFlashRun(null);
        const distKm = snapshot.distanceMeters / 1000;
        setRunSnapshot({
          ...snapshot, result, raceResult,
          baseKAD: distKm, boostMultiplier: 1, boostName: null, underdogMultiplier: 1, finalKAD: Math.round(distKm * multiplier * 100) / 100,
          flashRunEvent: activeFlashRun ?? undefined,
        });
      }

      setView("post-run");
    },
    [activeFlashRun, submitResult, saveRun, multiplier, addRunContribution],
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
    if (!signer) {
      toast.error("Connect your wallet to claim KAD.");
      return;
    }
    if (!runSnapshot) return;
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
      if (sig && runSnapshot.savedRunId) {
        updateRunTx(runSnapshot.savedRunId, sig);
      }
      setClaimed(true);
      if (runSnapshot.flashRunEvent?.type === "race" && runSnapshot.raceResult && !runSnapshot.raceResult.dnf) {
        const pool = runSnapshot.flashRunEvent.prizePoolKad;
        let kadWon = 0;
        if (runSnapshot.raceResult.position === 1) kadWon = Math.round(pool * 0.5 * 100) / 100;
        else if (runSnapshot.raceResult.position === 2) kadWon = Math.round(pool * 0.3 * 100) / 100;
        else if (runSnapshot.raceResult.position === 3) kadWon = Math.round(pool * 0.2 * 100) / 100;
        saveTrophy({
          id: String(Date.now()),
          eventName: runSnapshot.flashRunEvent.name,
          eventType: runSnapshot.flashRunEvent.name,
          date: new Date().toISOString(),
          position: runSnapshot.raceResult.position,
          totalRunners: runSnapshot.raceResult.totalParticipants,
          timeSeconds: runSnapshot.durationSeconds,
          distanceMeters: runSnapshot.distanceMeters,
          kadWon,
        });
      }
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
  }, [signer, runSnapshot, send, getExplorerUrl, mutateBalance, updateRunTx]);

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
          <ActivityScreen onBack={() => setView("home")} onStart={handleStart} syncing={chainSyncing} onSync={chainSyncNow} />
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
