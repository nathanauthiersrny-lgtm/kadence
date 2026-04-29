"use client";

import { useRef, useState } from "react";
import {
  type FlashRun,
  type FlashRunStatus,
  type CreateEventInput,
  generateCompetitors,
  getEventStatus,
  formatCountdown,
  formatFinishTime,
  positionSuffix,
  useFlashRun,
} from "../lib/hooks/use-flash-run";
import { useTick } from "../lib/hooks/use-tick";
import { KCard, KButton, KPill, KIcon } from "./ui/primitives";

// ─── Countdown (shared tick) ─────────────────────────────────────────────────

function useCountdown(target: number): string {
  const now = useTick();
  return formatCountdown(target - now);
}

// ─── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: FlashRunStatus }) {
  if (status === "live") {
    return (
      <KPill pulse icon={<span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E0F479", display: "inline-block" }} />}>
        LIVE
      </KPill>
    );
  }
  if (status === "upcoming") {
    return (
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50 }}>
        Upcoming
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 50 }}>
      Finished
    </span>
  );
}

// ─── Event card (browse list) ────────────────────────────────────────────────

function EventCard({ event, hasResult, onSelect }: {
  event: FlashRun;
  hasResult: boolean;
  onSelect: () => void;
}) {
  const status = getEventStatus(event);
  const countdown = useCountdown(status === "upcoming" ? event.windowStart : event.windowEnd);
  const distKm = (event.distanceM / 1000).toFixed(1);
  const isLive = status === "live";
  const isPast = status === "past";
  const isBoost = event.type === "boost";

  return (
    <button onClick={onSelect} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
      <div style={{
        padding: isLive ? 18 : 16,
        borderRadius: isLive ? 22 : 18,
        position: "relative",
        overflow: "hidden",
        background: isLive
          ? isBoost
            ? "linear-gradient(135deg, rgba(224,244,121,0.08) 0%, rgba(224,244,121,0.03) 100%)"
            : "linear-gradient(135deg, rgba(224,244,121,0.14) 0%, rgba(63,185,119,0.06) 100%)"
          : isPast ? "rgba(26,26,26,0.5)" : "#1A1A1A",
        border: isLive
          ? isBoost
            ? "1px solid rgba(224,244,121,0.2)"
            : "1px solid rgba(224,244,121,0.35)"
          : isPast ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.06)",
        opacity: isPast ? 0.6 : 1,
      }}>
        {isLive && !isBoost && (
          <svg viewBox="0 0 300 160" style={{ position: "absolute", right: -40, top: -20, width: 220, opacity: 0.2 }}>
            <circle cx="150" cy="80" r="78" fill="none" stroke="#E0F479" strokeWidth="1" />
            <circle cx="150" cy="80" r="58" fill="none" stroke="#E0F479" strokeWidth="1" />
            <circle cx="150" cy="80" r="38" fill="none" stroke="#E0F479" strokeWidth="1" />
          </svg>
        )}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <StatusPill status={status} />
            <div style={{ textAlign: "right" }}>
              {status !== "past" && (
                isBoost ? (
                  <div style={{ fontSize: isLive ? 22 : 17, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.02em" }}>
                    {event.boostMultiplier}× <span style={{ fontSize: 9, color: "rgba(224,244,121,0.55)" }}>KAD</span>
                  </div>
                ) : (
                  <div style={{ fontSize: isLive ? 22 : 17, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.02em" }}>
                    {event.prizePoolKad.toLocaleString()} <span style={{ fontSize: 9, color: "rgba(224,244,121,0.55)" }}>KAD</span>
                  </div>
                )
              )}
              {status === "past" && hasResult && (
                <span style={{ fontSize: 11, color: "#3FB977", fontWeight: 700, letterSpacing: "0.06em" }}>Result logged</span>
              )}
              {status === "past" && isBoost && !hasResult && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.06em" }}>{event.boostMultiplier}× boost</span>
              )}
            </div>
          </div>
          <div style={{ fontSize: isLive ? 30 : 19, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1, marginTop: isLive ? 16 : 10 }}>
            {event.name}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{event.subtitle}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: isLive ? 16 : 12, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {isBoost ? (
              event.distanceM > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  <KIcon name="route" size={13} color="#E0F479" /> min {distKm} km
                </span>
              )
            ) : (
              <>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  <KIcon name="route" size={13} color="#E0F479" /> {distKm} km
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                  <KIcon name="users" size={13} color="#E0F479" /> {event.participantCount}
                </span>
              </>
            )}
            <span style={{ marginLeft: "auto", color: isPast ? "rgba(255,255,255,0.3)" : "#E0F479", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              {status === "live" && `Closes ${countdown} →`}
              {status === "upcoming" && `Starts ${countdown} →`}
              {status === "past" && "Ended"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Create event sheet ──────────────────────────────────────────────────────

const DISTANCE_OPTIONS = [
  { label: "1K",  value: 1_000 },
  { label: "3K",  value: 3_000 },
  { label: "5K",  value: 5_000 },
  { label: "10K", value: 10_000 },
  { label: "21K", value: 21_097 },
];

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 * 60_000 },
  { label: "30 min", value: 30 * 60_000 },
  { label: "1 h",    value: 60 * 60_000 },
  { label: "2 h",    value: 2 * 60 * 60_000 },
];

function OptionPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 50,
        border: `1px solid ${selected ? "#E0F479" : "rgba(255,255,255,0.15)"}`,
        background: selected ? "#E0F479" : "transparent",
        color: selected ? "#0D0D0D" : "rgba(255,255,255,0.6)",
        fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)", cursor: "pointer", letterSpacing: "0.03em", flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function CreateEventSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (event: FlashRun) => void }) {
  const { createEvent } = useFlashRun();
  const [name, setName] = useState("");
  const [distanceM, setDistanceM] = useState(5_000);
  const [durationMs, setDurationMs] = useState(30 * 60_000);
  const [prizePoolKad, setPrizePoolKad] = useState(500);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const input: CreateEventInput = { name: trimmed, distanceM, durationMs, prizePoolKad };
    const event = createEvent(input);
    onCreate(event);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1A", borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(224,244,121,0.2)", borderBottom: "none",
          padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 20,
          fontFamily: "var(--font-sans)", color: "#fff",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 4 }} />
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "#E0F479", fontWeight: 700, marginBottom: 4 }}>Create event</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>New Race</div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 8, fontWeight: 600 }}>Event name</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paris Sprint 5K" autoFocus
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 16px", fontSize: 16, fontWeight: 600, color: "#fff", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 10, fontWeight: 600 }}>Distance</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DISTANCE_OPTIONS.map((o) => <OptionPill key={o.value} label={o.label} selected={distanceM === o.value} onClick={() => setDistanceM(o.value)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 10, fontWeight: 600 }}>Open for</div>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATION_OPTIONS.map((o) => <OptionPill key={o.value} label={o.label} selected={durationMs === o.value} onClick={() => setDurationMs(o.value)} />)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 8, fontWeight: 600 }}>Prize pool (KAD)</div>
          <input
            type="number" value={prizePoolKad} onChange={(e) => setPrizePoolKad(Math.max(0, Number(e.target.value)))}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px 16px", fontSize: 16, fontWeight: 600, color: "#E0F479", fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <KButton size="lg" style={{ width: "100%", marginTop: 4 }} disabled={!name.trim()} onClick={handleCreate}>
          <KIcon name="zap" size={18} color="#0D0D0D" fill="#0D0D0D" /> Launch event
        </KButton>
      </div>
    </div>
  );
}

