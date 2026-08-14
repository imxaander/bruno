import type { CardType, Color } from "../cards/types.js";

export type GameStatus = "prepping" | "ongoing" | "concluding";

export interface CardView {
  id: string;
  image?: string;
  color?: Color;
  number?: number;
  type: CardType;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isTurn: boolean;
  handCount: number;
}

/** A hand this viewer is entitled to see (vault reveal effects). */
export interface RevealedHand {
  playerId: string;
  cards: CardView[];
}

/** The vault effect resolved by the current pile-top token (pile hover tooltip). */
export interface PileEffect {
  cardId: string;
  name: string;
  tier: "vault-silver" | "vault-gold" | "vault-diamond";
  text: string;
}

export interface PlayerView {
  playerCount: number;
  players: PublicPlayer[];
  you: { index: number; hand: CardView[]; playable: boolean[] };
  pileTop: CardView | null;
  deckCount: number;
  currentTurnIndex: number;
  currentDirection: 1 | -1;
  activeColor: Color | null;
  pendingDraw: number;
  locationId?: string;
  mayhemEventId?: string;
  status: GameStatus;
  turnDuration: number;
  /** Absolute epoch-ms deadline for the current player's turn (public timer). */
  turnDeadline?: number;
  /** Vault effect resolved by the current pile-top token, if any. */
  pileEffect?: PileEffect;
  revealed?: RevealedHand[];
  /** Player id who has a pending Investment draw offer this round (only visible to that player). */
  investmentOffer?: boolean;
}
