"use client";

import useSWR from "swr";
import type { Address } from "@solana/kit";
import { useCluster } from "../../components/cluster-context";
import { useSolanaClient } from "../solana-client-context";
import { fetchChainRuns, type ChainRun } from "../chain-sync";

export type { ChainRun };

export function useChainSync(walletAddress?: Address) {
  const { cluster } = useCluster();
  const client = useSolanaClient();

  const { data, isLoading, mutate } = useSWR<ChainRun[]>(
    walletAddress ? (["chain-runs", cluster, walletAddress] as const) : null,
    async ([, , addr]) => fetchChainRuns(client, addr as Address),
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  return {
    chainRuns: data,
    syncing: isLoading,
    syncNow: () => void mutate(),
  };
}
