# Phase 7 — Firebase Accounts + Resilient Reconnection

Status: **PLANNED** (design only — no code changes yet).

Add real player accounts (Firebase Auth with Google Sign-In) and make the game survive transient
network drops (graceful seat hold + socket reconnection). Today a disconnect splices the player
out of the game (`RoomManager.leaveRoom`) and the client has only a passive LIVE/OFF dot
(`Game.tsx:405`), so a blip mid-game is a loss.

## Why this is two halves

- **Accounts** are an identity layer: a stable, cross-device player id that outlives the browser
  tab. It also unlocks server-side persistence later (stats, profiles, matchmaking).
- **Reconnection** is a session-resilience layer: keep the seat + hand while the transport is
  down, then restore the socket → seat binding on the wire. It does not strictly require
  accounts, but accounts make it robust (a stable `uid` is the natural seat key, and token
  re-verification lets a _new_ device resume an old seat).

## Scope

### A. Firebase account integration + Google Sign-In

- **Auth providers**: Firebase Auth with **Google Sign-In** (primary) + **anonymous guest**
  fast-path so the "enter a handle and play" flow still works with one click. Guests can later
  upgrade to a real account and keep their handle.
- **Identity flow**:
  - Today: `useSocket.ts` mints a random `PID…` id in `localStorage` (`bruno_player_info`),
    sent in every room payload as `playerId`.
  - Target: `playerId` becomes the Firebase `uid` for authenticated players, still random
    `PID…` for guests. `uid` is stable across devices, so `game:state:get` after reconnect
    addresses the same seat.
- **Firebase project setup** (once, by the operator):
  1. Create a Firebase project at <https://console.firebase.google.com>.
  2. Enable **Authentication** → **Sign-in method** → **Google** (enable it, set the support
     email to the project default).
  3. Register a **web app** → copy config (`apiKey`, `authDomain`, `projectId`, etc.) → put
     in `.env` as `VITE_FIREBASE_*` vars.
  4. Create a **service account** (Project Settings → Service accounts → Generate new private
     key) → put `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in server
     env vars.
  5. In the Google Cloud Console, add the Vite dev origin (`http://localhost:5173`) and the
     production origin to the OAuth consent screen's authorized JavaScript origins.
- **Client** (`@bruno/client`):
  - `npm install firebase` — initialize in `src/firebase/client.ts` with
    `import.meta.env.VITE_FIREBASE_*` vars.
  - `AuthProvider` (React context) around the app exposing:
    ```ts
    interface AuthContextValue {
      user: FirebaseUser | null;     // null = not authenticated
      guest: boolean;                 // true = anonymous/guest session
      loading: boolean;               // true = Firebase still initializing
      signInGoogle: () => Promise<void>;   // popup-based Google sign-in
      signInGuest: () => Promise<void>;    // anonymous sign-in → sets guest=true
      signOut: () => Promise<void>;
      upgradeGuest: () => Promise<void>;   // link anonymous → Google (keeps handle)
    }
    ```
  - New `src/pages/Auth.tsx` screen:
    - **Google Sign-In** button (primary CTA, styled like the PLAY button).
    - **"Play as Guest"** button (secondary, anonymous auth — mints a `uid` but no profile).
    - On auth success: obtain an ID token (`user.getIdToken()`), attach to the socket via
      `socket.auth = { token }`, store `{ uid, displayName }` in `bruno_player_info` so the
      handle pre-fills.
  - On the **Home page**, replace the manual handle input with an auth-aware flow:
    - If `user` (Google signed in): show their display name as the handle, auto-allow PLAY.
    - If `guest`: show the guest handle (e.g., `Guest-xxxx`), allow PLAY.
    - If `loading`: show a spinner.
    - Add a small **"Sign in"** / **"Sign out"** link depending on state.
- **Server** (`@bruno/server`):
  - `npm install firebase-admin` — initialize in `src/firebase/admin.ts` with service-account
    env vars. Graceful degradation: if env vars are missing, skip admin init and treat all
    players as guests (game remains fully playable without Firebase).
  - Socket middleware in `sockets/index.ts`:
    - On `connection`, if `socket.auth.token` is present, verify via
      `admin.auth().verifyIdToken(token)` → set `socket.data.uid = decoded.uid`.
    - Guests (no token) pass through unchanged.
    - Never trust a client-sent `playerId` for authenticated users — derive it from the
      verified `uid` (map `uid` → the room's seat). For room joins/creates, use `uid` as the
      authoritative `playerId`.
  - No new endpoints needed — existing room/game payloads work as-is; just swap `playerId`
    from random `PID…` to `uid` for authenticated users.

### B. Reconnection once disconnected

- **Seat hold instead of instant leave** (`room-manager.ts` + `sockets/index.ts`):
  - `RoomPlayer` gains `connected: boolean` (default `true`). On `disconnect`, do **not**
    splice the player out. Mark `connected = false`, cancel their prompt, keep the hand,
    keep the seat, and start a **grace timer** (default 60s, configurable via
    `RECONNECT_GRACE_MS`).
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
  - `useSocket` surfaces `{ connected, reconnecting }` (listen to `disconnect`,
    `reconnect_attempt`, `reconnect`). While in a game screen, on `reconnect` re-emit
    `game:rejoin` with the current `roomId`/`playerId`; refetch full state via
    `game:state:get` on any reload.
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
- **Google Sign-In flow**: popup-based (`signInWithPopup`) rather than redirect — keeps the
  SPA state intact, no need to re-establish the socket after the auth roundtrip.

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

## Env setup

**Client `.env.example`:**
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**Server `.env.example`:**
```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

If none of the `FIREBASE_*` server vars are set, the server skips Firebase Admin SDK init and
all players are treated as guests (random `PID…` ids). The game is fully playable without any
Firebase configuration.

## Verification

- **Accounts**: manual — guest play works with no env; Google sign-in reaches a game;
  sign-out returns to Home; handle persists across reloads.
- **Reconnection**: integration test — create/start a room, force a socket disconnect
  (client `disconnect()`), assert the seat + hand survive and `PlayerView.connected === false`,
  re-emit `game:rejoin`, assert state returns and turn timer resumes; grace expiry test
  asserts the seat is dropped after `RECONNECT_GRACE_MS`.
- **Regression**: `npm run typecheck`, `npm test` (all existing suite — reconnection must not
  change non-disconnect paths), `npm run build`, `npm run format`.

## Rollout

1. **B1a** reconnection groundwork (room/manager/turn/tests) — shippable standalone, no Firebase.
2. **B1b** client reconnect overlay + rejoin + integration tests.
3. **B2a** Firebase Auth (client + server middleware + docs).
4. **B2b** Google Sign-In UI + guest upgrade path + changelog entry.
