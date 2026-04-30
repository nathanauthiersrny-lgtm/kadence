# Kadence Social Layer — Implementation Plan

## Overview

This plan adds 6 features to Kadence in 4 phases. Each phase ends with a developer handoff section — everything you need to start the next phase without prior context.

**Architecture context:** Kadence is a Next.js 16 single-page app. All views (home, running, post-run, community, flash-runs, history, profile) render in `/app/page.tsx` via client-side `view` state. All user data lives in **localStorage**. The only on-chain operation is KAD token minting via an Anchor program. There is no backend — social data is localStorage-based with simulated community members (same pattern as the existing community activity feed).

**Design system:** `#0D0D0D` background, `#1A1A1A` cards, `#E0F479` lime accent, `#3FB977` green, DM Sans font, pill buttons (border-radius 50px), 16px card border-radius, white borders at `rgba(255,255,255,0.16)`. All styles are inline (no CSS modules/Tailwind classes in components). Primitives in `app/components/ui/primitives.tsx`: `KCard`, `KButton`, `KPill`, `KAvatar`, `KIcon`.

**Current multiplier formula** (`page.tsx` line 130):
```
finalKAD = baseKAD * streak_multiplier * boost_multiplier * underdog_multiplier
```

**Dependency graph:**
```
Phase 1 (Feed + Share)
   |
   +---> Phase 2 (Fires + Social Multiplier)
   |
   +---> Phase 3 (Public Profile)     [independent of Phase 2]
   |
   +---> Phase 4 (Run Card + Tweet)   [independent of Phase 2 & 3]
```

---

## Phase 1 — Social Feed Data Layer + Share Button + Feed UI

### What to build

1. A new `use-social-feed.ts` hook that manages shared runs and fire reactions in localStorage
2. A "Share Run" button on the PostRun screen (explicit, never automatic)
3. Run cards in the community detail view replacing the existing text-based activity feed

### 1A. New hook: `app/lib/hooks/use-social-feed.ts`

**localStorage keys:**
- `kadence_shared_runs` — `SharedRun[]`
- `kadence_fires` — `Record<string, boolean>` (which runs the current user has fired)

**Data model:**
```ts
import type { LatLon } from "./use-run-tracker";

export type SharedRun = {
  id: string;                // "shared-{Date.now()}"
  runId: string;             // references RunEntry.id from kadence_runs
  communityId: string;       // e.g. "road-starter", "trail-regular"
  runnerName: string;        // from kadence_profile_name or wallet slug
  walletAddress: string;     // full address
  distanceKm: number;
  durationSeconds: number;
  paceSecPerKm: number;
  kadEarned: number;
  routeCoords: LatLon[];     // simplified — store every 5th coord to save space
  txSignature: string | null;
  sharedAt: string;          // ISO timestamp
  fireCount: number;         // total fires received
  isSimulated: boolean;      // true for demo community members
  // Flash run fields (optional)
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};
```

**Hook signature:**
```ts
export function useSocialFeed(communityId: string | null): {
  sharedRuns: SharedRun[];            // runs for the given community, sorted by sharedAt desc
  shareRun: (params: ShareRunParams) => SharedRun;
  fireRun: (sharedRunId: string) => void;
  hasFired: (sharedRunId: string) => boolean;
  weeklyFiresReceived: number;        // fires received by current user this Mon-Sun
  socialMultiplier: number;           // derived from weeklyFiresReceived
};
```

**Social multiplier scale:**
| Fires received (this week) | Multiplier |
|---|---|
| 0 | x1.00 |
| 1-5 | x1.02 |
| 6-15 | x1.05 |
| 16+ | x1.08 |

**Simulated feed entries:** Generate 5-8 fake shared runs per community using a `seededRandom` function (see `use-community.ts` lines 127-160 for the exact pattern). Use deterministic seeds based on community ID + current week. Each simulated run gets a random fire count (3-25). Only generate when `isDemoMode()` returns true (check `use-demo-mode.ts` for the utility). Use name pools like `["Alex", "Sam", "Jordan", "Miko", "River", "Casey", "Blake", "Quinn"]`.

**Week boundary:** Reuse the Monday-of-week calculation from `use-community.ts` (get current date, subtract `(day + 6) % 7` days, set to midnight).

### 1B. Share button on PostRun screen

