import type { CardTag, CardType, Color } from "../cards/types.js";

export type GameStatus = "prepping" | "ongoing" | "concluding";

export interface CardView {
  id: string;
  image?: string;
  color?: Color;
  number?: number;
  type: CardType;
  tags?: CardTag[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isTurn: boolean;
  handCount: number;
  rankIcon?: string;
  rankName?: string;
  /** The player's profile avatar emoji (absent for guests). */
  profileIcon?: string;
  /** Equipped cosmetic card-back id (e.g. "cb-neon"). */
  equippedCardBack?: string;
  /** Equipped cosmetic background id (e.g. "bg-cosmic"). */
  equippedBackground?: string;
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

/** A compact representation of one active passive for the client. */
export interface ActivePassive {
  /** PassiveState kind — maps 1-to-1 with vaultIcons keys. */
  kind: string;
  /** Human-readable name of the passive effect. */
  name: string;
  /** Emoji icon. */
  icon: string;
  /** Full tooltip text describing what this passive does. */
  description: string;
  /** Player who activated this passive. */
  ownerId: string;
  /** Display name of the owner. */
  ownerName: string;
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
  /** Fleeting card last played — shown muted on top of the pile (visual only, not in backend pile). */
  fleetingPileTop?: CardView;
  /** Remaining reconnect grace time in ms (0 = none). Shown in reconnect overlay. */
  reconnectGraceMs?: number;
  /** Whether the current player's socket is disconnected. */
  connected?: boolean;
  /** Passives currently active on or affecting the requesting player. */
  myPassives?: ActivePassive[];
  /** Epoch-ms when the game started — used for the elapsed timer. */
  startedAt?: number;
}
