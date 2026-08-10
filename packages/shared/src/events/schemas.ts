import { z } from "zod";

export const ColorSchema = z.enum(["red", "blue", "green", "yellow"]);
export type ColorValue = z.infer<typeof ColorSchema>;

export const GameActionTypeSchema = z.enum([
  "play",
  "draw",
  "choose-color",
  "vault-choice",
  "choose-targets",
]);

export const GameActionSchema = z.object({
  gameId: z.string().min(1),
  type: GameActionTypeSchema,
  playerId: z.string().min(1),
  cardId: z.string().optional(),
  cardIndex: z.number().int().nonnegative().optional(),
  chosenColor: ColorSchema.optional(),
  targetIds: z.array(z.string().min(1)).optional(),
});
export type GameAction = z.infer<typeof GameActionSchema>;

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
  maxPlayers: z.number().int().min(2).max(8),
});
export type RoomSummary = z.infer<typeof RoomSummarySchema>;

export const CreateRoomPayloadSchema = z.object({
  name: z.string().trim().min(1).max(48),
  playerId: z.string().min(1),
  playerName: z.string().trim().min(1).max(32),
  maxPlayers: z.number().int().min(2).max(8).default(8),
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

export const VaultOfferSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["vault-silver", "vault-gold", "vault-diamond"]),
  effect: z.string(),
});
export type VaultOffer = z.infer<typeof VaultOfferSchema>;

export const PickPlayersPromptSchema = z.object({
  min: z.number().int().min(1),
  max: z.number().int().min(1),
  allowSelf: z.boolean().optional(),
});
export type PickPlayersPrompt = z.infer<typeof PickPlayersPromptSchema>;

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
]);
export type GamePrompt = z.infer<typeof GamePromptSchema>;

export const GameEndedPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  handCount: z.number().int().nonnegative(),
});
export type GameEndedPlayer = z.infer<typeof GameEndedPlayerSchema>;

export const GameEndedPayloadSchema = z.object({
  gameId: z.string().min(1),
  winner: z.object({ id: z.string(), name: z.string() }).nullable(),
  players: z.array(GameEndedPlayerSchema),
  reason: z.literal("hand_emptied"),
});
export type GameEndedPayload = z.infer<typeof GameEndedPayloadSchema>;

export const RoomCreateReturnSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    gameId: z.string().min(1),
    name: z.string(),
    maxPlayers: z.number().int().min(2).max(8),
  }),
  z.object({
    ok: z.literal(false),
    message: z.string(),
  }),
]);
export type RoomCreateReturn = z.infer<typeof RoomCreateReturnSchema>;