**File:** `app/components/post-run-screen.tsx`

Add a "Share Run" button between the Claim CTA (line 296) and "Back to home" (line 317). New props:
```ts
type Props = {
  // ...existing props (snapshot, multiplier, onClaim, onBack, isClaiming, claimed, raceResult)
  onShare?: () => void;
  isShared?: boolean;
  communityName?: string;   // e.g. "Road Starters"
};
```

**Button behavior:**
- Only renders if `onShare` is provided and user has joined a community
- Before sharing: ghost-styled button with share icon + "Share to [communityName]"
- After sharing (`isShared === true`): green confirmation state "Shared to [communityName]" with check icon
- Uses same pill button styling as the existing Claim CTA but ghost variant

### 1C. Wiring in `page.tsx`

**File:** `app/page.tsx`

- Import `useSocialFeed` from the new hook
- Call `useSocialFeed(joinedCommunity?.id ?? null)` at the component level
- Add state: `const [isShared, setIsShared] = useState(false)`
- Create handler:
```ts
const handleShare = useCallback(() => {
  if (!runSnapshot || !joinedCommunity) return;
  const profileName = localStorage.getItem("kadence_profile_name") || "Runner";
  const walletAddr = signer?.address?.toString() || "";
  socialFeed.shareRun({
    runId: runSnapshot.savedRunId || `run-${Date.now()}`,
    communityId: joinedCommunity.id,
    runnerName: profileName,
    walletAddress: walletAddr,
    distanceKm: runSnapshot.distanceMeters / 1000,
    durationSeconds: runSnapshot.durationSeconds,
    paceSecPerKm: runSnapshot.distanceMeters > 0
      ? (runSnapshot.durationSeconds / runSnapshot.distanceMeters) * 1000 : 0,
    kadEarned: runSnapshot.finalKAD,
    routeCoords: runSnapshot.routeCoords.filter((_, i) => i % 5 === 0), // every 5th point
    txSignature: null, // updated later if claimed
    flashRunEventName: runSnapshot.flashRunEvent?.name,
    flashRunPosition: runSnapshot.raceResult?.position,
    flashRunTotalRunners: runSnapshot.raceResult?.totalParticipants,
  });
  setIsShared(true);
}, [runSnapshot, joinedCommunity, signer, socialFeed]);
```
- Pass `onShare={handleShare}`, `isShared`, `communityName={joinedCommunity?.name}` to PostRunScreen
- Reset `setIsShared(false)` in `handleBack`

**Note:** The `RunSnapshot` type in `post-run-screen.tsx` (line 37-46) currently doesn't include `routeCoords` or `savedRunId`. These are in the extended snapshot type in `page.tsx`. The `handleShare` callback lives in `page.tsx` where these fields are available.

### 1D. Community feed run cards

**File:** `app/components/community-screen.tsx`

Replace the text-based activity feed (lines 340-382 in `DetailView`) with structured run cards from the social feed.

Import `useSocialFeed` in the `DetailView` component. Get `sharedRuns`, `fireRun`, `hasFired` from the hook.

**Each feed card renders:**
- Avatar circle (28x28, cycling through `avatarColors` array already defined at line 214)
- Runner name (bold, 13px) + time ago (10px, muted)
- Stats row: distance + pace + KAD earned (11px, inline, separated by dots)
- Route thumbnail: use `MiniRunMap` component (already exists at `app/components/mini-run-map.tsx`) if `routeCoords.length >= 2`, rendered at ~120px height inside a rounded container. Skip if no coords.
- Fire button: `KIcon` name `"flame"` — `#E0F479` fill when fired by current user, `rgba(255,255,255,0.3)` when not — tappable, shows fire count next to it

**Card styling:** `#1A1A1A` background, `1px solid rgba(255,255,255,0.06)` border, 16px border-radius, 14px padding. Cards stack vertically with 10px gap.

### Verification

