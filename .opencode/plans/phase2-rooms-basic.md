# Phase 2a — Basic Room Lifecycle (rooms → lobby → start → board)

Goal: make the real flow work end-to-end **before** the full game engine. Create/list/join/leave
rooms, live lobby updates, host-only start, and a real deal (8 cards / seeded pile / first turn)
so the new `Game.tsx` board renders real `PlayerView` data. `game:action` remains
`NOT_IMPLEMENTED` (play/draw/choose-color land with the engine phase).

User decisions: start may be allowed with **1 player** (solo preview); `game:start` does a
**real deal** (no actions). Deal size 8, 110-card base deck, one card seeds the pile, random
first turn, direction `1` — per `docs/game/rules.md` §1.

---

## 1. `@bruno/shared` — contract updates

`packages/shared/src/events/schemas.ts`:

- `CreateRoomPayloadSchema`: `{ name: string.trim.min(1).max(48), playerId: string.min(1), playerName: string.trim.min(1), maxPlayers: z.number().int().min(2).max(8).default(8) }`
- `JoinRoomPayloadSchema`: `{ gameId: string.min(1), playerId: string.min(1), playerName: string.trim.min(1) }`
- `LeaveRoomSchema`: `{ gameId: string.min(1), playerId: string.min(1) }`
- `StartGameSchema`: `{ gameId: string.min(1) }`
- `GetGameStateSchema`: `{ gameId: string.min(1), playerId: string.min(1) }`
- `RoomSummarySchema`: add `maxPlayers: z.number().int().min(2).max(8)`.
- `RoomCreateReturnSchema`: discriminated union on `ok`:
  - `{ ok: true, gameId, name }`
  - `{ ok: false, message }`
- Export the new types (`CreateRoomPayload`, `JoinRoomPayload`, `RoomCreateReturn`, …).

`packages/shared/src/events/contract.ts`:

- `rooms:create` payload → `CreateRoomPayload`.
- `lobby:join` payload → `JoinRoomPayload`.
- Add S→C `"rooms:create:return": (payload: RoomCreateReturn) => void`.
- Keep the rest unchanged.

## 2. `@bruno/server` — game modules (pure TS, no socket imports)

New `packages/server/src/game/`:

- `deck.ts` — `buildDeck(rng)`: `buildBaseDeck(DEFAULT_DECK_COMPOSITION)` from `@bruno/shared`,
  shuffled with an injectable RNG (default `Math.random`). `Pile`-style helpers:
  `seedPile(deck)`, `deal(deck, players, count)`.
- `room.ts` — `Room` model: `id` (crypto random hex), `name`, `hostId`, `maxPlayers`,
  `status: "prepping" | "ongoing"`, `players: Player[]`, `deck: Card[]`, `pile: Card[]`,
  `currentTurnIndex`, `currentDirection: 1`, `currentColor` (reserved). `Player`:
  `{ id, name, isHost, hand: Card[] }`.
- `room-manager.ts` — `RoomManager` (backed by `Map<string, Room>`):
  - `createRoom({ name, playerId, playerName, maxPlayers }) → Room` (host auto-joins).
  - `listRooms() → RoomSummary[]` — only `status: "prepping"` rooms, never the player arrays.
  - `joinRoom(gameId, { playerId, playerName }) → { ok } | { error: "ROOM_NOT_FOUND" | "ROOM_FULL" | "ALREADY_IN_ROOM" | "GAME_STARTED" }`.
  - `leaveRoom(gameId, playerId) → { ok } | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" }`; if the
    leaving player was host, promote the next player (or delete the room when empty).
  - `getRoom(gameId)`, `getLobbyPlayers(gameId) → LobbyPlayer[]`.
  - `startGame(gameId, playerId) → { ok } | { error: "ROOM_NOT_FOUND" | "NOT_HOST" | "NO_PLAYERS" }`
    — host-only; deals 8 each from the shuffled deck, seeds the pile, picks a random first turn.
  - `getPlayerView(gameId, playerId) → { ok, view } | { error }` — derives a per-player view.
- `player-view.ts` — `toLobbyPlayers(room)`, `toPlayerView(room, playerId)` using `CardView`
  (`{ id, type, color?, number?, image? }`). **Never** includes other players' hands or the pile
  beyond `pileTop`.

