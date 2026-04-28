"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";
import type { TransactionSigner } from "@solana/kit";
import type { WalletConnector, WalletSession } from "./types";
import { discoverWallets, watchWallets } from "./standard";
import { createWalletSigner } from "./signer";
import { useCluster } from "../../components/cluster-context";
import {
  shouldUseMobileConnector,
  createPhantomMobileConnector,
  handlePhantomRedirect,
} from "./phantom-mobile";

const WALLET_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

type WalletStatus = (typeof WALLET_STATUS)[keyof typeof WALLET_STATUS];

type WalletContextValue = {
  connectors: WalletConnector[];
  status: WalletStatus;
  wallet: WalletSession | undefined;
  signer: TransactionSigner | undefined;
  error: unknown;
  connect: (connectorId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  isReady: boolean;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "solana:last-connector";

export function WalletProvider({ children }: PropsWithChildren) {
  const { cluster } = useCluster();
  const chain = `solana:${cluster}`;

  const [connectors, setConnectors] = useState<WalletConnector[]>([]);
  const [session, setSession] = useState<WalletSession | undefined>();
  const [status, setStatus] = useState<WalletStatus>(
    WALLET_STATUS.DISCONNECTED
  );
  const [error, setError] = useState<unknown>();
  const isReady = typeof window !== "undefined";

  const connectorsRef = useRef<WalletConnector[]>([]);
  const autoConnectAttempted = useRef(false);
  const phantomRedirectHandled = useRef(false);

  // Discover wallets on mount (client-side only)
  useEffect(() => {
    const standard = discoverWallets();
    let initial = standard;
    if (shouldUseMobileConnector() && !standard.length) {
      initial = [createPhantomMobileConnector(), ...standard];
    }
    connectorsRef.current = initial;
    setConnectors(initial);
  }, []);

  const handleWalletsChanged = useCallback((updated: WalletConnector[]) => {
    let merged = updated;
    if (shouldUseMobileConnector() && !updated.length) {
      merged = [createPhantomMobileConnector(), ...updated];
    }
    connectorsRef.current = merged;
    setConnectors(merged);
  }, []);

  const runAutoConnect = useCallback(async (connector: WalletConnector) => {
    setStatus(WALLET_STATUS.CONNECTING);
    try {
      const s = await connector.connect({ silent: true });
      setSession(s);
      setStatus(WALLET_STATUS.CONNECTED);
    } catch {
      setStatus(WALLET_STATUS.DISCONNECTED);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Handle Phantom mobile deep link redirect
  useEffect(() => {
    if (phantomRedirectHandled.current) return;
    phantomRedirectHandled.current = true;

    try {
      const result = handlePhantomRedirect();
      if (!result) return;

      if (result.action === "connect" && result.session) {
        const connector = createPhantomMobileConnector();
        connector.connect({ silent: true }).then((s) => {
          setSession(s);
          setStatus(WALLET_STATUS.CONNECTED);
          localStorage.setItem(STORAGE_KEY, "phantom-mobile");
        });
      } else if (result.action === "disconnect") {
        setSession(undefined);
        setStatus(WALLET_STATUS.DISCONNECTED);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      setError(err);
      setStatus(WALLET_STATUS.ERROR);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = watchWallets(handleWalletsChanged);

    const lastId = localStorage.getItem(STORAGE_KEY);
    if (lastId && !autoConnectAttempted.current) {
      autoConnectAttempted.current = true;
      let connector = connectorsRef.current.find((c) => c.id === lastId);
      if (!connector && lastId === "phantom-mobile" && shouldUseMobileConnector()) {
        connector = createPhantomMobileConnector();
      }
      if (connector) {
        void runAutoConnect(connector);
      }
    }

    return unsubscribe;
  }, [handleWalletsChanged, runAutoConnect]);

  const connect = useCallback(async (connectorId: string) => {
    const connector = connectorsRef.current.find((c) => c.id === connectorId);
    if (!connector) throw new Error(`Unknown connector: ${connectorId}`);

    setStatus(WALLET_STATUS.CONNECTING);
    setError(undefined);

    try {
      const s = await connector.connect();
      setSession(s);
      setStatus(WALLET_STATUS.CONNECTED);
      localStorage.setItem(STORAGE_KEY, connectorId);
    } catch (err) {
      setError(err);
      setStatus(WALLET_STATUS.ERROR);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (session) {
      try {
        await session.disconnect();
      } catch {
        /* ignore disconnect errors */
      }
    }
    setSession(undefined);
    setStatus(WALLET_STATUS.DISCONNECTED);
    setError(undefined);
    localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const signer = useMemo(
    () => (session ? createWalletSigner(session, chain) : undefined),
    [session, chain]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      connectors,
      status,
      wallet: session,
      signer,
      error,
      connect,
      disconnect,
      isReady,
    }),
    [connectors, status, session, signer, error, connect, disconnect, isReady]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
