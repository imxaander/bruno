import { z } from "zod";

export const ColorSchema = z.enum(["red", "blue", "green", "yellow"]);
export type ColorValue = z.infer<typeof ColorSchema>;

export const GameActionTypeSchema = z.enum([
  "play",
  "draw",
  "choose-color",
  "vault-choice",
  "choose-targets",
  "choose-cards",
  "investment-draw",
]);

export const GameActionSchema = z.object({
  gameId: z.string().min(1),
  type: GameActionTypeSchema,
  playerId: z.string().min(1),
  cardId: z.string().optional(),
  cardIndex: z.number().int().nonnegative().optional(),
  chosenColor: ColorSchema.optional(),
  targetIds: z.array(z.string().min(1)).optional(),
  cardIds: z.array(z.string().min(1)).optional(),
});
export type GameAction = z.infer<typeof GameActionSchema>;

export const RejoinRoomSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});
export type RejoinRoomPayload = z.infer<typeof RejoinRoomSchema>;

/** A Firebase ID token sent after auth state changes so the server can set socket.data.uid
 * even when the socket connected before sign-in completed. */
export const AuthVerifySchema = z.object({
  token: z.string().min(1),
});
export type AuthVerifyPayload = z.infer<typeof AuthVerifySchema>;

export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export const LobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isHost: z.boolean(),
});
export type LobbyPlayer = z.infer<typeof LobbyPlayerSchema>;

export const RoomSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  playerCount: z.number().int().nonnegative(),
  maxPlayers: z.number().int().min(3).max(8),
});
export type RoomSummary = z.infer<typeof RoomSummarySchema>;

export const CreateRoomPayloadSchema = z.object({
  name: z.string().trim().min(1).max(48),
  playerId: z.string().min(1),
  playerName: z.string().trim().min(1).max(32),
  maxPlayers: z.number().int().min(3).max(8).default(8),
});
export type CreateRoomPayload = z.infer<typeof CreateRoomPayloadSchema>;

export const JoinRoomPayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  playerName: z.string().trim().min(1).max(32),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayloadSchema>;

export const LeaveRoomSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});
export type LeaveRoomPayload = z.infer<typeof LeaveRoomSchema>;

export const StartGameSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});
export type StartGamePayload = z.infer<typeof StartGameSchema>;

export const GetGameStateSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});
export type GetGameStatePayload = z.infer<typeof GetGameStateSchema>;

/** A vault effect shown in the client vault guide (implemented effects only). */
export const VaultGuideEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["vault-silver", "vault-gold", "vault-diamond"]),
  effect: z.string(),
  status: z.enum(["stable", "draft", "tentative"]),
  playCondition: z.string().optional(),
});
export type VaultGuideEntry = z.infer<typeof VaultGuideEntrySchema>;

export const VaultCatalogReturnSchema = z.object({
  implemented: z.array(VaultGuideEntrySchema),
});
export type VaultCatalogReturn = z.infer<typeof VaultCatalogReturnSchema>;

export const VaultOfferSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["vault-silver", "vault-gold", "vault-diamond"]),
  effect: z.string(),
  playCondition: z.string().optional(),
});
export type VaultOffer = z.infer<typeof VaultOfferSchema>;

/** A short, non-blocking in-game notification shown to a single player (e.g. "you need 7
 * red or yellow cards to play Ruin" when a play-condition offer is not affordable). */
export const GameAlertSchema = z.object({
  gameId: z.string().min(1),
  message: z.string().min(1),
});
export type GameAlert = z.infer<typeof GameAlertSchema>;

export const PickPlayersPromptSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1),
  allowSelf: z.boolean().optional(),
});
export type PickPlayersPrompt = z.infer<typeof PickPlayersPromptSchema>;

/** Optional per-source bounds for a pick-cards prompt (e.g. 1–4 from each of 2 players). */
export const PickCardsPromptSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1),
  sourcePlayerIds: z.array(z.string().min(1)),
  perPlayer: z
    .object({
      min: z.number().int().min(1),
      max: z.number().int().min(1),
    })
    .optional(),
  /** True when the actor picks from their own hand (e.g. Scavenge) instead of revealed hands. */
  selfHand: z.boolean().optional(),
  /** Card to hide from a selfHand prompt (e.g. the vault token being played). */
  excludedCardId: z.string().optional(),
});
export type PickCardsPrompt = z.infer<typeof PickCardsPromptSchema>;

export const GamePromptSchema = z.discriminatedUnion("kind", [
  z.object({
    gameId: z.string().min(1),
    kind: z.literal("choose-color"),
  }),
  z.object({
    gameId: z.string().min(1),
    kind: z.literal("vault-choice"),
    offers: VaultOfferSchema.array(),
  }),
  z.object({
    gameId: z.string().min(1),
    kind: z.literal("pick-players"),
    min: z.number().int().min(1),
    max: z.number().int().min(1),
    allowSelf: z.boolean().optional(),
  }),
  z.object({
    gameId: z.string().min(1),
    kind: z.literal("pick-cards"),
    min: z.number().int().min(1),
    max: z.number().int().min(1),
    sourcePlayerIds: z.array(z.string().min(1)),
    perPlayer: z
      .object({
        min: z.number().int().min(1),
        max: z.number().int().min(1),
      })
      .optional(),
    selfHand: z.boolean().optional(),
    excludedCardId: z.string().optional(),
  }),
]);
export type GamePrompt = z.infer<typeof GamePromptSchema>;

export const GameEndedPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  handCount: z.number().int().nonnegative(),
  pointsDelta: z.number().int(),
  points: z.number().int().nullable(),
  rankName: z.string().nullable(),
  icon: z.string().nullable(),
  coinsEarned: z.number().int().nonnegative(),
});
export type GameEndedPlayer = z.infer<typeof GameEndedPlayerSchema>;

export const GameEndedPayloadSchema = z.object({
  gameId: z.string().min(1),
  winner: z.object({ id: z.string(), name: z.string() }).nullable(),
  players: z.array(GameEndedPlayerSchema),
  reason: z.enum(["hand_emptied", "stalemate"]),
});
export type GameEndedPayload = z.infer<typeof GameEndedPayloadSchema>;

export const GameEffectSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  cardId: z.string().min(1),
  name: z.string().min(1),
  tier: z.enum(["vault-silver", "vault-gold", "vault-diamond"]),
  text: z.string(),
  lines: z.array(z.string()),
  targetNames: z.array(z.string()).optional(),
});
export type GameEffect = z.infer<typeof GameEffectSchema>;

export const RoomCreateReturnSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    gameId: z.string().min(1),
    name: z.string(),
    maxPlayers: z.number().int().min(3).max(8),
  }),
  z.object({
    ok: z.literal(false),
    message: z.string(),
  }),
]);
export type RoomCreateReturn = z.infer<typeof RoomCreateReturnSchema>;

export const LeaderboardEntrySchema = z.object({
  uid: z.string().min(1),
  username: z.string().min(1),
  icon: z.string().nullable(),
  points: z.number().int().min(0),
  wins: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0),
  rankIcon: z.string(),
  rankName: z.string(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardReturnSchema = z.object({
  players: z.array(LeaderboardEntrySchema).max(25),
});
export type LeaderboardReturn = z.infer<typeof LeaderboardReturnSchema>;
