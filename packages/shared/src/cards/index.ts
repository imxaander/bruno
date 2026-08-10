export * from "./types.js";
export * from "./cards.js";
export * from "./deck.js";

import { CARDS } from "./cards.js";
import type { Card, CardType } from "./types.js";

export function getCard(id: string): Card | undefined {
  return CARDS.find((card) => card.id === id);
}

export function cardsByType(type: CardType): Card[] {
  return CARDS.filter((card) => card.type === type);
}
