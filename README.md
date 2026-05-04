# Kadence

> Run. Earn. Compete.

Kadence is a move-to-earn running app built on Solana. Every kilometre you run mints KAD tokens on-chain. Join communities, complete weekly challenges, and race runners worldwide in synchronized virtual events.

Built for the [Solana Frontier Hackathon 2026](https://colosseum.org) by [@kadenceRun](https://x.com/kadenceRun)

---

## How It Works

```
Start run  -->  GPS tracks distance  -->  Submit to chain  -->  KAD tokens minted
```

1. **Connect** your Phantom wallet
2. **Run** — the app tracks distance and pace via browser GPS
3. **Claim** — after your run, submit distance + duration on-chain
4. **Earn** — the Kadence program validates your run and mints KAD (1 KAD/km base rate)

All rewards are validated on-chain: pace floor (60 sec/km), distance bounds (100m–100km), and overflow-safe arithmetic.

---

## Features

- **GPS Run Tracker** — real-time distance, pace, and route tracking via Haversine formula
- **KAD Token Rewards** — SPL tokens minted per run with streak multipliers
- **Communities** — join a squad, contribute to weekly collective goals, earn bonus KAD
- **Flash Runs** — synchronized virtual race events with prize pools
- **Social Feed** — share runs, fire-react to friends, public profiles
- **Trophy Cabinet** — collect achievements from races and challenges
- **PWA** — installable on mobile, works offline for run data

---

## Architecture

```
┌─────────────────────────────────┐
│  Next.js 16 (App Router, PWA)   │
│  React 19 · Tailwind · SWR      │
├─────────────────────────────────┤
│  @solana/kit 6.3                │
│  Wallet Standard · Phantom      │
│  Codama-generated client        │
├─────────────────────────────────┤
│  Anchor Program (Rust)          │
│  SPL Token · PDA mint authority │
│  Program: DEZbB6Lzz...pMECK    │
└─────────────────────────────────┘
```

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | Next.js 16, React 19, Tailwind CSS 4    |
| Solana SDK     | @solana/kit 6.3, @solana/kit-client-rpc |
| Smart Contract | Anchor 0.32 (Rust)                      |
| Token          | SPL Token (6 decimals)                  |
| Client codegen | Codama (from Anchor IDL)                |
| GPS            | Browser Geolocation API                 |
| Maps           | Leaflet + CartoDB dark tiles            |
| Wallet         | Phantom + Wallet Standard protocol      |
| Deploy         | Vercel                                  |

---

## On-Chain Program

**Program ID:** `DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK`
[View on Solana Explorer (devnet)](https://explorer.solana.com/address/DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK?cluster=devnet)

| Instruction             | What it does                                          |
| ----------------------- | ----------------------------------------------------- |
| `initialize`            | Creates the KAD SPL token mint (one-time)             |
| `complete_run`          | Validates distance/duration/pace, mints KAD to runner |
| `claim_challenge_bonus` | Distributes community challenge rewards               |

**PDA Layout:**

- `[b"kad-mint"]` — KAD token mint (6 decimals)
- `[b"mint-authority"]` — signs all mint CPIs

**Validations:**

- Distance: 100m – 100,000m
- Duration: must be positive
- Pace floor: minimum 60 sec/km (anti-spoofing)
- Overflow-safe arithmetic (checked_mul / checked_div)

---

## Getting Started

### Prerequisites

- Node.js 20+
- Rust + Cargo
- Solana CLI
- Anchor CLI (0.32+)

### Install

```bash
git clone https://github.com/nathanauthiersrny-lgtm/kadence
cd kadence
npm install
```

### Environment (optional)

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_RPC_URL to a dedicated devnet RPC if desired
```

### Build & run the smart contract

```bash
cd anchor
anchor build
anchor test --skip-deploy   # runs 5 LiteSVM integration tests
cd ..
npm run codama:js           # regenerate TypeScript client
```

### Run the frontend

```bash
npm run dev     # http://localhost:3000
```

### Production build

```bash
npm run build   # Next.js optimized build
npm run ci      # build + lint + format check
```

---

## Tests

```bash
# Anchor program tests (LiteSVM)
cd anchor && anchor test --skip-deploy

# 5/5 tests:
#   test_initialize_creates_mint
#   test_complete_run_mints_kad
#   test_complete_run_rejects_zero_distance
#   test_complete_run_rejects_superhuman_pace
#   test_id
```

---

## License

MIT