// ─── Browse view ─────────────────────────────────────────────────────────────

type FilterTab = "all" | FlashRunStatus;

function BrowseView({ onBack, onSelect }: { onBack: () => void; onSelect: (event: FlashRun) => void }) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showCreate, setShowCreate] = useState(false);
  const { events, results } = useFlashRun();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useTick(); // drive re-renders so event statuses auto-transition

  const handlePressStart = () => { pressTimer.current = setTimeout(() => setShowCreate(true), 1500); };
  const handlePressEnd = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const filtered = filter === "all" ? events : events.filter((e) => getEventStatus(e) === filter);
  const liveCount = events.filter((e) => getEventStatus(e) === "live").length;

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "live", label: "Live", count: liveCount > 0 ? liveCount : undefined },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* Editorial header */}
      <div style={{ position: "relative", padding: "20px 20px 18px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 10%, rgba(224,244,121,0.18) 0%, transparent 55%)" }} />
        <div style={{ position: "relative", marginBottom: 14 }}>
          <button
            onClick={onBack}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <KIcon name="chevron" size={16} color="#fff" style={{ transform: "rotate(180deg)" }} />
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#E0F479", fontWeight: 700, marginBottom: 6 }}>Schedule · this week</div>
          <h1
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
            style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.92, margin: 0, userSelect: "none" }}
          >
            Flash<br /><span style={{ color: "#E0F479" }}>Runs.</span>
          </h1>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 10, maxWidth: 300, lineHeight: 1.4 }}>
            Boosts multiply your KAD. Races have prize pools — compete for the podium.
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateEventSheet onClose={() => setShowCreate(false)} onCreate={(event) => { setShowCreate(false); onSelect(event); }} />
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "4px 16px 16px", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 50,
              background: filter === t.key ? "#E0F479" : "transparent",
              color: filter === t.key ? "#0D0D0D" : "rgba(255,255,255,0.7)",
              border: filter === t.key ? "none" : "1px solid rgba(255,255,255,0.12)",
              fontSize: 12, fontWeight: 700, fontFamily: "var(--font-sans)", cursor: "pointer",
              letterSpacing: "0.08em", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span style={{
                background: filter === t.key ? "#0D0D0D" : "#E0F479",
                color: filter === t.key ? "#E0F479" : "#0D0D0D",
                borderRadius: 50, padding: "1px 6px", fontSize: 10,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Event cards */}
      <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} hasResult={!!results[event.id]} onSelect={() => onSelect(event)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No events here yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────

function LeaderRow({ position, name, time, isYou = false }: {
  position: number; name: string; time: string; isYou?: boolean;
}) {
  const medalColor = position === 1 ? "#E0F479" : position === 2 ? "rgba(255,255,255,0.6)" : "rgba(224,244,121,0.5)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      background: isYou ? "rgba(224,244,121,0.08)" : "transparent",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
        {position <= 3
          ? <KIcon name="medal" size={16} color={medalColor} />
          : <span style={{ fontSize: 12, color: isYou ? "#E0F479" : "rgba(255,255,255,0.4)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{position}</span>
        }
      </div>
      <span style={{ fontSize: 13, fontWeight: isYou ? 700 : 500, color: isYou ? "#E0F479" : "#fff", flex: 1 }}>{name}</span>
      <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: isYou ? "#E0F479" : "rgba(255,255,255,0.55)", fontWeight: isYou ? 700 : 500 }}>{time}</span>
    </div>
  );
}

