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
  status: GameStatus;
  turnDuration: number;
}
