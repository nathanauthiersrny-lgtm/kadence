import type { Address } from "@solana/kit";
import type { WalletConnector, WalletSession } from "./types";
import nacl from "tweetnacl";
import bs58 from "bs58";

const PHANTOM_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyNiIgZmlsbD0iIzUxMUFCNyIvPjxwYXRoIGQ9Ik0xMTAuNTg0IDY0LjkxNDJIMTAwLjk4QzkxLjM3NiA2NC45MTQyIDg0LjE4NCA1Ny43OTQyIDgyLjIgNDguNjE4MkM4MC4yMTYgMzkuNDQyMiA3My4wMjQgMzIuMzIyMiA2My40MiAzMi4zMjIySDM0LjMyQzI5LjUwNCAzMi4zMjIyIDI1LjYgMzYuMjI2MiAyNS42IDQxLjA0MjJWODguOTE4MkMyNS42IDkzLjczNDIgMjkuNTA0IDk3LjYzODIgMzQuMzIgOTcuNjM4MkgxMTAuNTg0QzExNS40IDk3LjYzODIgMTE5LjMwNCA5My43MzQyIDExOS4zMDQgODguOTE4MlY3My42MzQyQzExOS4zMDQgNjguODE4MiAxMTUuNCA2NC45MTQyIDExMC41ODQgNjQuOTE0MloiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl82MjM3XzM0MDgpIi8+PGNpcmNsZSBjeD0iNDUuNjY0IiBjeT0iNTkuMjUwMiIgcj0iNi4xNDQiIGZpbGw9IndoaXRlIi8+PGNpcmNsZSBjeD0iNjYuMzA0IiBjeT0iNTkuMjUwMiIgcj0iNi4xNDQiIGZpbGw9IndoaXRlIi8+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzYyMzdfMzQwOCIgeDE9IjcyLjQ1MiIgeTE9IjI4LjczODIiIHgyPSI3Mi40NTIiIHkyPSI5Ny42MzgyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iI0NDQjhGRiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0id2hpdGUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4=";

const STORAGE_KEYS = {
  SESSION: "kadence_phantom_session",
  KEYPAIR: "kadence_phantom_dapp_keypair",
} as const;

type PhantomSession = {
  publicKey: string; // bs58
  sharedSecret: string; // bs58
  phantomEncryptionPubkey: string; // bs58
};

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function hasInjectedPhantom(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).phantom?.solana?.isPhantom;
}

export function shouldUseMobileConnector(): boolean {
  return isMobile() && !hasInjectedPhantom();
}

function getDappKeypair(): nacl.BoxKeyPair {
  const stored = localStorage.getItem(STORAGE_KEYS.KEYPAIR);
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      publicKey: bs58.decode(parsed.publicKey),
      secretKey: bs58.decode(parsed.secretKey),
    };
  }
  const kp = nacl.box.keyPair();
  localStorage.setItem(
    STORAGE_KEYS.KEYPAIR,
    JSON.stringify({
      publicKey: bs58.encode(kp.publicKey),
      secretKey: bs58.encode(kp.secretKey),
    })
  );
  return kp;
}

function decryptPayload(
  data: string,
  nonce: string,
  sharedSecret: Uint8Array
): Record<string, string> {
  const decrypted = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  if (!decrypted) throw new Error("Failed to decrypt Phantom response");
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function encryptPayload(
  payload: Record<string, string>,
  sharedSecret: Uint8Array
): { data: string; nonce: string } {
  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.box.after(
    new TextEncoder().encode(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );
  return {
    data: bs58.encode(encrypted),
    nonce: bs58.encode(nonce),
  };
}

function buildRedirectUrl(path: string): string {
  return `${window.location.origin}${window.location.pathname}?phantom_action=${path}`;
}

function getStoredSession(): PhantomSession | null {
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSharedSecret(
  phantomPubkey: Uint8Array,
  dappSecretKey: Uint8Array
): Uint8Array {
  return nacl.box.before(phantomPubkey, dappSecretKey);
}

export function createPhantomMobileConnector(): WalletConnector {
  return {
    id: "phantom-mobile",
    name: "Phantom",
    icon: PHANTOM_ICON,
    connect: async (options) => {
      const stored = getStoredSession();

      if (options?.silent && stored) {
        return buildSession(stored);
      }

      if (options?.silent) {
        throw new Error("No stored session for silent connect");
      }

      if (stored) {
        return buildSession(stored);
      }

      const dappKeypair = getDappKeypair();
      const redirectUrl = buildRedirectUrl("connect");

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeypair.publicKey),
        cluster: "devnet",
        app_url: window.location.origin,
        redirect_link: redirectUrl,
      });

      window.location.href = `https://phantom.app/ul/v1/connect?${params}`;

      return new Promise(() => {});
    },
  };
}

