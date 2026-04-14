"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useWallet } from "../lib/wallet/context";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useKadBalance } from "../lib/hooks/use-kad-balance";
import { getCompleteRunInstructionAsync } from "../generated/kadence";
import { parseTransactionError } from "../lib/errors";
import { useCluster } from "./cluster-context";

// Mock run: 5 km in 30 minutes (360 sec/km — well above the 60 sec/km floor)
const MOCK_DISTANCE = 5_000n; // metres
const MOCK_DURATION = 1_800n; // seconds

const KAD_DECIMALS = 6;
const KAD_DIVISOR = BigInt(10 ** KAD_DECIMALS);

/** Format a raw base-unit string as "X.XX KAD" */
function formatKad(rawAmount: string): string {
  const base = BigInt(rawAmount);
  const whole = base / KAD_DIVISOR;
  const frac = (base % KAD_DIVISOR).toString().padStart(KAD_DECIMALS, "0");
  // Trim trailing zeros but keep at least two decimal places
  const trimmed = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${whole}.${trimmed}`;
}

export function RunCard() {
  const { wallet, signer, status } = useWallet();
  const { send, isSending } = useSendTransaction();
  const { getExplorerUrl } = useCluster();
  const [lastRewardRaw, setLastRewardRaw] = useState<string | null>(null);

  const walletAddress = wallet?.account.address;
  const { data: kadBalance, mutate: mutateBalance } =
    useKadBalance(walletAddress);

  const handleCompleteRun = useCallback(async () => {
    if (!signer) return;

    try {
      // Codama resolves mint, runnerTokenAccount, and mintAuthority PDAs
      const ix = await getCompleteRunInstructionAsync({
        runner: signer,
        distance: MOCK_DISTANCE,
        duration: MOCK_DURATION,
      });

      const signature = await send({ instructions: [ix] });

      // reward = distance * 1_000 base units  (1 KAD per km)
      const rewardRaw = (MOCK_DISTANCE * 1_000n).toString();
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
  }, [signer, send, getExplorerUrl, mutateBalance]);

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
            Complete a run to mint KAD — 1 KAD per km.
          </p>
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          Move-to-Earn
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

      {/* Mock run preview */}
      <div className="rounded-lg border border-border-low bg-card px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Next run (mock)
        </p>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted">Distance</p>
            <p className="font-semibold">5.00 km</p>
          </div>
          <div>
            <p className="text-muted">Duration</p>
            <p className="font-semibold">30:00</p>
          </div>
          <div>
            <p className="text-muted">Reward</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              +5.00 KAD
            </p>
          </div>
        </div>
      </div>

      {/* Last run reward badge */}
      {lastRewardRaw !== null && (
        <div className="rounded-lg bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
          Last run: +{formatKad(lastRewardRaw)} KAD earned
        </div>
      )}

      {/* Complete Run CTA */}
      <button
        onClick={handleCompleteRun}
        disabled={isSending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSending ? "Recording run…" : "Complete Run →"}
      </button>
    </section>
  );
}
