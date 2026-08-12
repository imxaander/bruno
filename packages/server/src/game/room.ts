import { randomBytes } from "node:crypto";
import type { Card, Color, GameStatus, VaultCardType } from "@bruno/shared";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  hand: Card[];
  originId?: string;
  artifactIds: string[];
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
}

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
  locationId?: string;
  mayhemEventId?: string;
  pendingDraw = 0;
  pendingWild?: { cardIndex: number; playerId: string };
  pendingVault?: PendingVault;
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
