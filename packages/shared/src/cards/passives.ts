/**
 * Passive metadata registry — maps PassiveState.kind to the human-readable
 * info the client needs for icon chips and tooltips.
 *
 * Icons mirror `VAULT_ICONS` in the client vaultIcons.ts module.
 */

export interface PassiveMeta {
  cardId: string;
  name: string;
  icon: string;
  description: string;
}

export const PASSIVE_META: Record<string, PassiveMeta> = {
  accumulation: {
    cardId: "t3-accumulation",
    name: "Accumulation",
    icon: "\u{1F4CA}",
    description: "Your next + card is x2.",
  },
  investment: {
    cardId: "t3-investment",
    name: "Investment",
    icon: "\u{1F4B5}",
    description: "Each round, you may choose to draw an additional card.",
  },
  "most-wanted": {
    cardId: "t2-most-wanted",
    name: "Most Wanted",
    icon: "\u{1F3AF}",
    description: "Pick a player — they draw +1 every time they play a blue or red card.",
  },
  parasitism: {
    cardId: "t2-parasitism",
    name: "Parasitism",
    icon: "\u{1FAB1}",
    description: "Whenever your host plays a green card, you discard a card from your hand.",
  },
  cruelty: {
    cardId: "t2-cruelty",
    name: "Cruelty",
    icon: "\u{1F6A6}",
    description:
      "Chosen victims cannot win until both of their hands are reduced to 10 cards or fewer.",
  },
  tyranny: {
    cardId: "t1-tyranny",
    name: "Tyranny",
    icon: "\u{1F451}",
    description: "Whenever you skip an enemy player, +3 them. Skip the next player.",
  },
  equality: {
    cardId: "t1-equality",
    name: "Equality",
    icon: "\u2696\uFE0F",
    description: "Every time you play an even-number card, +2 to a random enemy.",
  },
  zephyr: {
    cardId: "t1-zephyr",
    name: "Zephyr",
    icon: "\u{1F4A8}",
    description: "You may play 2 cards per turn. Special plays draw +2 for all enemies.",
  },
  prayers: {
    cardId: "t1-prayers",
    name: "Prayers",
    icon: "\u{1F64F}",
    description:
      "All your red cards have +1. Bonus if you played Offerings (+1), Path to Ruin (+2), or both (+4) before Prayers.",
  },
  "ultimate-machine-form": {
    cardId: "t1-ultimate-machine-form",
    name: "Ultimate Machine Form",
    icon: "\u{1F916}",
    description: "All your + card amounts and vault amounts are doubled.",
  },
  "silver-tongue": {
    cardId: "t1-silver-tongue",
    name: "Silver Tongue",
    icon: "\u{1F4AC}",
    description:
      "No one can play their last card while you're in the game. Hands rotate clockwise every round. All hands are revealed.",
  },
  maim: {
    cardId: "t1-maim",
    name: "Maim",
    icon: "\u{1FA79}",
    description:
      "Enemies with more than 2 cards gain Bleed stacks from hand size. At 5 stacks: +20 them and reset.",
  },
  scourge: {
    cardId: "t1-scourge",
    name: "Scourge",
    icon: "\u{1F9A0}",
    description:
      "Infect a player. At 1 card: +1 them, +2 other enemies. Infection spreads to the next enemy until it cycles back to the host.",
  },
  cutthroat: {
    cardId: "t1-cutthroat",
    name: "Cutthroat",
    icon: "\u{1F5E1}\uFE0F",
    description:
      "Enemy special cards become Deadweight (unplayable). Ends when total cards reach 30 or after 20 rounds.",
  },
};
