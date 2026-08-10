export type Color = "red" | "blue" | "green" | "yellow";

export const COLORS: readonly Color[] = ["red", "blue", "green", "yellow"];

export type CardType =
  | "number"
  | "skip"
  | "reverse"
  | "draw2"
  | "draw4"
  | "switch-color"
  | "shuffle"
  | "vault-silver"
  | "vault-gold"
  | "vault-diamond"
  | "location"
  | "origin"
  | "artifact";

export type CardTag = "passive" | "special-passive" | "tentative" | "new" | "wild";

export type CardStatus = "stable" | "draft" | "tentative";

export interface Card {
  id: string;
  name: string;
  type: CardType;
  color?: Color;
  number?: number;
  tags: CardTag[];
  effect: string;
  playCondition?: string;
  source: string;
  status: CardStatus;
  image?: string;
}

export function isNumberCard(card: Card): card is Card & { color: Color; number: number } {
  return card.type === "number" && card.color !== undefined && card.number !== undefined;
}

export function isVaultCard(card: Card): card is Card & { type: VaultCardType } {
  return (
    card.type === "vault-silver" || card.type === "vault-gold" || card.type === "vault-diamond"
  );
}

export type VaultCardType = "vault-silver" | "vault-gold" | "vault-diamond";
