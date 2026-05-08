# Kadence

> Run. Earn. Compete.

Move-to-earn social running app built on Solana. Every kilometre mints KAD tokens on-chain. Join communities with weekly shared challenges, compete in Flash Runs with on-chain prize pools, and build your running identity — shareable, permanent, yours on-chain.

**Try it now: kadence-alpha.vercel.app**

> Triple tap the Kadence logo on the home screen to activate demo mode for a richer first experience. The core on-chain loop works identically in both modes.

Built for the Solana Frontier Hackathon 2026 · @kadenceRun

---

## The Core Loop

Connect wallet → Start run → GPS tracks distance → Finish → Claim → KAD minted on-chain

1. **Connect** — Phantom, Solflare, or Backpack
2. **Run** — browser GPS tracks distance and pace in real time
3. **Claim** — submit distance and duration on-chain after your run
4. **Earn** — Anchor program validates and mints KAD (1 KAD/km base rate)

All rewards validated on-chain: pace floor (60 sec/km anti-spoofing), distance bounds (100m–100km), overflow-safe arithmetic throughout.

---

## What Makes It Different

**Communities**
Join a squad at your level — Road Regulars, Trail Advanced. Every week your group gets a shared challenge. Your run moves the group goal forward. When the group hits the target, everyone earns bonus KAD. A beginner's 3 km counts as much as anyone's.

**Flash Runs**
A weekly schedule of open global events — no waitlist, no lottery, no expensive race number. Boost days multiply your KAD rewards just for running during the window. Race days bring real competition — leaderboards, ghost runners, on-chain prize pools split between top finishers.

**Your Profile On-Chain**
Stats, badges, trophy cabinet, every race you've entered. Permanent. Shareable. Yours.

---

## Roadmap

**Q3 2026**
- React Native mobile app — real background GPS, screen always on
- Garmin / Suunto / Apple Watch sync — import sessions from running watches
- KAD token mainnet launch with real liquidity

**Q4 2026**
- Nutrition guidance during runs — pace-aware hydration and fueling reminders
- NFT rewards for race finishers — on-chain proof of completion, tradeable
- Physical rewards for event organizers — branded race medals backed by on-chain validation

**2027**
- Brand partnerships — collaboration with running brands for sponsored Flash Runs
  and exclusive rewards
- Community-organized events — any running club can create and host their own
  Flash Run with custom prize pools

---

## On-Chain Program

**Program ID:** DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK

View on Solana Explorer (devnet):
https://explorer.solana.com/address/DEZbB6Lzz6nrbeZW9EtA5XNbu1SfAKcgEALfmKLpMECK?cluster=devnet

| Instruction | What it does |
|---|---|
| initialize | Creates KAD SPL token mint (one-time) |
| complete_run | Validates run, mints KAD to runner |
| claim_challenge_bonus | Distributes community challenge rewards |

PDA Layout:
- kad-mint — KAD token mint (6 decimals)
- mint-authority — signs all mint CPIs

**Tests:** 5/5 LiteSVM integration tests passing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Solana SDK | @solana/kit 6.3, @solana/kit-client-rpc |
| Smart Contract | Anchor 0.32 (Rust) |
| Token | SPL Token (6 decimals) |
| Client codegen | Codama (from Anchor IDL) |
| GPS | Browser Geolocation API + Haversine |
| Maps | Leaflet + CartoDB dark tiles |
| Wallets | Phantom, Solflare, Backpack |
| Deploy | Vercel |

---

## Known Limitations

- Browser GPS — less accurate than native, no background tracking
- Screen must stay on during runs — background GPS requires a native app.
  A React Native rebuild with full background tracking is planned post-hackathon.
- Devnet only — KAD has no real market value yet
- Boost/underdog multipliers are frontend display — on-chain mints base KAD
- Community group activity uses deterministic simulation — real users contribute
  via actual runs

---

## License

MIT