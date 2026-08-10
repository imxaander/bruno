import type { EffectResolver } from "./types.js";

export interface ResolverTargetInput {
  min: number;
  max: number;
  allowSelf?: boolean;
}

export interface ResolverInputs {
  targets?: ResolverTargetInput;
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
