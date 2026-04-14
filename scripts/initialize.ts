#!/usr/bin/env tsx
/**
 * One-time setup: create the KAD token mint on localnet.
 *
 * Usage:
 *   npm run init
 *
 * Safe to re-run — it exits cleanly if the mint is already initialized.
 */
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { createClient } from "@solana/kit-client-rpc";
import { getInitializeInstructionAsync } from "../app/generated/kadence";
import fs from "fs";
import os from "os";
import path from "path";

const RPC_URL = "http://localhost:8899";
const WS_URL = "ws://localhost:8900";

async function main() {
  // Load the default Solana keypair
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypairBytes = new Uint8Array(JSON.parse(raw) as number[]);
  const payer = await createKeyPairSignerFromBytes(keypairBytes);

  console.log("Payer         :", payer.address);
  console.log("RPC           :", RPC_URL);

  const client = createClient({
    url: RPC_URL,
    rpcSubscriptionsConfig: { url: WS_URL },
    payer,
  });

  // Build the initialize instruction — Codama resolves mint + mintAuthority PDAs
  const ix = await getInitializeInstructionAsync({ payer });

  console.log("Sending initialize transaction…");
  try {
    const result = await client.sendTransaction([ix]);
    console.log("✓ KAD mint created!");
    console.log("  Signature :", result.context.signature);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Anchor's "already in use" error means the mint PDA already exists
    if (msg.includes("already in use") || msg.includes("0x0")) {
      console.log("✓ KAD mint already initialized — nothing to do.");
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
