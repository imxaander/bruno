export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "card-back" | "background";
  cost: number;
  preview: string;
}

export const CARD_BACKS: ShopItem[] = [
  {
    id: "cb-default",
    name: "Classic",
    description: "The original BRUNO card back.",
    category: "card-back",
    cost: 0,
    preview: "🃏",
  },
  {
    id: "cb-neon",
    name: "Neon Glow",
    description: "Electric cyan border that pulses in the dark.",
    category: "card-back",
    cost: 80,
    preview: "⚡",
  },
  {
    id: "cb-holo",
    name: "Holographic",
    description: "Shifting rainbow sheen under the light.",
    category: "card-back",
    cost: 150,
    preview: "🌈",
  },
  {
    id: "cb-shadow",
    name: "Shadow Realm",
    description: "Deep violet with swirling mist.",
    category: "card-back",
    cost: 120,
    preview: "🌑",
  },
  {
    id: "cb-gold",
    name: "Gilded",
    description: "Gold leaf finish with ornate filigree.",
    category: "card-back",
    cost: 200,
    preview: "✨",
  },
];

export const BACKGROUNDS: ShopItem[] = [
  {
    id: "bg-default",
    name: "Standard",
    description: "The classic BRUNO table.",
    category: "background",
    cost: 0,
    preview: "🎮",
  },
  {
    id: "bg-cosmic",
    name: "Cosmic Void",
    description: "Deep space with drifting nebulae.",
    category: "background",
    cost: 100,
    preview: "🌌",
  },
  {
    id: "bg-underwater",
    name: "Deep Sea",
    description: "Bioluminescent ocean depths.",
    category: "background",
    cost: 100,
    preview: "🌊",
  },
  {
    id: "bg-volcanic",
    name: "Volcanic",
    description: "Molten lava rivers and embers.",
    category: "background",
    cost: 120,
    preview: "🌋",
  },
  {
    id: "bg-neon-city",
    name: "Neon City",
    description: "Cyberpunk skyline at night.",
    category: "background",
    cost: 150,
    preview: "🌃",
  },
  {
    id: "bg-aurora",
    name: "Aurora",
    description: "Northern lights over snowy peaks.",
    category: "background",
    cost: 180,
    preview: "🎆",
  },
];

export const ALL_SHOP_ITEMS: ShopItem[] = [...CARD_BACKS, ...BACKGROUNDS];

export function getShopItem(id: string): ShopItem | undefined {
  return ALL_SHOP_ITEMS.find((item) => item.id === id);
}
