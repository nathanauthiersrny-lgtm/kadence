"use client";

import { useEffect, useRef, useState } from "react";
import {
  type FlashRun,
  type FlashRunStatus,
  type CreateEventInput,
  generateCompetitors,
  getEventStatus,
  getFlashRunEvents,
  formatCountdown,
  formatFinishTime,
  positionSuffix,
  useFlashRun,
} from "../lib/hooks/use-flash-run";
import { KCard, KButton, KPill, KIcon } from "./ui/primitives";

// ─── Countdown ticker ─────────────────────────────────────────────────────────

function useCountdown(target: number): string {
  const [label, setLabel] = useState(() => formatCountdown(target - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLabel(formatCountdown(target - Date.now())), 1000);
    return () => clearInterval(t);
  }, [target]);
  return label;
}

// ─── Status pill ──────────────────────────────────────────────────────────────

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

// ─── Event card (browse list) ─────────────────────────────────────────────────

function EventCard({ event, hasResult, onSelect }: {
  event: FlashRun;
  hasResult: boolean;
  onSelect: () => void;
}) {
  const status = getEventStatus(event);
  const countdown = useCountdown(status === "upcoming" ? event.windowStart : event.windowEnd);
  const distKm = (event.distanceM / 1000).toFixed(1);

  return (
    <button
      onClick={onSelect}
      style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
    >
      <KCard padding={0} style={{ overflow: "hidden" }} glow={status === "live"}>
        {/* Top bar */}
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <StatusPill status={status} />
          {status !== "past" && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E0F479" }}>
              {event.prizePoolKad.toLocaleString()} KAD
            </span>
          )}
          {status === "past" && hasResult && (
            <span style={{ fontSize: 11, color: "#3FB977", fontWeight: 700, letterSpacing: "0.06em" }}>Result logged</span>
          )}
        </div>

        {/* Name + subtitle */}
        <div style={{ padding: "10px 16px 0" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{event.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{event.subtitle}</div>
        </div>

        {/* Footer row */}
        <div style={{ padding: "10px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <KIcon name="route" size={13} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{distKm} km</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <KIcon name="users" size={13} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{event.participantCount}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {status === "live" && (
              <span style={{ fontSize: 11, color: "rgba(224,244,121,0.65)" }}>closes in {countdown}</span>
            )}
            {status === "upcoming" && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>starts in {countdown}</span>
            )}
            {status === "past" && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>ended</span>
            )}
            <KIcon name="chevron" size={13} color="rgba(255,255,255,0.3)" />
          </div>
        </div>
      </KCard>
    </button>
  );
}

// ─── Create event sheet ───────────────────────────────────────────────────────

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

function OptionPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 50,
        border: `1px solid ${selected ? "var(--kad-lime)" : "rgba(255,255,255,0.15)"}`,
        background: selected ? "var(--kad-lime)" : "transparent",
        color: selected ? "#0D0D0D" : "rgba(255,255,255,0.6)",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        letterSpacing: "0.03em",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function CreateEventSheet({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (event: FlashRun) => void;
}) {
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(224,244,121,0.2)",
          borderBottom: "none",
          padding: "24px 20px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          fontFamily: "var(--font-sans)",
          color: "#fff",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 4 }} />

        {/* Header */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--kad-lime)", fontWeight: 700, marginBottom: 4 }}>
            Create event
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>New Flash Run</div>
        </div>

        {/* Name */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 8, fontWeight: 600 }}>
            Event name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paris Sprint 5K"
            autoFocus
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 600,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Distance */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 10, fontWeight: 600 }}>
            Distance
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DISTANCE_OPTIONS.map((o) => (
              <OptionPill
                key={o.value}
                label={o.label}
                selected={distanceM === o.value}
                onClick={() => setDistanceM(o.value)}
              />
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 10, fontWeight: 600 }}>
            Open for
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATION_OPTIONS.map((o) => (
              <OptionPill
                key={o.value}
                label={o.label}
                selected={durationMs === o.value}
                onClick={() => setDurationMs(o.value)}
              />
            ))}
          </div>
        </div>

        {/* Prize pool */}
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)", marginBottom: 8, fontWeight: 600 }}>
            Prize pool (KAD)
          </div>
          <input
            type="number"
            value={prizePoolKad}
            onChange={(e) => setPrizePoolKad(Math.max(0, Number(e.target.value)))}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 600,
              color: "#E0F479",
              fontFamily: "var(--font-sans)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Create button */}
        <KButton
          size="lg"
          style={{ width: "100%", marginTop: 4 }}
          disabled={!name.trim()}
          onClick={handleCreate}
        >
          <KIcon name="zap" size={18} color="#0D0D0D" fill="#0D0D0D" />
          Launch event
        </KButton>
      </div>
    </div>
  );
}

