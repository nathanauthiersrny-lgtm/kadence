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
import type { RunResult } from "./lib/hooks/use-run-tracker";

type View = "home" | "running" | "post-run";

type RunSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
  reachedSprint: boolean;
  result: RunResult;
};

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const { wallet, signer } = useWallet();
  const { send } = useSendTransaction();
  const { getExplorerUrl } = useCluster();
  const { multiplier } = useStreak();
  const { mutate: mutateBalance } = useKadBalance(wallet?.account.address);

  const handleStart = useCallback(() => {
    setClaimed(false);
    setView("running");
  }, []);

  const handleEnd = useCallback(
    (result: RunResult, snapshot: { distanceMeters: number; durationSeconds: number; reachedSprint: boolean }) => {
      setRunSnapshot({ ...snapshot, result });
      setView("post-run");
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setView("home");
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
      setClaimed(true);
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
    setView("home");
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
        {view === "home" && <HomeScreen onStart={handleStart} />}

        {view === "running" && (
          <ActiveRunScreen onEnd={handleEnd} onCancel={handleCancel} />
        )}

        {view === "post-run" && runSnapshot && (
          <PostRunScreen
            snapshot={runSnapshot}
            multiplier={multiplier}
            onClaim={handleClaim}
            onBack={handleBack}
            isClaiming={isClaiming}
            claimed={claimed}
          />
        )}
      </div>
    </div>
  );
}
