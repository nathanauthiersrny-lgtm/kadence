#!/usr/bin/env tsx
/**
 * One-time: attach Metaplex token metadata to the KAD mint.
 *
 * Usage:
 *   npm run add-metadata
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npm run add-metadata
 *
 * Safe to re-run — exits cleanly if metadata already exists.
 */
import {
  createKeyPairSignerFromBytes,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
  type Instruction,
} from "@solana/kit";
import { createClient } from "@solana/kit-client-rpc";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const RPC_URL = process.env.ANCHOR_PROVIDER_URL ?? "http://localhost:8899";
const WS_URL = RPC_URL.replace(/^http/, "ws").replace("8899", "8900");

const KADENCE_PROGRAM_ID =
  "DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK" as Address;
const TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address;

const TOKEN_NAME = "Kadence";
const TOKEN_SYMBOL = "KAD";
const TOKEN_URI =
  "https://raw.githubusercontent.com/nathanauthiersrny-lgtm/kadence/main/public/metadata/kad-token.json";

function anchorDiscriminator(name: string): Uint8Array {
  const hash = crypto.createHash("sha256").update(`global:${name}`).digest();
  return new Uint8Array(hash.slice(0, 8));
}

function encodeBorshString(s: string): Uint8Array {
  const encoded = new TextEncoder().encode(s);
  const buf = new Uint8Array(4 + encoded.length);
  new DataView(buf.buffer).setUint32(0, encoded.length, true);
  buf.set(encoded, 4);
  return buf;
}

async function main() {
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypairBytes = new Uint8Array(JSON.parse(raw) as number[]);
  const payer = await createKeyPairSignerFromBytes(keypairBytes);

  console.log("Payer         :", payer.address);
  console.log("RPC           :", RPC_URL);

  // Derive PDAs
  const [mintPda] = await getProgramDerivedAddress({
    programAddress: KADENCE_PROGRAM_ID,
    seeds: [getBytesEncoder().encode(getUtf8Encoder().encode("kad-mint"))],
  });

  const [mintAuthority] = await getProgramDerivedAddress({
    programAddress: KADENCE_PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(getUtf8Encoder().encode("mint-authority")),
    ],
  });

  // Metaplex metadata PDA: seeds = ["metadata", metadata_program_id, mint]
  const [metadataPda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(getUtf8Encoder().encode("metadata")),
      getBytesEncoder().encode(
        getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ID)
      ),
      getBytesEncoder().encode(getAddressEncoder().encode(mintPda)),
    ],
  });

  console.log("Mint PDA      :", mintPda);
  console.log("Mint Authority:", mintAuthority);
  console.log("Metadata PDA  :", metadataPda);

  // Build instruction data: discriminator + borsh-encoded (name, symbol, uri)
  const discriminator = anchorDiscriminator("create_token_metadata");
  const nameBytes = encodeBorshString(TOKEN_NAME);
  const symbolBytes = encodeBorshString(TOKEN_SYMBOL);
  const uriBytes = encodeBorshString(TOKEN_URI);

  const data = new Uint8Array(
    discriminator.length + nameBytes.length + symbolBytes.length + uriBytes.length
  );
  let offset = 0;
  data.set(discriminator, offset);
  offset += discriminator.length;
  data.set(nameBytes, offset);
  offset += nameBytes.length;
  data.set(symbolBytes, offset);
  offset += symbolBytes.length;
  data.set(uriBytes, offset);

  // Account metas match the CreateTokenMetadata struct order:
  // payer (writable, signer), mint, mint_authority, metadata (writable),
  // token_metadata_program, system_program
  const ix: Instruction = {
    programAddress: KADENCE_PROGRAM_ID,
    accounts: [
      { address: payer.address, role: 3 /* WritableSigner */ },
      { address: mintPda, role: 0 /* Readonly */ },
      { address: mintAuthority, role: 0 /* Readonly */ },
      { address: metadataPda, role: 1 /* Writable */ },
      { address: TOKEN_METADATA_PROGRAM_ID, role: 0 /* Readonly */ },
      {
        address: "11111111111111111111111111111111" as Address,
        role: 0 /* Readonly */,
      },
    ],
    data,
  };

  const client = createClient({
    url: RPC_URL,
    rpcSubscriptionsConfig: { url: WS_URL },
    payer,
  });

  console.log("Sending create_token_metadata transaction…");
  try {
    const result = await client.sendTransaction([ix]);
    console.log("✓ Token metadata created!");
    console.log("  Signature :", result.context.signature);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already in use") || msg.includes("0x0")) {
      console.log("✓ Metadata already exists — nothing to do.");
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
