# Phase 8 — Profile Editor + Rank System

## Scope

### A. Firestore profile storage (schema)
- Use **Firestore** (not Storage — Storage is for files, Firestore is for structured data).
- Collection: `profiles/{uid}`
- Document schema:
```ts
interface PlayerProfile {
  uid: string;           // Firebase auth uid (primary key)
  username: string;      // display name / handle
  icon: string;          // emoji, default "🎮"
  wins: number;          // total wins, default 0
  points: number;        // rank points, default 0
  gamesPlayed: number;   // total games, default 0
  vaultCardsUsed: number;// total vault cards used across all games, default 0
  createdAt: number;     // epoch ms
  updatedAt: number;     // epoch ms
}
```

### B. Rank system
**Tiers** (15 tiers + Bruno):
| Rank | Tiers | Point Range |
|------|-------|------------|
| 🥉 Bronze | 3, 2, 1 | 0–49, 50–99, 100–149 |
| 🥈 Silver | 3, 2, 1 | 150–199, 200–249, 250–299 |
| 🥇 Gold | 3, 2, 1 | 300–349, 350–399, 400–449 |
| 💎 Platinum | 3, 2, 1 | 450–499, 500–549, 550–599 |
| 💠 Diamond | 3, 2, 1 | 600–649, 650–699, 700–749 |
| 👑 Bruno | — | 750+ |

**Point calculation** (on game end):
- **Winner**: +5 base + (+1 per vault card used during the game), max +10
- **Losers**: 
  - Least cards remaining among losers: +3
  - Most cards remaining among losers: −5
  - Others: 0 (no change)

**Rank display format**: `{icon} {RankName} {Tier} ({points} pts)` — e.g., "🥇 Gold 2 (375 pts)"

### C. Profile modal
- **Trigger**: Replace LIVE/OFF dot in Game.tsx header with a profile button
- **Content** (read-only view of current player's profile):
  - Large icon emoji
  - Username
  - Gmail (from Firebase auth, read-only)
  - Rank badge + tier + points
  - Win count
  - Games played
- **Edit mode** (toggleable):
  - Change icon (emoji picker — preset grid of 30+ emojis)
  - Change username (text input)
  - Save button → writes to Firestore

### D. Rooms page — profile button
- Add a profile button/icon in the Rooms page header
- Opens the same profile modal

### E. Game screen — rank display on player seats
- Each player's seat card shows their rank icon + tier (fetched from Firestore)
- Falls back to no rank display if profile doesn't exist yet (guest or new user)

### F. Server-side: game end point scoring
- When `game:ended` fires, calculate points for all authenticated players
- Update their Firestore profiles atomically
- Guests (no uid) are skipped

## Technical approach

### Client (`@bruno/client`)
- `npm install firebase/firestore` (already have firebase installed)
- `src/firebase/firestore.ts` — Firestore init, profile CRUD functions
- `src/firebase/ProfileModal.tsx` — the modal component
- `src/firebase/ranks.ts` — rank calculation, tier lookup, point calculation
- Update `AuthProvider` to also fetch/create profile on auth change
- Update `Game.tsx` header — replace LIVE/OFF with profile button
- Update `Rooms.tsx` — add profile button
- Update `Seat.tsx` — accept rank props and display them

### Server (`@bruno/server`)
- Add Firestore admin init alongside Firebase Admin Auth
- In `room-manager.ts` `onGameEnd` or wherever `game:ended` is emitted, calculate and write points
- New shared types in `@bruno/shared` for `PlayerProfile`, `RankInfo`

### Contract (`@bruno/shared`)
- Add `PlayerProfile` type
- Add `RankInfo` type (label, icon, tier, minPoints, maxPoints)

## File changes

### New files
- `packages/shared/src/profile/types.ts` — PlayerProfile, RankInfo
- `packages/client/src/firebase/firestore.ts` — getProfile, saveProfile, updatePoints
- `packages/client/src/firebase/ProfileModal.tsx` — profile + edit modal
- `packages/client/src/firebase/ranks.ts` — rank lookup + point calculation
- `packages/server/src/firebase/firestore.ts` — admin Firestore init

### Modified files
- `packages/client/src/firebase/AuthProvider.tsx` — also load/create profile on auth
- `packages/client/src/pages/Game.tsx` — replace LIVE dot with profile button
- `packages/client/src/pages/Rooms.tsx` — add profile button
- `packages/client/src/components/Seat.tsx` — show rank icon + tier
- `packages/server/src/game/room-manager.ts` — point calculation on game end
- `packages/server/src/sockets/index.ts` — emit updated game:ended with point changes

## Rollout
1. Firestore schema + types + rank calculation utility
2. Profile modal + edit + save
3. Profile button in Rooms + Game pages
4. Rank display on player seats
5. Point calculation on game end
6. Testing + polish
