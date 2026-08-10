import type { Color } from "@bruno/shared";
import type { Player, Room } from "../room.js";

export type PlayerId = string;

/**
 * Everything a card effect needs to resolve. Mirrors `docs/card-data-schema.md`
 * §4, adapted so `game` is the authoritative `Room`.
 */
export interface EffectContext {
  game: Room;
  actor: PlayerId;
  targets?: PlayerId[];
  chosenColor?: Color;
  random: () => number;
}

export interface EffectResult {
  applied: boolean;
  log?: string[];
}

export type EffectResolver = (context: EffectContext) => EffectResult;

export function actorPlayer(context: EffectContext): Player | undefined {
  return context.game.getPlayer(context.actor);
}
