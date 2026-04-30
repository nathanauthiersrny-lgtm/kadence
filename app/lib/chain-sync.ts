import { getBase58Encoder, type Address, type ReadonlyUint8Array } from "@solana/kit";
import {
  COMPLETE_RUN_DISCRIMINATOR,
  getCompleteRunInstructionDataDecoder,
} from "../generated/kadence/instructions/completeRun";
import { KADENCE_PROGRAM_ADDRESS } from "../generated/kadence/programs/kadence";
import type { SolanaClient } from "./solana-client";

export type ChainRun = {
  txSignature: string;
  blockTime: number;
  distance: number;
  duration: number;
};

function discriminatorMatches(data: ReadonlyUint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== COMPLETE_RUN_DISCRIMINATOR[i]) return false;
  }
  return true;
}

export async function fetchChainRuns(
  client: SolanaClient,
  walletAddress: Address,
): Promise<ChainRun[]> {
  const signatures = await client.rpc
    .getSignaturesForAddress(walletAddress, { limit: 200 })
    .send();

  const successful = signatures.filter((s) => s.err === null);
  if (successful.length === 0) return [];

  const ixDecoder = getCompleteRunInstructionDataDecoder();
  const b58Encoder = getBase58Encoder();
  const runs: ChainRun[] = [];

  for (const sigInfo of successful) {
    try {
      const tx = await client.rpc
        .getTransaction(sigInfo.signature, {
          encoding: "json",
          maxSupportedTransactionVersion: 0,
        })
        .send();

      if (!tx) continue;

      const { accountKeys, instructions } = tx.transaction.message;

      for (const ix of instructions) {
        if (accountKeys[ix.programIdIndex] !== KADENCE_PROGRAM_ADDRESS)
          continue;

        const dataBytes = b58Encoder.encode(ix.data as string);
        if (!discriminatorMatches(dataBytes)) continue;

        const decoded = ixDecoder.decode(dataBytes);
        runs.push({
          txSignature: sigInfo.signature,
          blockTime: Number(tx.blockTime ?? sigInfo.blockTime ?? 0),
          distance: Number(decoded.distance),
          duration: Number(decoded.duration),
        });
      }
    } catch {
      // skip unparseable transactions
    }
  }

  return runs;
}