## 3. `@bruno/server` — socket adapter

`packages/server/src/sockets/index.ts`:

- Track `socket.data = { playerId?, roomId? }` on create/join.
- Room scoping: `socket.join(roomId)` / `socket.leave(roomId)`; broadcasts via `io.to(roomId)`.
- `rooms:list` → Zod-validate nothing, emit `rooms:list:return` from manager.
- `rooms:create` → validate with `CreateRoomPayloadSchema`; create room; `socket.join`;
  emit `rooms:create:return { ok: true, gameId, name }`; broadcast fresh `rooms:list:return` to all.
- `lobby:join` → validate; `joinRoom`; on ok `socket.join(roomId)` + `io.to(roomId).emit("lobby:update", players)`;
  on error emit `error` envelope.
- `lobby:leave` → validate; `leaveRoom`; `socket.leave`; broadcast `lobby:update` to the room +
  `rooms:list:return` to all; emit nothing extra (client navigates itself). If the room was deleted,
  `lobby:update` is skipped.
- `game:start` → validate; host-only `startGame`; on ok emit `game:start:return { ok, gameId }` +
  `game:log` ("Host started the game", "It's X's turn…") + `game:turn` to the room. Each client
  then requests its own state on mount (Game.tsx already does `game:state:get`).
- `game:state:get` → validate; `getPlayerView`; emit `game:state` (per-player hand, no leak);
  on error emit `error` envelope.
- `game:action` → keep Zod validation; still emit `NOT_IMPLEMENTED` error (engine phase).
- `disconnect` → if `socket.data.roomId && playerId`, auto-`leaveRoom`, broadcast `lobby:update`
  to the room and `rooms:list:return` to all (fixes the legacy dead `client_disconnect` listener).
- Export typed error codes as constants so sockets and manager agree.

## 4. `@bruno/client` — wiring

- `pages/Rooms.tsx`:
  - `rooms:create` now sends `{ name, playerId: identity.id, playerName: identity.name, maxPlayers }`.
  - Listen for `rooms:create:return`: on `ok` → `goLobby(gameId, name)`; on failure → surface error.
  - Replace hard-coded `MAX_PLAYERS` display with `room.maxPlayers`; `full` status when
    `playerCount >= room.maxPlayers`. Keep 8 as the create-modal default.
- `pages/Lobby.tsx`:
  - Accept a `maxPlayers` prop (via `App.tsx` `goLobby`), render `N / {max}` instead of hard-coded 8.
- `App.tsx` — `goLobby`/`goGame` pass-through of `maxPlayers`; no other changes.
- `pages/Game.tsx`, `Home.tsx`, socket wrapper — unchanged (events already match the contract).

## 5. Tests

Add Vitest to `@bruno/server` devDeps + `"test": "vitest run"` script.

`packages/server/src/game/*.test.ts`:

- `deck.test.ts` — deck has 110 cards; seeded-RNG shuffle is deterministic; two shuffles differ;
  deal of 8×N consumes 8N and leaves a playable deck; pile seeding.
- `room-manager.test.ts` — create→list; join; duplicate join rejected; room-full rejected
  (maxPlayers); leave updates counts; host promotion on leave; non-host start rejected;
  1-player start allowed (solo preview); `toPlayerView` exposes own hand only and `pileTop`
  only (assert no other player's hand in the payload).

Root `package.json` `test` script → `shared && server`.

## 6. Verification

- `npm.cmd run typecheck` (all three packages).
- `npm.cmd test` (shared + new server suites).
- `npm.cmd run format` (Prettier, whole repo — only our files should change).
- Manual: `npm.cmd run dev` → Home (handle) → Rooms → create → auto-enter Lobby; open a second
  tab with a different handle → join → both see live seats; host START → both reach the board
  with real 8-card hands, seeded pile, deck count, turn indicator, and log lines. Leave/disconnect
  updates seats.

## Out of scope (later phases)

- `game:action` play/draw/choose-color, effects, draw stacking, timers, win detection.
- Vault/location/origin/mayhem cards (data already in shared; not dealt this phase).
- Session auth (still client-generated `PID…` ids).
- Serving built client from the server / `GET /` root route.
