import { randomBytes } from "node:crypto";
import type { Card, Color, GameStatus, VaultCardType } from "@bruno/shared";
import type { StealInput } from "./effects/registry.js";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: Card[];
  originId?: string;
  artifactIds: string[];
  /** Card ids this player has played this game (Wave 5 passives like Prayers read this). */
  playedEffectIds?: string[];
  /** Remaining turns this player is skipped for. Decremented each time play reaches them. */
  skippedTurns?: number;
  /**
   * Round-scoped self-skip (t3-liquidation): while `room.round <= liquidationUntilRound`
   * the player is hopped over instead of drawing/playing. Not decremented per turn.
   */
  liquidationUntilRound?: number;
}

export const HAND_SIZE = 8;

export interface PendingVault {
  cardIndex: number;
  playerId: string;
  tier: VaultCardType;
  offers: Card[];
  chosenCardId?: string;
  targetSpec?: { min: number; max: number; allowSelf?: boolean };
  targetIds?: string[];
  chosenColor?: Color;
  colorRequired?: boolean;
  /** Set once the actor must pick cards from revealed target hands (Wave 2). */
  stealSpec?: StealInput;
  /** Card ids picked via the pick-cards sub-prompt, passed to the resolver. */
  chosenCardIds?: string[];
}

/** A hand revealed to a viewer. `permanent` reveals survive until the game ends. */
export interface Reveal {
  playerId: string;
  permanent: boolean;
}

/**
 * A round-delayed effect (Wave 4). `triggerRound` fires when `room.round` first reaches
 * or exceeds it. Kinds are settled by `runDueDeferred` (see `effects/deferred.ts`).
 */
export type DeferredEffect =
  | {
      id: string;
      kind: "return-cards";
      triggerRound: number;
      /** The player the given cards must come back to. */
      actorId: string;
      cardIds: string[];
      /** The player currently holding the given cards. */
      holderId: string;
    }
  | { id: string; kind: "all-in"; triggerRound: number; actorId: string }
  | { id: string; kind: "green-tide"; triggerRound: number };

/** One card played through `playCard`, stamped with the round it was played in. */
export interface PileLogEntry {
  round: number;
  playerId: string;
  card: Card;
}

/**
 * An active always-on passive (Wave 5). Registered when the owner plays the vault card;
 * `emitGameEvent` (see `effects/events.ts`) consults these when game events fire.
 */
export type PassiveState =
  | { kind: "accumulation"; ownerId: string }
  | { kind: "investment"; ownerId: string }
  | { kind: "most-wanted"; ownerId: string; targetId: string }
  | { kind: "parasitism"; ownerId: string; targetId: string }
  | { kind: "cruelty"; ownerId: string; victims: string[] }
  | { kind: "tyranny"; ownerId: string }
  | { kind: "equality"; ownerId: string }
  | { kind: "zephyr"; ownerId: string; playsThisTurn: number }
  | { kind: "prayers"; ownerId: string; bonus: number }
  | { kind: "ultimate-machine-form"; ownerId: string }
  | { kind: "silver-tongue"; ownerId: string }
  | { kind: "maim"; ownerId: string; bleed: Map<string, number> }
  | { kind: "scourge"; ownerId: string; infecteeId: string }
  | { kind: "cutthroat"; ownerId: string; startedAtRound: number };

export class Room {
  readonly id: string;
  readonly name: string;
  readonly maxPlayers: number;
  hostId: string;
  status: GameStatus;
  players: Player[] = [];
  deck: Card[] = [];
  pile: Card[] = [];
  currentTurnIndex = 0;
  currentDirection: 1 | -1 = 1;
  activeColor: Color | null = null;
  /** Full passes around the table. Incremented in `advanceTurn` on wrap-around. */
  round = 0;
  /** Round-delayed effects pending settlement (Wave 4). */
  deferred: DeferredEffect[] = [];
  /** Every card played through `playCard`, in order (t3-imploded-clockwork rewinds this). */
  pileLog: PileLogEntry[] = [];
  /** Active always-on passives (Wave 5), registered by their vault cards. */
  passives: PassiveState[] = [];
  locationId?: string;
  mayhemEventId?: string;
  /** Mayhem event ids rolled this game; re-rolls avoid them until the pool is exhausted. */
  usedMayhemIds: string[] = [];
  /** loc-ocean: set once the first vault token of the game has been played. */
  firstVaultPlayed = false;
  pendingDraw = 0;
  pendingWild?: { cardIndex: number; playerId: string };
  pendingVault?: PendingVault;
  /** Absolute epoch-ms deadline for the current player's turn (public timer). */
  turnDeadline?: number;
  /** Vault effect resolved by the current pile-top token (pile hover tooltip). */
  pileEffect?: {
    cardId: string;
    name: string;
    tier: VaultCardType;
    text: string;
  };
  /** viewerId -> hands that viewer may currently inspect (vault reveal effects). */
  reveals = new Map<string, Reveal[]>();
  winnerId?: string;
  winnerName?: string;

  constructor(input: { name: string; hostId: string; maxPlayers: number }) {
    this.id = randomBytes(6).toString("hex");
    this.name = input.name;
    this.hostId = input.hostId;
    this.maxPlayers = input.maxPlayers;
    this.status = "prepping";
  }

  get playerCount(): number {
    return this.players.length;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.find((player) => player.id === playerId);
  }

  getPlayerIndex(playerId: string): number {
    return this.players.findIndex((player) => player.id === playerId);
  }
}