// ─── Prize pool breakdown ────────────────────────────────────────────────────

function PrizeBreakdown({ pool }: { pool: number }) {
  const tiers = [
    { label: "1st place", pct: 0.5 },
    { label: "2nd place", pct: 0.3 },
    { label: "3rd place", pct: 0.2 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {tiers.map((t, i) => (
        <div key={t.label} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 0", borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KIcon name="medal" size={16} color={["#E0F479", "rgba(255,255,255,0.6)", "rgba(224,244,121,0.5)"][i]} />
            <span style={{ fontSize: 13 }}>{t.label}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E0F479", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {Math.round(pool * t.pct)} <span style={{ fontSize: 9, color: "rgba(224,244,121,0.6)" }}>KAD</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Time window formatter ───────────────────────────────────────────────────

function formatWindow(event: FlashRun): string {
  const s = new Date(event.windowStart);
  const e = new Date(event.windowEnd);
  if (s.getHours() === 0 && e.getHours() === 23 && e.getMinutes() === 59) return "All day";
  const fmt = (d: Date) => {
    const h = d.getHours();
    const period = h >= 12 ? "pm" : "am";
    const hour = h % 12 || 12;
    return `${hour}${period}`;
  };
  return `${fmt(s)}–${fmt(e)}`;
}

// ─── Detail view ─────────────────────────────────────────────────────────────

function DetailView({ event, onBack, onStartRace }: { event: FlashRun; onBack: () => void; onStartRace: (e: FlashRun) => void }) {
  const { joinedIds, results, joinEvent, resetResult, deleteEvent } = useFlashRun();
  const isCustom = event.participantCount === 0 && event.type === "race";
  const status = getEventStatus(event);
  const isJoined = joinedIds.includes(event.id);
  const myResult = results[event.id];
  const competitors = generateCompetitors(event);
  const distKm = (event.distanceM / 1000).toFixed(1);
  const isBoost = event.type === "boost";

  const countdownTarget = status === "upcoming" ? event.windowStart : event.windowEnd;
  const countdown = useCountdown(countdownTarget);

  return (
    <div style={{ display: "flex", flexDirection: "column", color: "#fff", fontFamily: "var(--font-sans)", background: "#0D0D0D", minHeight: "100%" }}>

      {/* Editorial hero */}
      <div style={{ position: "relative", height: 260, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: isBoost ? `
          radial-gradient(ellipse at 60% 40%, rgba(224,244,121,0.2) 0%, transparent 55%),
          linear-gradient(180deg, #1a2218 0%, #0D1510 70%, #0D0D0D 100%)
        ` : `
          radial-gradient(ellipse at 60% 40%, rgba(224,244,121,0.3) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(63,185,119,0.2) 0%, transparent 50%),
          linear-gradient(180deg, #1a2418 0%, #0D1510 70%, #0D0D0D 100%)
        ` }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 60% 40%, rgba(224,244,121,0.15) 0%, transparent 40%)",
          animation: "kadHeroBreath 4s ease-in-out infinite",
        }} />
        <svg viewBox="0 0 414 260" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <g stroke="rgba(224,244,121,0.1)" strokeWidth="1" fill="none">
            {[60, 110, 160, 210].map((r, i) => <circle key={i} cx="207" cy="220" r={r} />)}
          </g>
        </svg>

        <div style={{ position: "absolute", top: 18, left: 18, right: 18, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(13,13,13,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <KIcon name="chevron" size={16} color="#fff" style={{ transform: "rotate(180deg)" }} />
          </button>
          <div style={{ fontSize: 10, color: "rgba(224,244,121,0.7)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>
            {event.subtitle}
          </div>
          {isBoost && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#E0F479", background: "rgba(224,244,121,0.12)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 50, padding: "2px 8px" }}>
              Boost
            </span>
          )}
        </div>

        <div style={{ position: "absolute", left: 22, right: 22, bottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {status === "live" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 50, background: "#E0F479", color: "#0D0D0D", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0D0D0D", animation: "kadPulse 1.2s infinite" }} />
                  Live now
                </span>
              )}
              {status === "upcoming" && (
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50 }}>
                  Upcoming
                </span>
              )}
              {status === "past" && (
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#3FB977" }}>
                  Finished
                </span>
              )}
            </div>
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.9 }}>
              {event.name.split(" ").length > 2 ? event.name : <>{event.name.replace(/\s+(\S+)$/, " ")}<span style={{ color: "#E0F479" }}>{event.name.split(" ").pop()}.</span></>}
            </div>
          </div>
          {(status === "live" || status === "upcoming") && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700 }}>
                {status === "live" ? "Closes in" : "Starts in"}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                {countdown}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bento */}
      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Stats trio — different for boost vs race */}
        {isBoost ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { icon: "zap" as const, label: "Multiplier", value: `${event.boostMultiplier}×`, accent: true },
              { icon: "route" as const, label: "Min distance", value: event.distanceM > 0 ? `${distKm} km` : "Any" },
              { icon: "timer" as const, label: "Window", value: formatWindow(event) },
            ].map((s, i) => (
              <div key={i} style={{
                borderRadius: 14, padding: 12,
                background: s.accent ? "#E0F479" : "#1A1A1A",
                color: s.accent ? "#0D0D0D" : "#fff",
                border: s.accent ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <KIcon name={s.icon} size={16} color={s.accent ? "#0D0D0D" : "#E0F479"} />
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, opacity: s.accent ? 0.65 : 0.5, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { icon: "route" as const, label: "Distance", value: `${distKm} km` },
              { icon: "trophy" as const, label: "Prize pool", value: `${event.prizePoolKad.toLocaleString()} KAD`, accent: true },
              { icon: "users" as const, label: "Runners", value: String(event.participantCount + (isJoined ? 1 : 0)) },
            ].map((s, i) => (
              <div key={i} style={{
                borderRadius: 14, padding: 12,
                background: s.accent ? "#E0F479" : "#1A1A1A",
                color: s.accent ? "#0D0D0D" : "#fff",
                border: s.accent ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <KIcon name={s.icon} size={16} color={s.accent ? "#0D0D0D" : "#E0F479"} />
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700, opacity: s.accent ? 0.65 : 0.5, marginTop: 8 }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Boost info card */}
        {isBoost && (
          <div style={{ padding: 20, background: "rgba(224,244,121,0.06)", border: "1px solid rgba(224,244,121,0.15)", borderRadius: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              {event.boostMultiplier}× KAD boost
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              Run during this window to earn {event.boostMultiplier}× KAD on your base reward.
              {event.distanceM > 0 && ` Minimum ${(event.distanceM / 1000).toFixed(0)} km to qualify.`}
              {event.distanceM === 0 && " Any distance counts."}
            </div>
          </div>
        )}

        {/* Prize breakdown — race only */}
        {!isBoost && (
          <KCard padding={16}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 10 }}>Prize distribution</div>
            <PrizeBreakdown pool={event.prizePoolKad} />
          </KCard>
        )}

        {/* Your result (if past) — race only */}
        {!isBoost && status === "past" && myResult && (
          <KCard padding={16} style={{ background: "rgba(63,185,119,0.1)", border: "1px solid rgba(63,185,119,0.3)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#3FB977", marginBottom: 8, fontWeight: 700 }}>Your result</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "#E0F479" }}>{positionSuffix(myResult.position)}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>of {myResult.totalParticipants} runners</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Time: {formatFinishTime(myResult.durationSec)}</div>
          </KCard>
        )}

        {/* Leaderboard — race only */}
        {!isBoost && (
          status === "upcoming" ? (
            <KCard padding={20}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", marginBottom: 10, fontWeight: 600 }}>Registered runners</div>
                <div style={{ fontSize: 52, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {event.participantCount + (isJoined ? 1 : 0)}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                  {isJoined ? "including you" : "runners so far"}
                </div>
              </div>
            </KCard>
          ) : (isCustom || competitors.length === 0) && !myResult ? (
            <div style={{
              background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: "28px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                No results yet
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                Join and complete the run to appear here
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 10, padding: "0 4px" }}>
                {status === "past" ? "Final standings" : "Current leaders"}
              </div>
              <div style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
                {competitors.slice(0, 5).map((c) => (
                  <LeaderRow key={c.name} position={c.position} name={c.name} time={formatFinishTime(c.finishTimeSec)} />
                ))}
                {myResult && <LeaderRow position={myResult.position} name="You" time={formatFinishTime(myResult.durationSec)} isYou />}
                {isJoined && !myResult && competitors.length > 0 && <LeaderRow position={competitors.length + 1} name="You" time="—" isYou />}
              </div>
            </div>
          )
        )}

        {/* Action buttons — race only */}
        {!isBoost && status === "live" && !isJoined && (
          <KButton size="lg" style={{ width: "100%" }} onClick={() => joinEvent(event.id)}>
            <KIcon name="zap" size={18} color="#0D0D0D" fill="#0D0D0D" /> Join race
          </KButton>
        )}
        {!isBoost && status === "live" && isJoined && !myResult && (
          <KButton size="lg" style={{ width: "100%" }} onClick={() => onStartRace(event)}>
            <KIcon name="play" size={16} color="#0D0D0D" fill="#0D0D0D" /> Start race
          </KButton>
        )}
        {!isBoost && status === "upcoming" && !isJoined && (
          <KButton size="lg" variant="secondary" style={{ width: "100%" }} onClick={() => joinEvent(event.id)}>
            <KIcon name="check" size={16} color="#E0F479" /> Register
          </KButton>
        )}
        {!isBoost && status === "upcoming" && isJoined && (
          <div style={{ textAlign: "center", padding: 14, background: "rgba(224,244,121,0.08)", border: "1px solid rgba(224,244,121,0.2)", borderRadius: 14, fontSize: 13, color: "rgba(224,244,121,0.7)", fontWeight: 600 }}>
            Registered — check back when it goes live
          </div>
        )}
        {!isBoost && status === "live" && myResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ textAlign: "center", padding: 14, background: "rgba(63,185,119,0.1)", border: "1px solid rgba(63,185,119,0.3)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <KIcon name="check" size={16} color="#3FB977" />
              <span style={{ fontSize: 13, color: "#3FB977", fontWeight: 700 }}>Run submitted · {positionSuffix(myResult.position)} place</span>
            </div>
            <button onClick={() => resetResult(event.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer", textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "inherit", fontWeight: 600 }}>
              Run again
            </button>
          </div>
        )}

        {/* Boost — live status */}
        {isBoost && status === "live" && (
          <div style={{ textAlign: "center", padding: 14, background: "rgba(224,244,121,0.08)", border: "1px solid rgba(224,244,121,0.2)", borderRadius: 14, fontSize: 13, color: "rgba(224,244,121,0.7)", fontWeight: 600 }}>
            Boost active — start a run from home to earn {event.boostMultiplier}× KAD
          </div>
        )}
        {isBoost && status === "upcoming" && (
          <div style={{ textAlign: "center", padding: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
            Boost starts in {countdown}
          </div>
        )}

        {isCustom && (
          <button onClick={() => { deleteEvent(event.id); onBack(); }} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", fontSize: 12, cursor: "pointer", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-sans)", marginTop: 8 }}>
            Delete event
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Flash run screen (entry point) ─────────────────────────────────────────

type Props = { onBack: () => void; onStartRace: (event: FlashRun) => void };

export function FlashRunScreen({ onBack, onStartRace }: Props) {
  const [selectedEvent, setSelectedEvent] = useState<FlashRun | null>(null);

  if (selectedEvent) {
    return (
      <DetailView
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onStartRace={(e) => { setSelectedEvent(null); onStartRace(e); }}
      />
    );
  }
  return <BrowseView onBack={onBack} onSelect={(e) => setSelectedEvent(e)} />;
}

// ─── Post-race podium (used in PostRunScreen) ────────────────────────────────

export function RacePodium({ eventId, position, totalParticipants, durationSec }: {
  eventId: string; position: number; totalParticipants: number; durationSec: number;
}) {
  const { events } = useFlashRun();
  const event = events.find((e) => e.id === eventId);
  const isCustom = event?.participantCount === 0;
  const competitors = event && !isCustom ? generateCompetitors(event) : [];

  type Row = { position: number; name: string; time: string; isYou: boolean };
  const playerRow: Row = { position, name: "You", time: formatFinishTime(durationSec), isYou: true };

  let rows: Row[];
  if (isCustom) {
    rows = [playerRow];
  } else {
    rows = competitors.slice(0, 5).map((c) => ({ position: c.position, name: c.name, time: formatFinishTime(c.finishTimeSec), isYou: false }));
    if (position <= 5) { rows.splice(position - 1, 0, playerRow); rows.splice(6); }
    else rows.push(playerRow);
  }

  const posLabel = position <= 3 ? ["🥇 1st", "🥈 2nd", "🥉 3rd"][position - 1] : positionSuffix(position);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        textAlign: "center", padding: "24px 0 20px", borderRadius: 20,
        background: position <= 3
          ? "radial-gradient(ellipse at center, rgba(224,244,121,0.15) 0%, rgba(224,244,121,0) 60%)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${position <= 3 ? "rgba(224,244,121,0.25)" : "rgba(255,255,255,0.1)"}`,
      }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)" }}>
          Race result · {event?.name}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 8 }}>{posLabel}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>{totalParticipants} runners · {formatFinishTime(durationSec)}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em" }}>Position may change as others finish</div>
      </div>
      <div style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
        {rows.map((r, i) => <LeaderRow key={i} position={r.position} name={r.name} time={r.time} isYou={r.isYou} />)}
      </div>
    </div>
  );
}
