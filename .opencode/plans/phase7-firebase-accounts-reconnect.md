# Phase 7 — Firebase Accounts + Resilient Reconnection

Status: **PLANNED** (design only — no code changes yet).

Add real player accounts (Firebase Auth) and make the game survive transient network drops
(graceful seat hold + socket reconnection). Today a disconnect splices the player out of the
game (`RoomManager.leaveRoom`) and the client has only a passive LIVE/OFF dot
(`Game.tsx:405`), so a blip mid-game is a loss.

## Why this is two halves

- **Accounts** are an identity layer: a stable, cross-device player id that outlives the
  browser tab. It also unlocks server-side persistence later (stats, profiles, matchmaking).
- **Reconnection** is a session-resilience layer: keep the seat + hand while the transport is
  down, then restore the socket → seat binding on the wire. It does not strictly require
  accounts, but accounts make it robust (a stable `uid` is the natural seat key, and token
  re-verification lets a _new_ device resume an old seat).

## Scope

### A. Firebase account integration

- **Auth provider**: Firebase Auth (email/password + Google sign-in, plus an **anonymous
  guest** fast-path so the "enter a handle and play" flow still works with one click). Guests
  can later upgrade to a real account and keep their handle.
- **Identity flow**:
  - Today: `useSocket.ts` mints a random `PID…` id in `localStorage` (`bruno_player_info`),
    sent in every room payload as `playerId`.
  - Target: `playerId` becomes the Firebase `uid` for authenticated players, still random
    `PID…` for guests. `uid` is stable across devices, so `game:state:get` after reconnect
    addresses the same seat.
- **Client**:
  - `npm install firebase` in `@bruno/client`; `src/firebase/client.ts` initializes the app
    (config via `import.meta.env.VITE_FIREBASE_*`).
  - `AuthProvider` (React context) around the app exposing
    `{ user, guest, loading, signInEmail, signInGoogle, signUpEmail, signOut, upgradeGuest }`.
  - New `src/pages/Auth.tsx` screen (or an auth panel on Home): email/password + Google
    buttons, guest mode default. `saveIdentity` keeps writing the anonymous `PID` until a
    real user exists.
  - On auth change: obtain an ID token, attach to the socket (`socket.auth = { token }`),
    and store `{ uid, name }` in `bruno_player_info` so the handle pre-fills.
