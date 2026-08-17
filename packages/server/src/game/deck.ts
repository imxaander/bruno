import {
  buildBaseDeck,
  DEFAULT_DECK_COMPOSITION,
  getDeckComposition,
  type Card,
} from "@bruno/shared";

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) {
      continue;
    }
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export function buildDeck(rng: Rng = Math.random, playerCount?: number): Card[] {
  const composition =
    playerCount != null ? getDeckComposition(playerCount) : DEFAULT_DECK_COMPOSITION;
  return shuffle(buildBaseDeck(composition), rng);
}

export function dealHands(deck: Card[], playerCount: number, handSize: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < handSize; i += 1) {
    for (let p = 0; p < playerCount; p += 1) {
      const card = deck.pop();
      if (card) {
        const hand = hands[p];
        if (hand) {
          hand.push(card);
        }
      }
    }
  }
  return hands;
}

export function seedPile(deck: Card[], pile: Card[]): Card | null {
  const card = deck.pop();
  if (card) {
    pile.push(card);
  }
  return card ?? null;
}

export function reshuffleFromPile(deck: Card[], pile: Card[], rng: Rng = Math.random): Card[] {
  const top = pile.pop();
  const recycled = shuffle(pile, rng);
  pile.length = 0;
  deck.splice(0, deck.length, ...recycled);
  if (top) {
    pile.push(top);
  }
  return deck;
}

export function draw(deck: Card[], pile: Card[], amount: number, rng: Rng = Math.random): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < amount; i += 1) {
    let card = deck.pop();
    if (!card && pile.length > 1) {
      reshuffleFromPile(deck, pile, rng);
      card = deck.pop();
    }
    if (card) {
      drawn.push(card);
    }
  }
  return drawn;
}
