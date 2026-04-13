# Kadence 

> Run. Earn. Compete.

Kadence is a move-to-earn social running app built on Solana. 
Complete weekly challenges, earn tokens for every mile, and 
compete in synchronized virtual race events.

Built for the [Solana Frontier Hackathon 2026](https://colosseum.org) by [@kadenceRun](https://x.com/kadenceRun)

---

## MVP Features

- 🛰️ **GPS Tracker** — Record runs via browser Geolocation API
- 🏆 **Communities + Challenges** — Weekly distance goals with token rewards
- 🌍 **Virtual Race Events** — Synchronized global races with on-chain validation

## Tech Stack

- **Frontend** — Next.js, Tailwind, @solana/react-hooks
- **Smart Contracts** — Anchor (Rust)
- **Blockchain** — Solana
- **Wallet** — Phantom
- **Deploy** — Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Rust + Cargo
- Solana CLI
- Anchor CLI
- Surfpool (local validator)

### Installation

git clone https://github.com/YOUR_USERNAME/kadence
cd kadence
npm install

### Run locally

# Start local validator
surfpool start

# Deploy program
cd anchor
anchor build
anchor deploy

# Start frontend
cd ..
npm run dev