// ─── Browse view ──────────────────────────────────────────────────────────────

type FilterTab = "all" | FlashRunStatus;

function BrowseView({ onBack, onSelect }: {
  onBack: () => void;
  onSelect: (event: FlashRun) => void;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showCreate, setShowCreate] = useState(false);
  const { events, results } = useFlashRun();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = () => {
    pressTimer.current = setTimeout(() => setShowCreate(true), 1500);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const filtered = filter === "all" ? events : events.filter((e) => getEventStatus(e) === filter);
  const liveCount = events.filter((e) => getEventStatus(e) === "live").length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "live", label: `Live${liveCount > 0 ? ` · ${liveCount}` : ""}` },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}
        >
          <KIcon name="arrow" size={16} color="rgba(255,255,255,0.5)" style={{ transform: "rotate(180deg)" }} />
        </button>
        <div>
          <h1
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", userSelect: "none", cursor: "default" }}
          >
            Flash Runs
          </h1>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Run anywhere. Compete everywhere.</div>
        </div>
      </div>

      {showCreate && (
        <CreateEventSheet
          onClose={() => setShowCreate(false)}
          onCreate={(event) => { setShowCreate(false); onSelect(event); }}
        />
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              flexShrink: 0,
              background: filter === t.key ? "var(--kad-lime)" : "transparent",
              color: filter === t.key ? "#0D0D0D" : "rgba(255,255,255,0.5)",
              border: `1px solid ${filter === t.key ? "var(--kad-lime)" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 50,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            hasResult={!!results[event.id]}
            onSelect={() => onSelect(event)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            No events here yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderRow({ position, name, time, isYou = false }: {
  position: number;
  name: string;
  time: string;
  isYou?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  const medalOrNum = position <= 3 ? medals[position - 1] : `${position}`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: isYou ? "rgba(224,244,121,0.1)" : "transparent",
      border: isYou ? "1px solid rgba(224,244,121,0.3)" : "1px solid transparent",
      borderRadius: 10,
    }}>
      <div style={{ width: 28, textAlign: "center", fontSize: position <= 3 ? 18 : 13, fontWeight: 700, color: isYou ? "#E0F479" : "rgba(255,255,255,0.4)", flexShrink: 0 }}>
        {medalOrNum}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: isYou ? 700 : 500, color: isYou ? "#fff" : "rgba(255,255,255,0.7)" }}>
        {name}
      </div>
      <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: isYou ? "#E0F479" : "rgba(255,255,255,0.5)", fontWeight: isYou ? 700 : 400 }}>
        {time}
      </div>
    </div>
  );
}

// ─── Prize pool breakdown ─────────────────────────────────────────────────────

function PrizeBreakdown({ pool }: { pool: number }) {
  const tiers = [
    { label: "1st place", pct: 0.5 },
    { label: "2nd place", pct: 0.3 },
    { label: "3rd place", pct: 0.2 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {tiers.map((t) => (
        <div key={t.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{t.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#E0F479" }}>{Math.round(pool * t.pct)} KAD</span>
        </div>
      ))}
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({ event, onBack, onStartRace }: {
  event: FlashRun;
  onBack: () => void;
  onStartRace: (e: FlashRun) => void;
}) {
  const { joinedIds, results, joinEvent, resetResult, deleteEvent } = useFlashRun();
  const isCustom = event.participantCount === 0;
  const status = getEventStatus(event);
  const isJoined = joinedIds.includes(event.id);
  const myResult = results[event.id];
  const competitors = generateCompetitors(event);
  const distKm = (event.distanceM / 1000).toFixed(1);

  const countdownTarget = status === "upcoming" ? event.windowStart : event.windowEnd;
  const countdown = useCountdown(countdownTarget);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "20px 20px 32px", color: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center" }}
        >
          <KIcon name="arrow" size={16} color="rgba(255,255,255,0.5)" style={{ transform: "rotate(180deg)" }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{event.name}</h1>
            {event.type === "event" && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#E0F479", background: "rgba(224,244,121,0.12)", border: "1px solid rgba(224,244,121,0.3)", borderRadius: 50, padding: "2px 8px" }}>
                Organized
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{event.subtitle}</div>
        </div>
      </div>

      {/* Live / countdown hero */}
      <KCard padding={20} glow={status === "live"}>
        {status === "live" ? (
          <div style={{ textAlign: "center" }}>
            <KPill pulse icon={<span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E0F479", display: "inline-block" }} />}>
              LIVE NOW
            </KPill>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 10 }}>
              Window closes in
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
              {countdown}
            </div>
          </div>
        ) : status === "upcoming" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>
              Starts in
            </div>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", marginTop: 6 }}>
              {countdown}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <KIcon name="check" size={28} color="#3FB977" />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#3FB977", marginTop: 8 }}>Event finished</div>
          </div>
        )}
      </KCard>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "Distance", value: `${distKm} km`, icon: "route" as const },
          { label: "Prize pool", value: `${event.prizePoolKad.toLocaleString()} KAD`, icon: "trophy" as const },
          { label: "Runners", value: String(event.participantCount), icon: "users" as const },
        ].map((s) => (
          <div key={s.label} style={{ padding: "12px 8px", background: "#1A1A1A", border: "1px solid rgba(224,244,121,0.15)", borderRadius: 12, textAlign: "center" }}>
            <KIcon name={s.icon} size={16} color="rgba(224,244,121,0.6)" />
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2, lineHeight: 1.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Prize breakdown */}
      <KCard padding={16}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", marginBottom: 12, fontWeight: 600 }}>
          Prize distribution
        </div>
        <PrizeBreakdown pool={event.prizePoolKad} />
      </KCard>

      {/* Your result (if past and has result) */}
      {status === "past" && myResult && (
        <KCard padding={16} style={{ background: "rgba(63,185,119,0.1)", border: "1px solid rgba(63,185,119,0.3)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#3FB977", marginBottom: 8, fontWeight: 700 }}>
            Your result
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#E0F479" }}>{positionSuffix(myResult.position)}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>of {myResult.totalParticipants} runners</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
            Time: {formatFinishTime(myResult.durationSec)}
          </div>
        </KCard>
      )}

      {/* Leaderboard / participants */}
      {status === "upcoming" ? (
        <KCard padding={20}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", marginBottom: 10, fontWeight: 600 }}>
              Registered runners
            </div>
            <div style={{ fontSize: 52, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {event.participantCount + (isJoined ? 1 : 0)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              {isJoined ? "including you" : "runners so far"}
            </div>
          </div>
        </KCard>
      ) : isCustom && !myResult ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          No runners yet — be the first
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)", marginBottom: 10, fontWeight: 600 }}>
            {status === "past" ? "Final standings" : "Current leaders"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {!isCustom && competitors.slice(0, 5).map((c) => (
              <LeaderRow
                key={c.name}
                position={c.position}
                name={c.name}
                time={formatFinishTime(c.finishTimeSec)}
              />
            ))}
            {myResult && (
              <LeaderRow
                position={myResult.position}
                name="You"
                time={formatFinishTime(myResult.durationSec)}
                isYou
              />
            )}
            {isJoined && !myResult && !isCustom && (
              <LeaderRow position={competitors.length + 1} name="You" time="—" isYou />
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {status === "live" && !isJoined && (
        <KButton size="lg" style={{ width: "100%" }} onClick={() => joinEvent(event.id)}>
          <KIcon name="zap" size={18} color="#0D0D0D" fill="#0D0D0D" />
          Join race
        </KButton>
      )}

      {status === "live" && isJoined && !myResult && (
        <KButton size="lg" style={{ width: "100%" }} onClick={() => onStartRace(event)}>
          <KIcon name="play" size={16} color="#0D0D0D" fill="#0D0D0D" />
          Start race
        </KButton>
      )}

      {status === "upcoming" && !isJoined && (
        <KButton size="lg" variant="secondary" style={{ width: "100%" }} onClick={() => joinEvent(event.id)}>
          <KIcon name="check" size={16} color="var(--kad-lime)" />
          Register
        </KButton>
      )}

      {status === "upcoming" && isJoined && (
        <div style={{ textAlign: "center", padding: "14px", background: "rgba(224,244,121,0.08)", border: "1px solid rgba(224,244,121,0.2)", borderRadius: 14, fontSize: 13, color: "rgba(224,244,121,0.7)", fontWeight: 600 }}>
          Registered — check back when it goes live
        </div>
      )}

      {status === "live" && myResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ textAlign: "center", padding: "14px", background: "rgba(63,185,119,0.1)", border: "1px solid rgba(63,185,119,0.3)", borderRadius: 14, fontSize: 13, color: "#3FB977", fontWeight: 600 }}>
            Run submitted · {positionSuffix(myResult.position)} place
          </div>
          <button
            onClick={() => resetResult(event.id)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0", fontFamily: "var(--font-sans)" }}
          >
            Run again
          </button>
        </div>
      )}

      {isCustom && (
        <button
          onClick={() => { deleteEvent(event.id); onBack(); }}
          style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", fontSize: 12, cursor: "pointer", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 0", fontFamily: "var(--font-sans)", marginTop: 8 }}
        >
          Delete event
        </button>
      )}
    </div>
  );
}

// ─── Flash run screen (entry point) ──────────────────────────────────────────

type Props = {
  onBack: () => void;
  onStartRace: (event: FlashRun) => void;
};

export function FlashRunScreen({ onBack, onStartRace }: Props) {
  const events = getFlashRunEvents();
  const [selectedEvent, setSelectedEvent] = useState<FlashRun | null>(null);

  if (selectedEvent) {
    return (
      <DetailView
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onStartRace={(e) => {
          setSelectedEvent(null);
          onStartRace(e);
        }}
      />
    );
  }

  return (
    <BrowseView
      onBack={onBack}
      onSelect={(e) => setSelectedEvent(e)}
    />
  );
}

// ─── Post-race podium (used in PostRunScreen) ─────────────────────────────────

export function RacePodium({ eventId, position, totalParticipants, durationSec }: {
  eventId: string;
  position: number;
  totalParticipants: number;
  durationSec: number;
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
    rows = competitors.slice(0, 5).map((c) => ({
      position: c.position,
      name: c.name,
      time: formatFinishTime(c.finishTimeSec),
      isYou: false,
    }));
    if (position <= 5) {
      rows.splice(position - 1, 0, playerRow);
      rows.splice(6);
    } else {
      rows.push(playerRow);
    }
  }

  const posLabel = position <= 3
    ? ["🥇 1st", "🥈 2nd", "🥉 3rd"][position - 1]
    : `${positionSuffix(position)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Position hero */}
      <div style={{
        textAlign: "center",
        padding: "24px 0 20px",
        borderRadius: 20,
        background: position <= 3
          ? "radial-gradient(ellipse at center, rgba(224,244,121,0.15) 0%, rgba(224,244,121,0) 60%)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${position <= 3 ? "rgba(224,244,121,0.25)" : "rgba(255,255,255,0.1)"}`,
      }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)" }}>
          Race result · {event?.name}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#E0F479", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 8 }}>
          {posLabel}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
          {totalParticipants} runners · {formatFinishTime(durationSec)}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em" }}>
          Position may change as others finish
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r, i) => (
          <LeaderRow key={i} position={r.position} name={r.name} time={r.time} isYou={r.isYou} />
        ))}
      </div>
    </div>
  );
}
