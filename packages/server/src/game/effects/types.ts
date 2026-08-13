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
  /** Card ids the actor picked from revealed target hands (pick-cards sub-prompt). */
  picked?: string[];
  random: () => number;
  /** loc-volcano doubles Silver/Gold effects; resolvers multiply +N amounts by this. */
  amountMultiplier?: number;
  /**
   * The round in which the effect's card was played (pre-advance). `game.round`
   * may already have advanced past it when the actor sits at the wrap seat, so
   * round-counted deadlines must be based on this value.
   */
  roundPlayed?: number;
}

export interface EffectResult {
  applied: boolean;
  log?: string[];
  /** Resolvers set this to keep the turn on the actor (e.g. Rummage). */
  keepTurn?: boolean;
}

export type EffectResolver = (context: EffectContext) => EffectResult;

export function actorPlayer(context: EffectContext): Player | undefined {
  return context.game.getPlayer(context.actor);
}
