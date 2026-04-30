"use client";

import { type CSSProperties, type ReactNode, useState } from "react";

// ─── KCard ────────────────────────────────────────────────────────────────────

type KCardProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: number | string;
  glow?: boolean;
};

export function KCard({ children, style, className, padding = 16, glow = true }: KCardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--kad-card)",
        border: "1px solid var(--kad-lime-ghost)",
        borderRadius: 16,
        boxShadow: glow ? "0 0 8px var(--kad-lime-glow)" : "none",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── KButton ─────────────────────────────────────────────────────────────────

type KButtonVariant = "primary" | "secondary" | "ghost";
type KButtonSize = "sm" | "md" | "lg";

type KButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: KButtonVariant;
  size?: KButtonSize;
  style?: CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit";
};

const BTN_SIZES: Record<KButtonSize, CSSProperties> = {
  sm: { height: 42, padding: "0 18px", fontSize: 14 },
  md: { height: 54, padding: "0 22px", fontSize: 17 },
  lg: { height: 62, padding: "0 26px", fontSize: 18 },
};

const BTN_VARIANTS: Record<KButtonVariant, CSSProperties> = {
  primary: { background: "var(--kad-lime)", color: "#0D0D0D" },
  secondary: { background: "transparent", color: "var(--kad-lime)", border: "1px solid var(--kad-lime)" },
  ghost: { background: "var(--kad-lime-faint)", color: "var(--kad-lime)", border: "1px solid var(--kad-lime-ghost)" },
};

export function KButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  style,
  disabled = false,
  type = "button",
}: KButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        borderRadius: 50,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity .2s ease, transform .15s ease",
        opacity: disabled ? 0.5 : 1,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        ...BTN_SIZES[size],
        ...BTN_VARIANTS[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── KPill ────────────────────────────────────────────────────────────────────

type KPillProps = {
  children: ReactNode;
  icon?: ReactNode;
  pulse?: boolean;
  filled?: boolean;
  style?: CSSProperties;
};

export function KPill({ children, icon, pulse, filled, style }: KPillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        border: "1px solid var(--kad-lime)",
        borderRadius: 50,
        boxShadow: "0 0 6px var(--kad-lime-ghost)",
        color: filled ? "#0D0D0D" : "var(--kad-lime)",
        background: filled ? "var(--kad-lime)" : "transparent",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
        animation: pulse ? "kadPulse 1.6s ease-in-out infinite" : "none",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

// ─── KAvatar ──────────────────────────────────────────────────────────────────

type KAvatarProps = {
  initials: string;
  size?: number;
};

export function KAvatar({ initials, size = 44 }: KAvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--kad-card)",
        border: "1.5px solid var(--kad-lime-ghost)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "var(--kad-lime)",
        letterSpacing: "-0.02em",
      }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── KIcon ────────────────────────────────────────────────────────────────────

const PATHS: Record<string, string> = {
  flame:    "M12 2c1 3 3 4 3 7a3 3 0 11-6 0c0-1-.5-2-1-3 0 3-3 4-3 8a7 7 0 1014 0c0-5-4-7-7-12z",
  route:    "M5 6a3 3 0 013-3h3v2H8a1 1 0 100 2h8a3 3 0 110 6h-8a1 1 0 100 2h3v2H8a3 3 0 110-6h8a1 1 0 100-2H8a3 3 0 01-3-3z",
  timer:    "M12 5a7 7 0 107 7 7 7 0 00-7-7zm0 2v5l3 3M9 2h6",
  nav:      "M12 2L4 22l8-4 8 4-8-20z",
  chevron:  "M9 6l6 6-6 6",
  trophy:   "M6 4h12v3a5 5 0 01-5 5h-2a5 5 0 01-5-5V4zM4 4h2v3a3 3 0 003 3v2H9a2 2 0 00-2 2v2h10v-2a2 2 0 00-2-2h-1v-2a3 3 0 003-3V4h2M8 20h8",
  users:    "M9 11a4 4 0 100-8 4 4 0 000 8zm-7 10a7 7 0 0114 0m3-5a4 4 0 000-8m4 13a7 7 0 00-4-6",
  target:   "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z",
  play:     "M6 4l14 8-14 8V4z",
  pause:    "M6 5h4v14H6zM14 5h4v14h-4z",
  medal:    "M12 14a6 6 0 100-12 6 6 0 000 12zM8 12l-3 9 7-4 7 4-3-9",
  crown:    "M3 7l4 4 5-6 5 6 4-4v10H3V7z",
  bolt:     "M11 3v8H6l7 10v-8h5l-7-10z",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  check:    "M4 12l5 5L20 6",
  sparkle:  "M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z",
  lock:     "M6 10V7a6 6 0 0112 0v3M5 10h14v10H5z",
  share:    "M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 001 1h12a1 1 0 001-1v-5",
  shield:   "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z",
  star:     "M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z",
  wallet:   "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4z",
  zap:      "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  download: "M12 4v12M7 13l5 5 5-5M5 20h14",
};

type KIconProps = {
  name: keyof typeof PATHS;
  size?: number;
  color?: string;
  fill?: string;
  stroke?: number;
  style?: CSSProperties;
};

export function KIcon({
  name,
  size = 20,
  color = "currentColor",
  fill = "none",
  stroke = 2,
  style,
}: KIconProps) {
  const d = PATHS[name] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      <path d={d} />
    </svg>
  );
}
