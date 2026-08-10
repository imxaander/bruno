import type { CardStatus } from "./types.js";

export interface MayhemEvent {
  id: string;
  name: string;
  effect: string;
  source: string;
  status: CardStatus;
}

/**
 * Mayhem events rolled at the start of each round, transcribed from
 * `docs/game/mayhem.md` (sourced from "1.4 BRUNO.pdf p.9"). `effect` is the
 * verbatim PDF text; `name` is a short display label.
 */
export const MAYHEM_EVENTS: MayhemEvent[] = [
  {
    id: "mayhem-1",
    name: "Random +1",
    effect: "+1 to a random player.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-2",
    name: "Random +4",
    effect: "+4 to a random player.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-3",
    name: "+6 All, +4 Least",
    effect: "+6 to all and an additional +4 to the least cards.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-4",
    name: "Skip One",
    effect: "Skip 1 random player.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-5",
    name: "Skip Two",
    effect: "Skip 2 random players.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-6",
    name: "Skip All but the Richest",
    effect: "Skip all players except with the most cards for 6 turns.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-7",
    name: "Swap Least and Most",
    effect: "Swap cards with the least amount of cards to the most cards.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-8",
    name: "Replace Hand",
    effect: "Discard your hand and replace it with the same amount of cards.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
  {
    id: "mayhem-9",
    name: "Reduce All to One",
    effect: "Reduce the cards of all players to 1.",
    source: "1.4 BRUNO.pdf p.9",
    status: "draft",
  },
];

export function getMayhemEvent(id: string): MayhemEvent | undefined {
  return MAYHEM_EVENTS.find((event) => event.id === id);
}
