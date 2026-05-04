# Kadence

> Run. Earn. Compete.

Move-to-earn social running app built on Solana. Complete runs, earn KAD tokens, compete in Flash Runs, and join running communities — all validated on-chain.

**Live:** [kadence-alpha.vercel.app](https://kadence-alpha.vercel.app)  
**X:** [@kadenceRun](https://x.com/kadenceRun)  
**Hackathon:** Solana Frontier Hackathon 2026 · Deadline May 11, 2026

---

## The Idea

50 million active runners worldwide. Zero of them earning from it.

Running apps capture engagement and return nothing to the runner. Move-to-earn apps proved the concept but were built for crypto natives — not real runners. No community layer, no social accountability, no reason to keep running when the token price drops.

Kadence is built for the runner first. The Web3 layer is invisible — no crypto jargon, no confusing wallet flows. Solana makes it viable: 400ms confirmations at fractions of a cent means micro-rewards per run actually work.

---

## What's Built

### Anchor Program

Four on-chain instructions:

| Instruction | What it does |
|---|---|
| `initialize` | Creates the KAD SPL token mint via PDA (seed: `"kad-mint"`) with separate mint-authority PDA |
| `complete_run` | Validates run data, mints KAD reward to runner, auto-creates ATA if needed |
| `claim_challenge_bonus` | Mints community challenge bonus (max 50 KAD), client-trusted |
| `create_token_metadata` | One-time Metaplex `CreateMetadataAccountV3` CPI to attach name/symbol/logo to KAD mint |

**Program ID (devnet):** `DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK`

**Validations:**
- Distance: 1m minimum, 100km maximum
- Duration: must be positive, pace >= 1 min/km (anti-spoofing)
- Overflow-safe arithmetic throughout
- 5/5 LiteSVM tests passing

**Token:** KAD — SPL token, 6 decimals, 1 KAD per km base reward (1,000 base units per meter)

### GPS Tracking

- `useRunTracker` hook — `startRun()` / `stopRun()`
- Real-time Haversine distance calculation
- GPS noise filter — ignores segments under 1m (jitter) or over 50m/s (impossible speed)
- Route coordinates saved per run for post-run map reveal
- Live stats during run: distance, pace, duration, projected KAD

### KAD Reward System

Multiplier stack applied on every run:

```
finalKAD = baseKAD × streakMultiplier × boostMultiplier × underdogMultiplier × socialMultiplier
```

- **Base:** 1 KAD per km
- **Streak multiplier:** weekly streaks (goal: 2 runs/week) — 1.0x (0 weeks), 1.2x (1+), 1.4x (2+), 1.6x (4+), 2.0x (8+ weeks)
- **Boost multiplier:** active during boost event windows (1.3x–2x)
- **Underdog multiplier:** 1.2x for race finishers outside top 3 — everyone earns something for showing up
- **Social multiplier:** based on weekly "fires" received — 1.0x (0), 1.02x (1+), 1.05x (6+), 1.08x (16+)

Boost, underdog, and social multipliers are frontend display — `complete_run` mints base KAD on-chain.

### Flash Runs — Virtual Race Events

Time-aware weekly schedule with two event types:

**Boost Events** (no competition, KAD multiplier):
| Day | Event | Boost | Window |
|---|---|---|---|
| Monday | Morning Kickstart | 1.5x | 6am–10am |
| Wednesday | Midweek Push | 1.3x | 12pm–8pm |
| Thursday | Speed Session | 2x | 5pm–9pm |
| Friday | Friday Burn | 1.5x | All day |

**Race Events** (leaderboard, prize pool):
| Day | Event | Distance | Prize Pool |
|---|---|---|---|
| Tuesday | Tempo Tuesday | 5 km | 25 KAD |
| Saturday | Weekend Warrior | 10 km | 50 KAD |
| Sunday | Featured Race | Rotating | 50–150 KAD |

Sunday rotates weekly: 5K → 10K → Half Marathon → repeat.

All events:
- Real countdowns ticking in real time
- Auto-transition Upcoming → Live → Past based on clock
- Ghost runner competition during races
- Deterministic competitor generation
- Custom event creator for admin/demo use

### Communities

- 4 communities: Road/Trail × Starter/Regular
- Weekly challenges resetting every Monday
- Group progress scales with day of week (builds toward Sunday)
- Auto-assign tier after 3 runs based on average pace + distance
- Bonus KAD claim for completing weekly challenge on-chain (`claim_challenge_bonus`)

**Social Feed:**
- Users share runs to their community (stored in localStorage)
- 5–8 simulated runs per community per week from deterministic fake runners (seeded PRNG)
- "Fire" reactions on runs — weekly fires drive the social multiplier
- No backend; all state is localStorage-only

### Daily Quests

- 5 distance-based quests in the pool: 2 km (6 KAD), 3 km (10 KAD), 5 km (18 KAD), 7 km (24 KAD), 10 km (32 KAD)
- Deterministic daily selection via `dayOfYear % 5`
- Progress and completion persisted in localStorage, auto-reset at midnight
- Countdown timer to next quest reset

### SOL Vault

Separate Anchor program with its own Kodama-generated client:

- Deposit SOL into a personal PDA, withdraw anytime
- One deposit at a time — must withdraw before depositing again
- No staking rewards or lock-up period
- UI: vault balance display, SOL amount input, Withdraw All button

### Run Goals & Ghost Pacer

- Pre-run modal to set distance (km) and time (min) targets
- Ghost pacer competition during the run
- Option to skip and start a free run with no target

### Screens

| Screen | Description |
|---|---|
| **Home** | Editorial hero, Flash Run widget, community widget, streak, KAD balance |
| **InRun** | 156px white timer, distance/pace bento cards, boost pill, PAUSE/END RUN |
| **PostRun** | Map reveal with lime polyline, KAD breakdown, CLAIM IT |
| **Flash Runs** | Browse/filter events, boost vs race differentiation |
| **Flash Run Detail** | Countdown, prize breakdown, live leaderboard, your position |
| **Community** | Group detail, weekly challenge progress, social feed |
| **Profile** | KAD balance, level/XP, lifetime stats, streak, badges, trophy cabinet |
| **Activity History** | All past runs with lifetime stats and weekly summary |
| **Run Detail** | Full route map, stats grid, on-chain proof with Explorer link |
| **Public Profile** | `/u/[slug]` — shareable profile page; shows real data for own wallet, deterministic demo for others |

### Profile System

- Generated avatar from wallet address (deterministic color)
- Editable display name (stored in localStorage)
- Level + XP progression: flat 100 XP per level, 10 titles (Beginner → Jogger → Runner → Pacer → Sprinter → Racer → Finisher → Elite → Champion → Legend)
- Streak counter with weekly multiplier tiers
- 8 badges (earned / locked): First Step, On Fire (3-week streak), 7-Week Streak, 5K Club, Sub-30 (5 km under 30 min), 10K Club, Speed Demon (>16 km/h), Half Marathon (21 km)
- Trophy Cabinet — race history with medals (🥇🥈🥉🏅), positions, KAD won
- Distance unit toggle (km/mi) via tap on stat card
- Activity history link

### Wallet Abstraction

Custom wallet layer in `app/lib/wallet/`:

- **Wallet Standard discovery** — auto-detects any injected Solana wallets (Phantom desktop, Solflare, Backpack, etc.)
- **Phantom mobile deep links** — NaCl-encrypted connect/sign/send/disconnect flows via `phantom.app/ul/v1/` for mobile browsers with no injected wallet
- **Signer adapter** — creates `TransactionModifyingSigner` or `TransactionSendingSigner` depending on wallet capability
- **React context** — manages auto-connect, wallet discovery via `watchWallets`, and Phantom mobile redirect handling

### On-Chain Run History

- `useChainSync` hook fetches up to 200 recent transaction signatures for a wallet
- Filters for transactions targeting the Kadence program with `complete_run` discriminator
- Decodes distance and duration from instruction data
- Provides verified on-chain run history independent of localStorage

### Demo Mode

- Boolean flag in localStorage — toggles simulated data, bypasses wallet requirements
- Other components check `isDemoMode()` to conditionally show demo content
- Full page reload on toggle to ensure consistent state

### PWA

- Installable on Android and iOS from browser
- Fullscreen standalone mode (no browser bar)
- Service worker registration via `sw-registrar.tsx`
- App icon with Kadence logo

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Solana SDK | @solana/react-hooks, @solana/kit |
| Smart Contracts | Anchor (Rust) |
| Token Standard | SPL Token |
| Client Generation | Kodama (generated from Anchor IDL) |
| Local Validator | Surfpool |
| GPS | Browser Geolocation API |
| Map | Leaflet + CartoDB Dark tiles |
| Deploy | Vercel |
| Wallets | Phantom (desktop + mobile deep links), Solflare, Backpack, any Wallet Standard wallet |
| Token Metadata | Metaplex |
| Theme | next-themes |

---

## Design System

```
Background:  #0D0D0D   — near black
Cards:       #1A1A1A
Accent:      #E0F479   — lime, primary brand color
Text:        #FFFFFF
Muted:       rgba(255,255,255,0.5)
Font:        DM Sans (Google Fonts)
```

**Principles:**
- Two colors — `#0D0D0D` and `#E0F479`
- White for all text and labels
- Lime reserved for key data, CTAs, and earned amounts
- Mobile-first, 390px base width
- Light/dark theme toggle — dark is default, light mode for outdoor readability
- Decorative grid background with ambient purple/green glows
- Feels like a Web2 running app — no crypto jargon visible

---

## Architecture

```
kadence/
├── anchor/
│   └── programs/kadence/src/lib.rs      ← Anchor program (4 instructions)
├── app/
│   ├── components/                      ← All screens + UI primitives
│   ├── lib/
│   │   ├── hooks/                       ← 15 hooks (GPS, balance, flash runs, community, quests, XP, badges, streak, social feed, chain sync, etc.)
│   │   └── wallet/                      ← Wallet abstraction (standard discovery, Phantom mobile deep links, signer adapter)
│   ├── generated/
│   │   ├── kadence/                     ← Kodama client for Kadence program
│   │   └── vault/                       ← Kodama client for Vault program
│   └── u/[slug]/                        ← Public profile route
├── scripts/
│   ├── initialize.ts                    ← One-time KAD mint setup
│   └── add-metadata.ts                  ← Metaplex token metadata script
└── public/
    └── manifest.json                    ← PWA manifest
```

**State machine:**
```
IDLE → RUNNING → POST_RUN → CLAIMED
     ↕              ↕
  PROFILE       HISTORY
     ↕
COMMUNITY / FLASH_RUNS
```

---

## Business Model

**Freemium**
- Free: unlimited runs, KAD rewards, community access
- Premium: advanced analytics, priority race entry, custom challenges

**Race Entry Fees**
- Flash Run races charge a small KAD entry fee
- Protocol earns a percentage of each prize pool

**NFT Badge Marketplace** *(V2)*
- Events medals minted as NFTs

---

## Roadmap

```
April 2026  GPS tracking + KAD rewards          
            Flash Runs (boost + race events)     
            Communities + weekly challenges + social feed
            Profile + Trophy Cabinet + badges
            Activity History + Run Detail        
            Daily quests system
            SOL Vault program
            Run goals + ghost pacer
            On-chain run history (chain sync)
            Wallet abstraction (standard + Phantom mobile)
            KAD token metadata (Metaplex)
            Light / dark theme
            Demo mode
            Public profile pages (/u/[slug])
            Editorial UI redesign               
            PWA + mobile wallet connection       
            Vercel deployment on devnet          

May 2026    Onboarding screens (planned)
            Demo video + written pitch           
            Colosseum submission (May 11)        

Q3 2026     React Native rebuild (background GPS)
            Garmin / Suunto sync

Q4 2026     Mainnet launch
            NFT Badge Marketplace
            Community governance
```

---

## Known Limitations

- **Browser GPS** — less accurate than native app, no background tracking
- **Screen must stay on** during runs (browser limitation)
- **Devnet only** — KAD has no real market value yet
- **Multipliers are frontend display** — boost, underdog, social, and streak multipliers are calculated client-side; on-chain always mints base KAD
- **Challenge bonus is client-trusted** — `claim_challenge_bonus` has no on-chain challenge validation
- **No backend** — all user state (quests, social feed, badges, streak, XP) is localStorage-only
- **Solo builder** — no team redundancy

---

## Built by

Solo build by [@kadenceRun](https://x.com/kadenceRun) for the Solana Frontier Hackathon 2026.  