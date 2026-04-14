"use client";

import useSWR from "swr";
import {
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";
import { useCluster } from "../../components/cluster-context";
import { useSolanaClient } from "../solana-client-context";
import { findMintPda } from "../../generated/kadence";

// Bytes of the SPL Token program address (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
// Used as a seed in the ATA PDA derivation.
const SPL_TOKEN_PROGRAM_BYTES = new Uint8Array([
  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172,
  28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169,
]);

const ATA_PROGRAM =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address<"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL">;

export async function findKadAtaAddress(runner: Address): Promise<Address> {
  const [mint] = await findMintPda();
  const [ata] = await getProgramDerivedAddress({
    programAddress: ATA_PROGRAM,
    seeds: [
      getAddressEncoder().encode(runner),
      getBytesEncoder().encode(SPL_TOKEN_PROGRAM_BYTES),
      getAddressEncoder().encode(mint),
    ],
  });
  return ata;
}

export type KadBalanceResult = {
  ata: Address;
  /** Raw token amount as a string (no decimals applied). */
  amount: string;
  /** Human-readable amount (amount / 10^6). */
  uiAmount: number;
};

export function useKadBalance(runnerAddress?: Address) {
  const { cluster } = useCluster();
  const client = useSolanaClient();

  return useSWR<KadBalanceResult>(
    runnerAddress
      ? (["kad-balance", cluster, runnerAddress] as const)
      : null,
    async ([, , runner]) => {
      const ata = await findKadAtaAddress(runner as Address);
      try {
        const { value } = await client.rpc
          .getTokenAccountBalance(ata)
          .send();
        return {
          ata,
          amount: value.amount,
          uiAmount: value.uiAmount ?? 0,
        };
      } catch {
        // Account doesn't exist yet — runner has never completed a run.
        return { ata, amount: "0", uiAmount: 0 };
      }
    },
    { refreshInterval: 5_000, revalidateOnFocus: true },
  );
}
