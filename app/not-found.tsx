import Link from "next/link";

export default function NotFound() {
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
          fontSize: 96,
          fontWeight: 700,
          color: "#E0F479",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        404
      </div>
      <p
        style={{
          fontSize: 16,
          color: "rgba(255,255,255,0.6)",
          marginBottom: 32,
        }}
      >
        This page doesn&#39;t exist.
      </p>
      <Link
        href="/"
        style={{
          height: 52,
          display: "inline-flex",
          alignItems: "center",
          paddingInline: 32,
          borderRadius: 50,
          background: "#E0F479",
          color: "#0D0D0D",
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
          fontFamily: "inherit",
        }}
      >
        Back to Kadence
      </Link>
    </div>
  );
}
