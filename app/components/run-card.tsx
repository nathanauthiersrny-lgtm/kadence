"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { useRunTracker } from "../lib/hooks/use-run-tracker";
import { getCompleteRunInstructionAsync } from "../generated/kadence";
import { parseTransactionError } from "../lib/errors";
import { useCluster } from "./cluster-context";

// Leaflet accesses `window` at module level — load only in the browser.
const RunMap = dynamic(() => import("./run-map").then((m) => m.RunMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-60 items-center justify-center rounded-xl bg-cream/30 text-sm text-muted">
      Loading map…
    </div>
  ),
});

const KAD_DECIMALS = 6;
const KAD_DIVISOR = BigInt(10 ** KAD_DECIMALS);

function formatKad(rawAmount: string): string {
  const base = BigInt(rawAmount);
  const whole = base / KAD_DIVISOR;
  const frac = (base % KAD_DIVISOR).toString().padStart(KAD_DECIMALS, "0");
  const trimmed = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${whole}.${trimmed}`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatDuration(s: number): string {
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Returns pace as "m:ss /km", or "—" if not enough data. */
function formatPace(metres: number, seconds: number): string {
  if (metres < 10) return "—";
  const secsPerKm = (seconds / metres) * 1000;
  const mm = Math.floor(secsPerKm / 60);
  const ss = Math.round(secsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss} /km`;
}

// Minimum distance to allow a submission (100 m — avoids dust runs)
const MIN_DISTANCE_M = 100n;

export function RunCard() {
  const { wallet, signer, status } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();
  const [lastRewardRaw, setLastRewardRaw] = useState<string | null>(null);

  const walletAddress = wallet?.account.address;
  const { data: kadBalance, mutate: mutateBalance } =
    useKadBalance(walletAddress);

  const {
    isRunning,
    distanceMeters,
    durationSeconds,
    route,
    geoError,
    startRun,
    stopRun,
  } = useRunTracker();

  const handleCompleteRun = useCallback(
    async (distance: bigint, duration: bigint) => {
      if (!signer) return;

      try {
        const ix = await getCompleteRunInstructionAsync({
          runner: signer,
          distance,
          duration,
        });

        const signature = await send({ instructions: [ix] });

        // 1 KAD per km = 1_000 base units per metre
        const rewardRaw = (distance * 1_000n).toString();
        setLastRewardRaw(rewardRaw);
        void mutateBalance();

        toast.success("Run recorded! KAD minted.", {
          description: (
            <a
              href={getExplorerUrl(`/tx/${signature}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View transaction
            </a>
          ),
        });
      } catch (err) {
        console.error("complete_run failed:", err);
        toast.error(parseTransactionError(err));
      }
    },
    [signer, send, getExplorerUrl, mutateBalance],
  );

  const handleFinishRun = useCallback(async () => {
    const { distance, duration } = stopRun();

    if (distance < MIN_DISTANCE_M) {
      toast.error("Run too short — need at least 100 m to earn KAD.");
      return;
    }

    await handleCompleteRun(distance, duration);
  }, [stopRun, handleCompleteRun]);

  // ── Not connected ──────────────────────────────────────────────────────
  if (status !== "connected") {
    return (
      <section className="w-full space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Run &amp; Earn KAD</p>
          <p className="text-sm text-muted">
            Connect your wallet to start earning KAD tokens.
          </p>
        </div>
        <div className="rounded-lg bg-cream/50 p-4 text-center text-sm text-muted">
          Wallet not connected
        </div>
      </section>
    );
  }

  const rawAmount = kadBalance?.amount ?? "0";

  return (
    <section className="w-full space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Run &amp; Earn KAD</p>
          <p className="text-sm text-muted">
            {isRunning ? "Run in progress…" : "Complete a run to mint KAD — 1 KAD per km."}
          </p>
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {isRunning ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          ) : (
            "Move-to-Earn"
          )}
        </span>
      </div>

      {/* KAD Balance */}
      <div className="rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          KAD Balance
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight">
          {formatKad(rawAmount)}
          <span className="ml-1.5 text-lg font-normal text-muted">KAD</span>
        </p>
        {kadBalance?.ata && BigInt(rawAmount) > 0n && (
          <p className="mt-2 truncate font-mono text-xs text-muted">
            {kadBalance.ata}
          </p>
        )}
      </div>

      {/* Live stats (shown while running or after GPS lock) */}
      {(isRunning || route.length > 0) && (
        <div className="rounded-lg border border-border-low bg-card px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {isRunning ? "Current run" : "Last run"}
          </p>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted">Distance</p>
              <p className="font-semibold">{formatDistance(distanceMeters)}</p>
            </div>
            <div>
              <p className="text-muted">Duration</p>
              <p className="font-semibold tabular-nums">
                {formatDuration(durationSeconds)}
              </p>
            </div>
            <div>
              <p className="text-muted">Pace</p>
              <p className="font-semibold tabular-nums">
                {formatPace(distanceMeters, durationSeconds)}
              </p>
            </div>
            <div>
              <p className="text-muted">Reward</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                +{(distanceMeters / 1000).toFixed(3)} KAD
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live map */}
      {(isRunning || route.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-border-low">
          <RunMap route={route} className="w-full" />
        </div>
      )}

      {/* GPS error */}
      {geoError && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
          GPS error: {geoError}
        </div>
      )}

      {/* Last run reward badge */}
      {lastRewardRaw !== null && !isRunning && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
          Last run: +{formatKad(lastRewardRaw)} KAD earned
        </div>
      )}

      {/* CTA */}
      {!isRunning ? (
        <button
          onClick={startRun}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
        >
          Start Run →
        </button>
      ) : (
        <button
          onClick={handleFinishRun}
          disabled={isSending}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSending ? "Recording run…" : "Finish Run & Claim KAD →"}
        </button>
      )}
    </section>
  );
}