1. `npm run dev`
2. Enable demo mode (3x tap on logo)
3. Complete a run, arrive at PostRun screen
4. Verify "Share to [Community]" button appears (only if you've joined a community)
5. Tap Share, verify confirmation state
6. Navigate to Community, verify run cards in the feed with route maps and fire buttons
7. Tap a fire button, verify count increments and button turns lime

---

### Phase 1 — Developer Handoff

**What was built:**
- `app/lib/hooks/use-social-feed.ts` — hook managing shared runs + fires in localStorage
- Share button added to `post-run-screen.tsx` (props: `onShare`, `isShared`, `communityName`)
- Share handler wired in `page.tsx` (calls `socialFeed.shareRun()`)
- Community feed in `community-screen.tsx` now shows structured run cards with fire buttons

**Current data model:**
- `kadence_shared_runs` in localStorage: array of `SharedRun` objects (see type above)
- `kadence_fires` in localStorage: `Record<string, boolean>` tracking which runs the current user has fired
- Simulated runs are generated with `isSimulated: true` and merged into the feed

**Available from `useSocialFeed(communityId)`:**
- `sharedRuns` — all runs for a community (real + simulated), sorted newest first
- `shareRun(params)` — persists a new shared run, returns the created SharedRun
- `fireRun(id)` / `hasFired(id)` — fire toggle (one per user per run)
- `weeklyFiresReceived` — total fires received by the current user this Mon-Sun week
- `socialMultiplier` — computed from weeklyFiresReceived (1.00 / 1.02 / 1.05 / 1.08)

**What the PostRun screen looks like now:**
- Hero + stats + badges + Claim CTA + **Share button** + Back to home
- Share button only appears when `onShare` prop is provided

**What's NOT done yet:** The `socialMultiplier` value is computed but not yet applied to the KAD formula. The fire count on profile is not shown. These are Phase 2.

---

## Phase 2 — Fire System + Social Multiplier

### Prerequisites
Phase 1 must be complete. You need the `useSocialFeed` hook returning `weeklyFiresReceived` and `socialMultiplier`.

### What to build

1. Make fire interactions persist correctly (already scaffolded in Phase 1, verify it works)
2. Show weekly fires received on the profile screen
3. Integrate the social multiplier as the 4th factor in the KAD formula
4. Show the social multiplier row in the PostRun KAD breakdown

### 2A. Fire persistence verification

The `fireRun` and `hasFired` functions should already work from Phase 1. Verify:
- Firing a run increments `fireCount` on the `SharedRun` in `kadence_shared_runs`
- The run ID is added to `kadence_fires` so the user can't fire the same run twice
- Refreshing the page preserves fire state

### 2B. Profile fires display

**File:** `app/components/profile-screen.tsx`

Add a "Fires this week" card. Import `useSocialFeed` (pass the user's community ID from `useCommunity`).

Place it after the streak section. Style:
```
[flame icon #E0F479]  12 fires this week
```

Small card, `#1A1A1A` background, 16px border-radius. Uses `KIcon` name `"flame"`. Shows `weeklyFiresReceived` value. If 0, show "0 fires this week" in muted color.

### 2C. Social multiplier in KAD formula

**File:** `app/page.tsx`

**Current code (line 130):**
```ts
const finalKAD = Math.round(baseKAD * multiplier * boostMult * underdogMult * 100) / 100;
```

**Change to:**
```ts
const socialMult = socialFeed.socialMultiplier;
const finalKAD = Math.round(baseKAD * multiplier * boostMult * underdogMult * socialMult * 100) / 100;
```

Also add `socialMultiplier: socialMult` to the `setRunSnapshot(...)` calls (both the normal path ~line 146 and the error fallback ~line 156, where it should default to 1).

The `RunSnapshot` type in `post-run-screen.tsx` needs a new field:
```ts
type RunSnapshot = {
  // ...existing fields
  socialMultiplier: number;
};
```

### 2D. PostRun breakdown row

**File:** `app/components/post-run-screen.tsx`

In the KAD breakdown card (lines 197-233), add the social multiplier row after the underdog row:
```tsx
{socialMult > 1 && (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
    <span>Social ({socialMult}x)</span>
    <span style={{ color: "#E0F479" }}>+{socialContrib.toFixed(2)} KAD</span>
  </div>
)}
```

Compute `socialContrib`:
```ts
const socialMult = snapshot.socialMultiplier ?? 1;
const afterUnderdog = afterBoost * underdogMult;  // this is the current finalKAD calc
const socialContrib = afterUnderdog * socialMult - afterUnderdog;
```

Update the `hasMultipliers` check (line 70) to also check `socialMult > 1`.

Update the Total row to reflect the new `finalKAD` (which already includes social from the formula change in page.tsx).

### Verification

1. Share a few runs to the feed (or use demo mode simulated data)
2. Fire some runs in the community feed
3. Go to Profile — verify "Fires this week" shows the count
4. Complete a new run — verify the KAD breakdown shows a "Social (1.02x)" row (if you had 1-5 fires)
5. Verify the total KAD earned reflects the social multiplier

---

### Phase 2 — Developer Handoff

**What was built on top of Phase 1:**
- Fire interactions fully persisted in localStorage (already scaffolded in Phase 1 via `fireRun`/`hasFired` — verified working: `fireCount` increments on `SharedRun`, `kadence_fires` tracks one-per-user, state survives refresh)
- Profile screen shows "Fires this week" card with flame icon, below the streak card
- KAD formula is now: `baseKAD * streak * boost * underdog * social` (line ~136 in `page.tsx`)
- PostRun KAD breakdown shows "Social (1.0x)" row when `socialMult > 1`, between Underdog and Total
- Breakdown math chain: `afterStreak → afterBoost → afterUnderdog → socialContrib`, each layer multiplicative

**Current multiplier stack:**
| Multiplier | Source | Range |
|---|---|---|
| Streak | `useStreak()` → `multiplier` | 1.0 - 2.0 |
| Boost | `getActiveBoost()` → `boost.multiplier` | 1.0 - 2.0 |
| Underdog | Race position >= 4 | 1.0 or 1.2 |
| **Social** | `useSocialFeed()` → `socialMultiplier` | 1.0 - 1.08 |

**RunSnapshot type now includes:** `socialMultiplier: number` (in both `page.tsx` and `post-run-screen.tsx`)

**Files modified in Phase 2:**

| File | What changed |
|---|---|
| `app/page.tsx` | Added `socialMultiplier` to `RunSnapshot` type; `socialMult` factor in KAD formula; passed to both snapshot paths (success + error fallback where it defaults to 1) |
| `app/components/post-run-screen.tsx` | Added `socialMultiplier` to local `RunSnapshot` type; destructured as `socialMult`; updated `hasMultipliers` check; added `afterUnderdog`/`socialContrib` math; social row in breakdown |
| `app/components/profile-screen.tsx` | Imported `useSocialFeed`; reads `kad_community_joined` from localStorage; added "Fires this week" card with `KIcon name="flame"` after streak section; muted when 0 |

**What's NOT done yet:** Public profile route (Phase 3), Run card PNG + tweet (Phase 4). These are independent of each other — can be built in parallel.

### Phase 2 — Verification

1. `npm run dev`
2. Enable demo mode (3× tap on logo)
3. Join a community, navigate to community feed — fire some runs
4. Go to Profile — verify "X fires this week" card appears below streak with flame icon
5. Complete a new run — if you had 1+ fires, verify the KAD breakdown shows a "Social (1.02x)" row
6. Verify total KAD earned reflects the social multiplier (compare against base × streak × boost × underdog × social)

---

## Phase 3 — Public Profile URL

### Prerequisites
Phase 1 must be complete (you need the social feed data). Phase 2 is NOT required.

### What to build

A public-facing profile page at `/u/[slug]` — the first file-based route outside the SPA. No login required to view. Dark editorial design, shareable as a link.

**Key limitation:** No backend exists. The page reads from localStorage, which is browser-local. This means:
- Visiting your own profile URL → shows your real data
- Visiting anyone else's URL → shows demo/placeholder data
- Detection: compare slug against stored `kadence_profile_name` or wallet address

### 3A. Create route: `app/u/[slug]/page.tsx`

Must be a client component (`"use client"`) since it needs localStorage access.

**Structure:**
```tsx
"use client";

import { useParams } from "next/navigation";
// Import hooks: useRunHistory, useStreak, useBadges, useXP, useKadBalance, useSocialFeed, useCommunity
// Import primitives: KIcon

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  // Detect if this is the current user's profile
  // If yes: use real hook data
  // If no: use demo/placeholder data
}
```

**Slug matching logic:**
```ts
const profileName = localStorage.getItem("kadence_profile_name") || "";
const slugFromName = profileName.toLowerCase().replace(/\s+/g, "-");
const walletAddr = /* from useWallet context */;
const isOwnProfile = slug === slugFromName || slug === walletAddr;
```

### 3B. Page layout

Full dark editorial page — standalone, no SPA navigation chrome. Structure:

1. **Header:** "KADENCE" wordmark top-left, small Solana logo top-right
2. **Hero section:** Radial gradient background (same style as PostRun hero). Large avatar (64px) + profile name + abbreviated wallet address (`Au1S...x4Kp`)
3. **KAD balance:** Large lime number, same style as PostRun KAD display
4. **Lifetime stats grid** (3 columns): Total runs, Total distance, Total time
5. **Streak card:** Current streak count + weekly multiplier badge + 7-day progress dots
6. **Community badge:** Pill showing "Road Starters" etc. with type icon
7. **Badges grid:** 2x4 grid of 8 badges, earned ones highlighted in lime, locked ones dimmed
8. **Recent shared runs:** Last 5 shared runs from `useSocialFeed`, each showing distance/pace/KAD + fire count. No fire interaction (view-only on public page)
9. **Footer:** "Built on Solana" + Kadence branding

**For non-own profiles** (demo data): Generate plausible stats (10-50 runs, 50-300km, streak 2-8, level 3-7) using a seed derived from the slug string. Show demo badges (first 3-4 unlocked). Show demo shared runs.

### 3C. Copy profile link on existing profile screen

**File:** `app/components/profile-screen.tsx`

The existing profile screen has a share icon button (line ~259) that copies the wallet address. Change or augment this to copy the profile URL instead:
```ts
const slug = (profileName || "").toLowerCase().replace(/\s+/g, "-") || address?.toString() || "";
const profileUrl = `${window.location.origin}/u/${slug}`;
navigator.clipboard.writeText(profileUrl);
```

Show a toast: "Profile link copied!"

### 3D. Root layout compatibility

Verify that `/app/layout.tsx` wraps everything with the Providers component (wallet context, Solana client). The new route at `/app/u/[slug]/page.tsx` inherits this layout, so wallet context and the design system (fonts, CSS vars) are available.

### Verification

1. Set a profile name in the existing profile screen
2. Navigate to `/u/your-profile-name` in the browser
3. Verify the page shows your real KAD balance, stats, badges, shared runs
4. Navigate to `/u/some-random-slug` — verify it shows demo data
5. On the profile screen, tap the share button — verify the URL is copied to clipboard
6. Open the copied URL in a new tab — verify the public profile loads

---

### Phase 3 — Developer Handoff

**What was built:**
- `app/u/[slug]/page.tsx` — public profile page, client component (~320 lines)
- Profile screen share button (`copyAddress` → `copyProfileLink`) now copies `/u/{slug}` URL with toast "Profile link copied!"

**Route structure:**
- `/` — main SPA (all existing views via client-side state)
- `/u/[slug]` — public profile (new, standalone, dynamic route)

**Slug format:** Lowercase profile name with spaces→hyphens, or full wallet address. Derived at runtime from `kadence_profile_name` or wallet address.

**Architecture:**
- `PublicProfilePage` (entry) — detects own vs other profile via slug matching against `kadence_profile_name` / wallet address
- `OwnProfile` — uses real hooks: `useRunHistory`, `useStreak`, `useBadges`, `useXP`, `useKadBalance`, `useSocialFeed`
- `DemoProfile` — uses `buildDemoProfile(slug)` with seeded random for deterministic fake data (10-50 runs, 50-300km, streak 2-8, level 3-7, 3-4 badges earned, 5 recent runs)
- Both render through shared `ProfileLayout` component

**Layout sections:** Header (KADENCE wordmark + Solana mark) → Hero (avatar + name + wallet abbrev) → KAD balance (lime) → Stats grid (3-col: runs/km/time) → Streak + Level (2-col) → Community badge pill → Badges grid (4-col, 8 badges) → Recent runs (last 5 shared, view-only fire count) → Footer

**Files modified in Phase 3:**

| File | What changed |
|---|---|
| `app/u/[slug]/page.tsx` | New — full public profile page |
| `app/components/profile-screen.tsx` | `copyAddress` → `copyProfileLink`, copies `/u/{slug}` URL |

**What's NOT done yet:** Run card PNG generation and tweet sharing (Phase 4). This is independent — start anytime.

### Phase 3 — Verification

1. `npm run dev`
2. Set a profile name in the existing profile screen (e.g. "Alex Runner")
3. Navigate to `/u/alex-runner` in browser — verify it shows your real KAD balance, stats, badges, shared runs
4. Navigate to `/u/some-random-slug` — verify it shows deterministic demo data
5. On the profile screen, tap the share/copy button next to wallet address — verify toast says "Profile link copied!"
6. Open the copied URL in a new tab — verify the public profile loads correctly

---

## Phase 4 — Run Card PNG + Tweet Template

### Prerequisites
Phase 1 must be complete (the share flow exists on PostRun). Phases 2 and 3 are NOT required.

### What to build

1. A Canvas API-based PNG generator for shareable run cards
2. Two variants: standard run card + flash run card
3. Download button on the PostRun share flow
4. Pre-filled tweet with Twitter intent URL

### 4A. PNG generator: `app/lib/run-card-png.ts`

Pure Canvas API — no external dependencies. Single exported function:

```ts
export type RunCardParams = {
  distanceKm: number;
  durationFormatted: string;    // "23:45" or "1:02:30"
  paceFormatted: string;        // "5:12"
  kadEarned: number;
  routeCoords: LatLon[];
  txSignature: string | null;
  runnerName: string;
  rarity: { stars: number; label: string };
  // Flash run variant (optional)
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

export async function generateRunCardPNG(params: RunCardParams): Promise<Blob>;
```

**Canvas dimensions:** 1080 x 1350 (4:5 ratio, ideal for Instagram/Twitter)

**Standard card layout:**
```
+------------------------------------------+
|  [dot] KADENCE                           |  <- top bar, 11px uppercase
|                                          |
|                                          |
|         [route polyline drawing]         |  <- GPS coords normalized to canvas
|         drawn in #E0F479, 3px stroke     |     with padding, on #0D0D0D bg
|                                          |
|                                          |
|         7.42 km                          |  <- large, 72px, white
|         5:12 /km                         |  <- 36px, muted white
|                                          |
|         12.50 KAD                        |  <- 48px, #E0F479
|                                          |
|  [runner name]     [5 rarity stars]      |
|                                          |
|  solana explorer: solscan.io/tx/...      |  <- 14px, very muted, bottom
+------------------------------------------+
```

**Route polyline rendering:**
1. Find min/max lat and lon from `routeCoords`
2. Normalize to a bounding box (e.g., 200px padding on each side of a 1080x600 area)
3. Draw with `ctx.strokeStyle = "#E0F479"`, `ctx.lineWidth = 3`, `ctx.lineCap = "round"`, `ctx.lineJoin = "round"`
4. Add a subtle glow: draw again with `ctx.shadowColor = "rgba(224,244,121,0.4)"`, `ctx.shadowBlur = 12`

**Flash run variant** (when `flashRunEventName` is present):
- Add event name at top: e.g., "TEMPO TUESDAY" in uppercase, 24px
- Add position badge in center: "#12 / 47" or for top 3, a larger treatment
- Top 3 colors: 1st = #FFD700 (gold), 2nd = #C0C0C0 (silver), 3rd = #CD7F32 (bronze)
- Position number displayed large (64px) with medal color, inside a subtle circle

**Font loading:** Canvas doesn't have access to CSS fonts. Use `ctx.font = "700 72px 'DM Sans', sans-serif"`. Load the font via `document.fonts.ready` before drawing. The font is already loaded by the page via `next/font/google` in layout.tsx.

**Export:**
```ts
return new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Failed to generate PNG"));
  }, "image/png");
});
```

### 4B. Share flow expansion in PostRun screen

**File:** `app/components/post-run-screen.tsx`

After the user taps "Share Run" (Phase 1's button), expand the bottom section:

**New props needed:**
```ts
type Props = {
  // ...existing + Phase 1 props
  routeCoords?: LatLon[];       // for PNG generation
  runnerName?: string;          // for PNG + tweet
  profileSlug?: string;         // for tweet link
};
```

**Flow after sharing:**
1. Show "Generating card..." briefly while PNG is created
2. Replace the Share button area with:
   - "Shared to [Community]" confirmation (green check)
   - "Download Run Card" button (secondary style, download icon)
   - "Share on X" button (secondary style, with X/Twitter styling)
   - "Back to home" link

**Download handler:**
```ts
const handleDownload = async () => {
  const blob = await generateRunCardPNG({ ... });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kadence-run-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### 4C. Tweet template

**Format:**
```
Just ran [distance]km at [pace]/km and earned [KAD] $KAD on @kadenceRun 🔥 [profile URL]
```

**Implementation:**
```ts
const tweetText = `Just ran ${distKm.toFixed(2)}km at ${paceFormatted}/km and earned ${kadEarned.toFixed(2)} $KAD on @kadenceRun 🔥`;
const profileUrl = `${window.location.origin}/u/${profileSlug}`;
const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(profileUrl)}`;
window.open(intentUrl, "_blank");
```

### 4D. Wire in `page.tsx`

Pass additional data to PostRunScreen that's needed for PNG + tweet:
- `routeCoords` from the run snapshot (already available in `handleEnd` via `snapshot.routeCoords`)
- `runnerName` from `localStorage.getItem("kadence_profile_name")`
- `profileSlug` derived from profile name or wallet address

The `RunSnapshot` extended type in `page.tsx` already has `routeCoords` — just pass it through to PostRunScreen.

### Verification

1. Complete a run, arrive at PostRun screen
2. Tap "Share Run" — verify confirmation appears
3. Tap "Download Run Card" — verify a PNG downloads
4. Open the PNG — verify it shows the route, stats, KAD, Kadence branding
5. For a flash run: verify the card includes event name and position
6. Tap "Share on X" — verify Twitter opens with the pre-filled tweet and profile URL
7. Verify the profile URL in the tweet actually works (Phase 3 must be done for this)

---

### Phase 4 — Developer Handoff ✅ COMPLETE

**What was built:**
- `app/lib/run-card-png.ts` — Canvas API PNG generator (1080x1350 4:5 ratio), two variants (standard + flash run with medal badge)
- PostRun share flow expanded: after tapping "Share Run", the button area expands to show "Shared to [Community]" confirmation + "Run Card" download button + "Share on X" tweet button
- Tweet template generates Twitter intent URL with run stats, $KAD tag, @kadenceRun mention, and profile link
- Added `download` icon to `KIcon` primitives

**PNG card features:**
- Route polyline rendered from GPS coords with lime stroke + glow effect, start/end dots
- Standard card: KADENCE branding, route, distance (72px), pace, duration, KAD earned (lime), runner name, rarity stars, Solana explorer link
- Flash run variant: event name banner, position medal badge (#1 gold, #2 silver, #3 bronze), circle treatment for top 3

**Files modified in Phase 4:**

| File | What changed |
|---|---|
| `app/lib/run-card-png.ts` | New — Canvas API PNG generator with `generateRunCardPNG()` |
| `app/components/post-run-screen.tsx` | Added `routeCoords`, `runnerName`, `profileSlug`, `txSignature`, `flashRunEventName/Position/TotalRunners` props; `handleDownload` + `handleTweet` handlers; expanded share flow UI with download + tweet buttons |
| `app/page.tsx` | Passes `routeCoords`, `runnerName`, `profileSlug`, `txSignature`, flash run fields to PostRunScreen |
| `app/components/ui/primitives.tsx` | Added `download` icon path to PATHS |

**File inventory (all phases combined):**

| File | Status | Phase |
|---|---|---|
| `app/lib/hooks/use-social-feed.ts` | New | 1 |
| `app/lib/run-card-png.ts` | New | 4 |
| `app/u/[slug]/page.tsx` | New | 3 |
| `app/components/post-run-screen.tsx` | Modified | 1, 2, 4 |
| `app/page.tsx` | Modified | 1, 2, 4 |
| `app/components/community-screen.tsx` | Modified | 1 |
| `app/components/profile-screen.tsx` | Modified | 2, 3 |
| `app/components/ui/primitives.tsx` | Modified | 4 |

**localStorage keys added:**
- `kadence_shared_runs` — SharedRun[]
- `kadence_fires` — Record<string, boolean>

**New route added:** `/u/[slug]` — public profile page

**Social multiplier integrated into:** `page.tsx` line 130 (KAD formula), `post-run-screen.tsx` (breakdown display)

**All 4 phases are now complete.** The social layer is fully implemented: feed + share (P1), fires + social multiplier (P2), public profile (P3), run card PNG + tweet (P4).
