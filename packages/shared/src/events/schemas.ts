import { z } from "zod";

export const ColorSchema = z.enum(["red", "blue", "green", "yellow"]);
export type ColorValue = z.infer<typeof ColorSchema>;

export const GameActionTypeSchema = z.enum(["play", "draw", "choose-color"]);

export const GameActionSchema = z.object({
  gameId: z.string().min(1),
  type: GameActionTypeSchema,
  playerId: z.string().min(1),
  cardId: z.string().optional(),
  cardIndex: z.number().int().nonnegative().optional(),
  chosenColor: ColorSchema.optional(),
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
});
export type RoomSummary = z.infer<typeof RoomSummarySchema>;
