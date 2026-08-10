import { COLORS, type Card } from "./types.js";

export interface DeckComposition {
  number: { countPerColor: number; numbers: number[] };
  skip: number;
  reverse: number;
  draw2: number;
  draw4: number;
  switchColor: number;
  shuffle: number;
}

export const DEFAULT_DECK_COMPOSITION: DeckComposition = {
  number: { countPerColor: 1, numbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  skip: 5,
  reverse: 5,
  draw2: 5,
  draw4: 10,
  switchColor: 0,
  shuffle: 0,
};

export function totalCardCount(composition: DeckComposition): number {
  const numbersPerColor = composition.number.numbers.length * composition.number.countPerColor;
  return (
    numbersPerColor * COLORS.length +
    (composition.skip + composition.reverse + composition.draw2) * COLORS.length +
    composition.draw4 +
    composition.switchColor +
    composition.shuffle
  );
}

export function buildBaseDeck(composition: DeckComposition = DEFAULT_DECK_COMPOSITION): Card[] {
  const cards: Card[] = [];
  const source = "legacy/game.js (DeckCardSet)";

  for (const color of COLORS) {
    for (const number of composition.number.numbers) {
      for (let i = 0; i < composition.number.countPerColor; i++) {
        cards.push({
          id: `${color}-${number}-${i}`,
          name: String(number),
          type: "number",
          color,
          number,
          tags: [],
          effect: "Match the pile top by color or number.",
          source,
          status: "stable",
          image: `${color}_${number}.png`,
        });
      }
    }
    for (let i = 0; i < composition.skip; i++) {
      cards.push({
        id: `${color}-skip-${i}`,
        name: "Skip",
        type: "skip",
        color,
        tags: [],
        effect: "Skips the next player.",
        source,
        status: "stable",
        image: `${color}_skip.png`,
      });
    }
    for (let i = 0; i < composition.reverse; i++) {
      cards.push({
        id: `${color}-reverse-${i}`,
        name: "Reverse",
        type: "reverse",
        color,
        tags: [],
        effect: "Reverses turn direction; acts as a skip with 2 players.",
        source,
        status: "stable",
        image: `${color}_reverse.png`,
      });
    }
    for (let i = 0; i < composition.draw2; i++) {
      cards.push({
        id: `${color}-draw2-${i}`,
        name: "Draw 2",
        type: "draw2",
        color,
        tags: [],
        effect: "Next player draws 2. Stackable while a draw effect is pending.",
        source,
        status: "stable",
        image: `${color}_+2.png`,
      });
    }
  }

  for (let i = 0; i < composition.draw4; i++) {
    cards.push({
      id: `draw4-${i}`,
      name: "Draw 4",
      type: "draw4",
      tags: ["wild"],
      effect: "Next player draws 4. Stackable while a draw effect is pending.",
      source,
      status: "stable",
      image: "+4.png",
    });
  }

  for (let i = 0; i < composition.switchColor; i++) {
    cards.push({
      id: `switch-color-${i}`,
      name: "Switch Color",
      type: "switch-color",
      tags: ["wild"],
      effect: "Choose a new active color.",
      source,
      status: "stable",
      image: "swap color.png",
    });
  }

  for (let i = 0; i < composition.shuffle; i++) {
    cards.push({
      id: `shuffle-${i}`,
      name: "Shuffle",
      type: "shuffle",
      tags: ["wild"],
      effect: "Shuffle the deck.",
      source,
      status: "stable",
    });
  }

  return cards;
}
