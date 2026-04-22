# Kadence — Project Documentation

> Run. Earn. Compete.

**Version:** 1.0  
**Last updated:** April 2026  
**Hackathon:** Solana Frontier Hackathon 2026 (deadline May 11, 2026)  
**X:** [@kadenceRun](https://x.com/kadenceRun)  
**GitHub:** https://github.com/nathanauthiersrny-lgtm/kadence

---

## Table of Contents

1. [Vision](#vision)
2. [Why Kadence](#why-kadence)
3. [Target Users](#target-users)
4. [Features](#features)
5. [Tech Stack](#tech-stack)
6. [Architecture](#architecture)
7. [Design System](#design-system)
8. [What's Built](#whats-built)
9. [What's Planned](#whats-planned)
10. [Business Model](#business-model)
11. [Roadmap](#roadmap)
12. [Known Limitations](#known-limitations)

---

## Vision

Kadence is a move-to-earn social running app built on Solana. Runners earn KAD tokens for completing runs, compete in weekly community challenges, and race globally in synchronized virtual race events. All validated on-chain.

The core premise: **running has always been free. The rewards never were.** Kadence changes that by turning every kilometer into an on-chain reward, every challenge into a community moment, and every race into a global event.

---

## Why Kadence

The global running market has over 50 million active runners worldwide. Existing running apps (Strava, Nike Run Club..) capture engagement but return zero value to the runner. Move-to-earn apps have proven the concept works. But they were built for crypto natives, not real runners, no community layer, no social accountability.

Kadence is built for runners first. The Web3 layer is invisible — no crypto jargon, no confusing wallet flows, no barrier to entry. Solana enables this: transactions confirm in 400ms for fractions of a cent, making micro-rewards per run economically viable.

**Three things that make Kadence different:**
- Real GPS tracking, not step counting
- Community challenges with on-chain token rewards
- Synchronized virtual races anyone can join from anywhere

---

## Target Users

**Primary — The committed runner**
Runs 3-5 times per week, uses Strava or similar, motivated by data and social accountability. Doesn't need to understand crypto to use Kadence — the wallet is just a reward account.

**Secondary — The Web3 runner**
Already in the Solana ecosystem, looking for utility beyond trading. Motivated by earning and competing on-chain.

---

## Features

### MVP — Core Pillars (P1)

#### 1. GPS Tracker
Records running sessions via browser Geolocation API.
- Real-time distance calculation using Haversine formula
- GPS noise filter (ignores segments under 1m jitter or over 50m/s — impossible running speed)
- Live stats during run: distance, pace, duration
- Post-run map reveal using Leaflet

#### 2. KAD Token Rewards
Every completed run earns KAD tokens proportional to distance.
- Reward formula: 1 KAD per kilometer
- Minted on-chain via SPL token program
- Pace floor validation: minimum 60 sec/km (anti-spoofing)
- Distance validation: 100m minimum, 100km maximum
- Overflow-safe arithmetic throughout

#### 3. Communities + Challenges
Runners join groups based on level and run type.
- Four levels: Starter / Regular / Advanced / Elite
- Four run types: Road / Trail / Track / Casual
- Weekly shared challenges per community
- Bonus KAD rewards for completing group goals
- Auto-assign community based on first runs

#### 4. Virtual Race Events
Synchronized global races, validated on-chain.
- Fixed start time, open to all runners worldwide
- Runner stakes KAD to enter
- On-chain validation of distance and pace
- Prize pool distributed to top finishers
- Inspired by prediction market architecture: join → run → resolve → claim

### V2 Features (Post-Hackathon)

- **Local Legend Segments** — territory claiming and defense system
- **Garmin / Suunto Sync** — import sessions from GPS watches
- **Native Mobile App** — React Native with real background GPS
- **Leaderboards** — global and community rankings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS |
| Solana SDK | @solana/react-hooks, @solana/kit |
| Smart Contracts | Anchor (Rust) |
| Token Standard | SPL Token |
| Client Generation | Kodama (from Anchor IDL) |
| Local Validator | Surfpool |
| GPS | Browser Geolocation API |
| Map | Leaflet + CartoDB Dark tiles |
| Database | Supabase (communities, challenges) |
| Deploy | Vercel (frontend) |
| Wallet | Phantom |

---

## Architecture

### On-Chain (Anchor Program)

```
kadence/
└── anchor/
    └── programs/
        └── kadence/
            └── src/
                └── lib.rs
```

**Program ID:** `DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK`

**Instructions:**

| Instruction | Accounts | What it does |
|---|---|---|
| `initialize` | payer, mint PDA, mint_authority PDA | Creates the KAD SPL token mint once |
| `complete_run` | runner, mint PDA, runner ATA, mint_authority PDA | Validates run, mints KAD reward |

**PDA Layout:**
- `[b"kad-mint"]` → KAD token mint (6 decimals, deterministic address)
- `[b"mint-authority"]` → Signs all mint_to CPIs (no stored data)

**Validations:**
- Distance: 100m minimum, 100km maximum
- Duration: must be positive
- Pace floor: minimum 60 sec/km (anti-spoofing)
- Overflow-safe checked arithmetic throughout

**Events emitted:** `RunCompleted { runner, distance, duration, reward }`

### Frontend Architecture

```
app/
├── components/
│   ├── run-card.tsx       ← Main state machine (idle/running/post_run/claimed)
│   ├── run-map.tsx        ← Leaflet map, post-run route reveal
│   └── post-run.tsx       ← Summary + claim screen
├── lib/
│   └── hooks/
│       ├── use-run-tracker.ts  ← GPS tracking, Haversine, noise filter
│       └── use-kad-balance.ts  ← KAD balance polling (5s SWR)
└── generated/
    └── kadence/           ← Kodama-generated TypeScript client
```

**State machine:**
```
IDLE → RUNNING → POST_RUN → CLAIMED
```

---

## Design System

### Colors
```
Background:     #0D0D0D  (off-black, never pure black)
Card:           #1A1A1A
Accent (lime):  #E0F479  (primary brand, CTAs, all numbers)
Accent Muted:   rgba(224, 244, 121, 0.4)
Card Border:    rgba(224, 244, 121, 0.2)
Card Glow:      0 0 8px rgba(224, 244, 121, 0.15)
Text Primary:   #FFFFFF
Text Secondary: #E0F479
```

### Typography
```
Font:           DM Sans (Google Fonts)
Hero numbers:   700 weight, 80px  (timer, distance)
Section titles: 600 weight, 24px
Card values:    700 weight, 32px
Labels:         400 weight, 13px
Buttons:        700 weight, 18-22px, ALL CAPS
```

### Principles
- Two colors only — `#0D0D0D` and `#E0F479`
- No gradients (except map route polyline)
- No crypto jargon visible to users
- Mobile-first, 390px base width
- Feels like a Web2 running app

---

## What's Built

*Status as of end of Week 2 (April 2026)*

### ✅ Completed

**Solana Program**
- `initialize` instruction — KAD mint created on-chain
- `complete_run` instruction — validates and mints tokens
- 5/5 LiteSVM tests passing
- Deployed and tested on localnet and devnet

**GPS Tracking**
- `useRunTracker` hook with `startRun()` / `stopRun()`
- Haversine distance calculation
- GPS noise filter (jitter + impossible speed)
- Live stats: distance, pace, duration, projected KAD

**Frontend**
- Full UI matching Photoshop mockups
- DM Sans font, lime/dark color system
- Active run screen with live KAD ticker
- Post-run map reveal with CartoDB dark tiles + lime polyline
- Claim flow wired to Anchor program via Kodama client
- KAD balance polling every 5s via SWR
- Badge system (first unlock working)
- Error messages mapped to human-readable strings

**Infrastructure**
- GitHub repo public from day 1
- Surfpool local validator
- Devnet deployment working
- ngrok mobile testing working
- @kadenceRun X account live

### 🔲 In Progress

- Communities + Challenges system
- Virtual Race Events
- UI polish pass
- Vercel deployment

---

## What's Planned

### Week 3 — Communities + Virtual Races
- Community join flow (level + run type selection)
- Weekly challenge display and progress
- Bonus KAD distribution for challenge completion
- Virtual Race Event creation and join flow
- On-chain race validation and prize distribution

### Week 4 — Polish + Integration
- Full UI consistency pass
- End-to-end testing of all flows
- Vercel deployment on devnet
- Beta testing on mobile via real URL
- Performance optimization

### Week 5 — Submission
- Demo video (3 minutes max, Loom)
- Written pitch covering:
  - Team background
  - Product description
  - Market opportunity
  - Go-to-market strategy
  - Business model
- Colosseum platform submission before May 11

---

## Business Model

**Freemium**
- Free: unlimited runs, earn KAD, join communities
- Premium: advanced stats, custom challenges, priority race entry

**Paid Race Entries**
- Virtual races charge an entry fee in KAD
- Protocol takes a small percentage of each prize pool

**Future: Local Legend Segments**
- Territory-based challenges with staking mechanics
- Segment defenders earn passive KAD from challengers

---

## Roadmap

```
April 2026  ──  MVP core loop (GPS + token rewards) ✅
                Communities + Challenges             🔲
                Virtual Race Events                  🔲

May 2026    ──  Hackathon submission (May 11)        🔲
                Post-hackathon rebuild with learnings

Q3 2026     ──  React Native mobile app
                Garmin / Suunto sync
                Local Legend Segments beta

Q4 2026     ──  Public mainnet launch
                Community governance (DAO)
```

---

## Known Limitations

**Current MVP limitations:**
- Browser GPS is less accurate than native app GPS — works well outdoors, unreliable indoors
- App does not run in background — screen must stay on during runs
- Devnet only — no real token value yet
- Communities are partially mocked for hackathon demo
- Single builder — no team redundancy

**Technical debt to address post-hackathon:**
- Rebuild with React Native for proper background GPS
- Add Supabase auth for persistent user profiles
- Harden smart contract with security audit before mainnet
- Implement proper key management for production

---