function buildSession(stored: PhantomSession): WalletSession {
  const dappKeypair = getDappKeypair();
  const sharedSecret = getSharedSecret(
    bs58.decode(stored.phantomEncryptionPubkey),
    dappKeypair.secretKey
  );
  const pubkeyBytes = bs58.decode(stored.publicKey);

  return {
    account: {
      address: stored.publicKey as Address,
      publicKey: pubkeyBytes,
    },
    connector: {
      id: "phantom-mobile",
      name: "Phantom",
      icon: PHANTOM_ICON,
    },
    disconnect: async () => {
      const payload = encryptPayload(
        { session: stored.sharedSecret },
        sharedSecret
      );

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeypair.publicKey),
        nonce: payload.nonce,
        payload: payload.data,
        redirect_link: buildRedirectUrl("disconnect"),
      });

      localStorage.removeItem(STORAGE_KEYS.SESSION);
      window.location.href = `https://phantom.app/ul/v1/disconnect?${params}`;
    },
    signTransaction: async (transaction: Uint8Array) => {
      const payload = encryptPayload(
        {
          session: stored.sharedSecret,
          transaction: bs58.encode(transaction),
        },
        sharedSecret
      );

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeypair.publicKey),
        nonce: payload.nonce,
        payload: payload.data,
        redirect_link: buildRedirectUrl("signTransaction"),
      });

      window.location.href = `https://phantom.app/ul/v1/signTransaction?${params}`;

      return new Promise(() => {});
    },
    sendTransaction: async (transaction: Uint8Array) => {
      const payload = encryptPayload(
        {
          session: stored.sharedSecret,
          transaction: bs58.encode(transaction),
        },
        sharedSecret
      );

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeypair.publicKey),
        nonce: payload.nonce,
        payload: payload.data,
        redirect_link: buildRedirectUrl("signAndSendTransaction"),
      });

      window.location.href = `https://phantom.app/ul/v1/signAndSendTransaction?${params}`;

      return new Promise(() => {});
    },
  };
}

export function handlePhantomRedirect(): {
  action: string;
  session?: PhantomSession;
  signedTransaction?: Uint8Array;
  signature?: Uint8Array;
} | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const action = params.get("phantom_action");
  if (!action) return null;

  const errorMessage = params.get("errorMessage");
  if (errorMessage) {
    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
    throw new Error(`Phantom: ${errorMessage}`);
  }

  const dappKeypair = getDappKeypair();

  if (action === "connect") {
    const phantomPubkey = params.get("phantom_encryption_public_key");
    const nonce = params.get("nonce");
    const data = params.get("data");

    if (!phantomPubkey || !nonce || !data) return null;

    const sharedSecret = getSharedSecret(
      bs58.decode(phantomPubkey),
      dappKeypair.secretKey
    );

    const decrypted = decryptPayload(data, nonce, sharedSecret);

    const session: PhantomSession = {
      publicKey: decrypted.public_key,
      sharedSecret: decrypted.session,
      phantomEncryptionPubkey: phantomPubkey,
    };

    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    window.history.replaceState({}, "", window.location.pathname);

    return { action: "connect", session };
  }

  if (action === "signTransaction") {
    const stored = getStoredSession();
    if (!stored) return null;

    const nonce = params.get("nonce");
    const data = params.get("data");
    if (!nonce || !data) return null;

    const sharedSecret = getSharedSecret(
      bs58.decode(stored.phantomEncryptionPubkey),
      dappKeypair.secretKey
    );

    const decrypted = decryptPayload(data, nonce, sharedSecret);
    window.history.replaceState({}, "", window.location.pathname);

    return {
      action: "signTransaction",
      signedTransaction: bs58.decode(decrypted.transaction),
    };
  }

  if (action === "signAndSendTransaction") {
    const stored = getStoredSession();
    if (!stored) return null;

    const nonce = params.get("nonce");
    const data = params.get("data");
    if (!nonce || !data) return null;

    const sharedSecret = getSharedSecret(
      bs58.decode(stored.phantomEncryptionPubkey),
      dappKeypair.secretKey
    );

    const decrypted = decryptPayload(data, nonce, sharedSecret);
    window.history.replaceState({}, "", window.location.pathname);

    return {
      action: "signAndSendTransaction",
      signature: bs58.decode(decrypted.signature),
    };
  }

  if (action === "disconnect") {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.history.replaceState({}, "", window.location.pathname);
    return { action: "disconnect" };
  }

  return null;
}
