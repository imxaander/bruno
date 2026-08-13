import type { Color } from "@bruno/shared";
import type { EffectResolver } from "./types.js";

export interface ResolverTargetInput {
  min: number;
  max: number;
  allowSelf?: boolean;
}

/** What a pick-cards prompt does with the chosen cards once the effect resolves. */
export type StealMode = "steal" | "discard" | "give";

/**
 * Declared card-picking requirement for an effect. The actor picks `min`–`max`
 * cards in total from the hands of the picked targets (revealed to them first).
 * `perPlayer` constrains how many may come from each source (e.g. 1–4 each of 2).
 */
export interface StealInput {
  min: number;
  max: number;
  mode: StealMode;
  perPlayer?: { min: number; max: number };
}

/** What kind of cards a play-condition (`To play:`) costs. */
export type CostMatch = "draw-plus" | "special" | "any" | Color[];

/**
 * Declared `To play:` cost for an effect. The actor must have `count` matching cards;
 * `mode` decides whether they are discarded (`discard`, default) or merely held (`hold`,
 * e.g. t3-future-market's "6+ cards" gate).
 */
export interface CostSpec {
  count: number;
  match: CostMatch;
  label: string;
  mode?: "discard" | "hold";
}

export interface ResolverInputs {
  targets?: ResolverTargetInput;
  cost?: CostSpec;
  /** Set when the resolver needs a color pick (e.g. Jettison) before it can run. */
  color?: boolean;
  /** Set when the resolver needs the actor to pick cards from revealed hands. */
  steal?: StealInput;
}

const resolvers = new Map<string, EffectResolver>();
const inputs = new Map<string, ResolverInputs>();

export function registerResolver(
  cardId: string,
  resolver: EffectResolver,
  declaredInputs?: ResolverInputs,
): void {
  resolvers.set(cardId, resolver);
  if (declaredInputs) {
    inputs.set(cardId, declaredInputs);
  }
}

export function getResolver(cardId: string): EffectResolver | undefined {
  return resolvers.get(cardId);
}

export function getResolverInputs(cardId: string): ResolverInputs | undefined {
  return inputs.get(cardId);
}

export function registeredResolverIds(): string[] {
  return [...resolvers.keys()];
}
