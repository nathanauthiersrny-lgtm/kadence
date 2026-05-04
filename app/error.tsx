"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0D0D0D",
        color: "#ffffff",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: "#E0F479",
          marginBottom: 12,
        }}
      >
        Oops
      </div>
      <p
        style={{
          fontSize: 16,
          color: "rgba(255,255,255,0.6)",
          maxWidth: 320,
          marginBottom: 32,
        }}
      >
        Something went wrong. This is on us, not you.
      </p>
      <button
        onClick={reset}
        style={{
          height: 52,
          paddingInline: 32,
          borderRadius: 50,
          border: "none",
          background: "#E0F479",
          color: "#0D0D0D",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Try again
      </button>
    </div>
  );
}