- **Server**:
  - `npm install firebase-admin` in `@bruno/server`; `src/firebase/admin.ts` initializes
    with service-account env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
    `FIREBASE_PRIVATE_KEY`).
  - Socket middleware in `sockets/index.ts`: if `socket.auth.token` is present, verify via
    `admin.auth().verifyIdToken(token)` → set `socket.data.uid = uid`. Guests (no token) pass
    through unchanged. Never trust a client-sent `playerId` for authenticated users — derive
    it from the verified `uid` (map `uid` → the room's seat).
  - New `AccountGetSchema`-style helper not needed; keep payloads as-is but treat `playerId`
    as authoritative only for guests.
- **Env/docs**:
  - Add `.env.example` (client `VITE_FIREBASE_*`, server `FIREBASE_*`), extend `config.ts`,
    document setup in `docs/development.md` + `docs/architecture/current.md`.
  - CI/smoke: auth is optional at runtime — the game remains fully playable as a guest, so
    existing tests keep passing without Firebase credentials.

### B. Reconnection once disconnected

- **Seat hold instead of instant leave** (`room-manager.ts` + `sockets/index.ts`):
  - `RoomPlayer` gains `connected: boolean` (default `true`). On `disconnect`, do **not**
    splice the player out. Mark `connected = false`, cancel their prompt, keep the hand,
    keep the seat, and start a **grace timer** (default 60s, `TURN_DURATION_MS`-agnostic).
  - Grace expiry → today's behavior: `leaveRoom` (drop the seat, host handover, re-arm turn).
  - While disconnected and it is their turn: **pause the turn timer** (freeze `turnDeadline`)
    so the game does not silently auto-draw them mid-reconnect; on rejoin, resume the same
    window. If they never come back, grace expiry triggers the existing leave logic.
- **Rejoin on the wire**:
  - New `game:rejoin { gameId, playerId }` (client→server). Handler re-binds the socket to
    the seat (`socket.join`, `addToRoom`, `data.playerId/roomId`), sets `connected = true`,
    cancels the grace timer, then answers with the current per-player `game:state` (same view
    as `game:state:get`). Reuses `leaveRoom`-style bookkeeping but only the join half.
  - `game:state:get` already exists and stays the fallback for full reloads.
- **Client** (`useSocket.ts` + `Game.tsx`):
  - socket.io reconnection options: `reconnectionAttempts: Infinity`, `reconnectionDelay:
500`, `reconnectionDelayMax: 3000`; `socket.auth` carries the ID token so the server can
    re-verify on each handshake.
  - `useSocket` surfaces `{ connected, reconnecting }` (listen to `disconnect`, `reconnect_attempt`,
    `reconnect`). While in a game screen, on `reconnect` re-emit `game:rejoin` with the
    current `roomId`/`playerId`; refetch full state via `game:state:get` on any reload.
  - `Game.tsx`: replace the bare LIVE/OFF dot with a **reconnect overlay** — "Reconnecting…
    keep your seat (N s grace left)" with a live dot; hide when `connected`. On grace expiry
    the server drops the seat and the next `error`/state push routes to Lobby (existing
    `onError` handling).
  - `App.tsx`: don't reset to Home on a transient disconnect — only on explicit leave/error.

## Decisions resolved (proposed)

- **Grace duration**: 60s, configurable via `config.ts` (`RECONNECT_GRACE_MS`). Matches
  "short network blip" recovery without stalling a table indefinitely.
- **Turn behavior while away**: pause the turn deadline for the disconnected seat, resume on
  rejoin. Rationale: auto-draw/skip on a 5s blip is worse than a brief hold; the grace timer
  bounds the stall.
- **Prompts while away**: an open `pendingWild`/`pendingVault`/`pendingTargets` for the
  disconnected actor is cancelled on disconnect (their action was in-flight) and auto-resolved
  as today.
- **Guest = anonymous auth**: guests sign in anonymously (uid-scoped, upgradeable) rather than
  remaining unauthenticated `PID` strangers — one code path for seat keys.
- **playerId semantics**: for verified users `playerId` in payloads is ignored on the server
  (authoritative uid); for guests it is still accepted. Documented in the socket contract.

## Contract changes (`@bruno/shared`)

- `events/contract.ts`: C→S `"game:rejoin": (payload: { gameId: string; playerId: string }) => void`.
- `events/schemas.ts`: `RejoinRoomSchema` (`gameId`, `playerId`).
- `game/state.ts`: `PlayerView` gains `reconnectGraceMs?: number` (remaining grace, or the
  client keeps its own countdown from the disconnect moment — pick one in implementation).

## Server wiring

- `room.ts`: `RoomPlayer.connected: boolean`; `Room.reconnectGrace?: { until: number }`.
- `room-manager.ts`: `disconnectPlayer(gameId, playerId)` (mark + grace timer, pause turn
  deadline) and `rejoinPlayer(gameId, playerId)` (restore `connected`, resume deadline,
  cancel grace); `leaveRoom` unchanged for grace expiry. `scheduleTurn`/`turnDeadline`
  already exist (UX batch) and only need the "paused" carve-out.
- `turn-manager.ts`: expose `pauseTurn`/`resumeTurn` (or model via a `pausedUntil` offset so
  the deadline survives the gap).
- `sockets/index.ts`: disconnect handler → `disconnectPlayer` instead of `leaveRoom`;
  `game:rejoin` handler; socket middleware for token verification.

## Client wiring

- `useSocket.ts`: reconnect options + `reconnecting` state + `rejoin(roomId, playerId)` helper.
- `Game.tsx`: reconnect overlay, rejoin on `reconnect`, keep screen on transient drops.
- `App.tsx`/`Home.tsx`: `AuthProvider` mount; auth panel on Home; keep PLAY working as guest.
- `changelog.ts`: add a `0.1.1` entry ("Accounts + reconnection") so the updates panel
  announces the change (the cookie-like validation from the UX batch gates it).

## Firebase setup (once, by the operator)

1. Create a Firebase project; enable **Authentication** (Email/Password + Google).
2. Register a web app → copy `VITE_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/…` to `.env`.
3. Create a service account (IAM → Service accounts → Generate key) → put
   `FIREBASE_*` in server env (or `GOOGLE_APPLICATION_CREDENTIALS`).
4. Document in `docs/development.md`.

## Verification

- **Accounts**: manual — guest play works with no env; email/Google sign-in reaches a game;
  sign-out returns to Home; handle persists across reloads.
- **Reconnection**: integration test — create/start a room, force a socket disconnect
  (client `disconnect()`), assert the seat + hand survive and `PlayerView.connected === false`,
  re-emit `game:rejoin`, assert state returns and turn timer resumes; grace expiry test
  asserts the seat is dropped after `RECONNECT_GRACE_MS`.
- **Regression**: `npm.cmd run typecheck`, `npm.cmd test` (all existing suite incl. the 235
  server tests — reconnection must not change non-disconnect paths), `npm.cmd run build`,
  `npm.cmd run format`.

## Rollout

1. **B1a** reconnection groundwork (room/manager/turn/tests) — shippable standalone, no Firebase.
2. **B1b** client reconnect overlay + rejoin + integration tests.
3. **B2a** Firebase Auth (client + server middleware + docs).
4. **B2b** guest = anonymous upgrade path + auth UI + changelog entry.
