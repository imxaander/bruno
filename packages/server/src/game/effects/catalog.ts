import { isVaultTokenCard, type Card, type Color } from "@bruno/shared";
import {
  addCards,
  applyPicked,
  grantVaultTokens,
  otherPlayers,
  payCost,
  randomOf,
  resolveTargets,
  revealHands,
} from "./helpers.js";
import { scheduleDeferred } from "./deferred.js";
import { registerResolver } from "./registry.js";
import type { CostSpec } from "./registry.js";
import {
  addPassive,
  advanceScourge,
  applySkipTurns,
  checkCutthroat,
  recomputeBleed,
} from "./events.js";
import { actorPlayer, type EffectContext, type EffectResult } from "./types.js";
import { shuffle, type Rng } from "../deck.js";
import type { PassiveState, Player, Room } from "../room.js";

function actorName(context: EffectContext): string {
  return actorPlayer(context)?.name ?? context.actor;
}

function playerName(context: EffectContext, playerId: string): string {
  return context.game.getPlayer(playerId)?.name ?? playerId;
}

/** "+N to all enemy players" — with no teams, enemies are all other players. */
function plusToAllEnemies(amount: number): (context: EffectContext) => EffectResult {
  return (context) => {
    const others = otherPlayers(context.game, context.actor);
    const scaled = amount * (context.amountMultiplier ?? 1);
    let added = 0;
    for (const player of others) {
      added += addCards(context.game, player, scaled, context.random);
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${others.length} enemy player(s) (${added} total).`,
      ],
    };
  };
}

/** "+N to N players" — uses explicit targets, falling back to random others. */
function plusToTwoPlayers(amount: number): (context: EffectContext) => EffectResult {
  return (context) => {
    const targets = resolveTargets(context.game, context.actor, context.targets, 2, context.random);
    const scaled = amount * (context.amountMultiplier ?? 1);
    let added = 0;
    for (const player of targets) {
      added += addCards(context.game, player, scaled, context.random);
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${targets.length} player(s) (${added} total).`,
      ],
    };
  };
}

/** "+N to yourself and +M to an enemy player." */
function plusSelfAndEnemy(
  selfAmount: number,
  enemyAmount: number,
): (context: EffectContext) => EffectResult {
  return (context) => {
    const actor = actorPlayer(context);
    if (!actor) {
      return { applied: false };
    }
    const multiplier = context.amountMultiplier ?? 1;
    const selfScaled = selfAmount * multiplier;
    const enemyScaled = enemyAmount * multiplier;
    const enemy = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    addCards(context.game, actor, selfScaled, context.random);
    let enemyAdded = 0;
    let enemyName = "nobody";
    if (enemy) {
      enemyAdded = addCards(context.game, enemy, enemyScaled, context.random);
      enemyName = enemy.name;
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${selfScaled} card${selfScaled === 1 ? "" : "s"} to themselves and ${enemyScaled} to ${enemyName} (${enemyAdded}).`,
      ],
    };
  };
}

/** "+N to a single random player." */
function plusToTarget(amount: number): (context: EffectContext) => EffectResult {
  return (context) => {
    const target = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    if (!target) {
      return { applied: false };
    }
    const scaled = amount * (context.amountMultiplier ?? 1);
    const added = addCards(context.game, target, scaled, context.random);
    const name = actorName(context);
    return {
      applied: true,
      log: [`${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${target.name} (${added}).`],
    };
  };
}

registerResolver("t1-meiosis", plusToAllEnemies(3));
registerResolver("t3-mitosis", plusToTwoPlayers(1));
registerResolver("t2-mitosis", plusToTwoPlayers(2));
registerResolver("t1-suicide", plusSelfAndEnemy(12, 12));
registerResolver("t3-double-edged-sword", plusSelfAndEnemy(1, 4));
registerResolver("t1-damnation", plusSelfAndEnemy(1, 23));

/** "Pick a player, +N them and discard N cards without seeing their cards." */
function scrapShot(add: number, discard: number): (context: EffectContext) => EffectResult {
  return (context) => {
    const target = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    if (!target) {
      return { applied: false };
    }
    const scaled = add * (context.amountMultiplier ?? 1);
    const added = addCards(context.game, target, scaled, context.random);
    let discarded = 0;
    for (let i = 0; i < discard; i += 1) {
      const card = randomOf(target.hand, context.random);
      if (!card) {
        break;
      }
      target.hand.splice(target.hand.indexOf(card), 1);
      discarded += 1;
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [`${name} hits ${target.name}: +${scaled} and discards ${discarded} card(s) at random.`],
    };
  };
}

registerResolver("t3-scrap-shot", scrapShot(1, 1), { targets: { min: 1, max: 1 } });
registerResolver("t2-scrap-shot", scrapShot(3, 3), { targets: { min: 1, max: 1 } });

/** "All players shuffle their cards with each other and return with the same amount of cards." */
function cardAPalooza(context: EffectContext): EffectResult {
  const counts = context.game.players.map((player) => player.hand.length);
  const pool = shuffle(
    context.game.players.flatMap((player) => player.hand),
    context.random,
  );
  let cursor = 0;
  context.game.players.forEach((player, index) => {
    const size = counts[index] ?? 0;
    player.hand = pool.slice(cursor, cursor + size);
    cursor += size;
  });
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} shuffles every hand together and deals them back out.`],
  };
}

registerResolver("t2-card-a-palooza", cardAPalooza);

/** "Pick 1–3 players and steal up to 2 random vaults in total from them." */
function vaultHunter(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const targets = resolveTargets(context.game, context.actor, context.targets, 3, context.random);
  const vaults = targets.flatMap((target) => target.hand.filter(isVaultTokenCard));
  const stolenFrom = new Set<string>();
  let stolen = 0;
  for (let i = 0; i < 2; i += 1) {
    const card = randomOf(vaults, context.random);
    if (!card) {
      break;
    }
    vaults.splice(vaults.indexOf(card), 1);
    const holder = targets.find((target) => target.hand.includes(card));
    if (!holder) {
      break;
    }
    holder.hand.splice(holder.hand.indexOf(card), 1);
    actor.hand.push(card);
    stolen += 1;
    stolenFrom.add(holder.name);
  }
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} steals ${stolen} vault token(s) from ${[...stolenFrom].join(", ") || "nobody"}.`,
    ],
  };
}

registerResolver("t2-vault-hunter", vaultHunter, { targets: { min: 1, max: 3 } });

/** "Switch hands with anyone." */
function gSwitch(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!target) {
    return { applied: false };
  }
  const held = actor.hand;
  actor.hand = target.hand;
  target.hand = held;
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} switches hands with ${target.name}.`],
  };
}

registerResolver("t1-g-switch", gSwitch, { targets: { min: 1, max: 1 } });

// ---- Wave 1: effects built on the skip mechanic, coin flips, blind swaps, ----

/** Removes up to `count` random cards from a hand (blindly) and returns them. */
function takeRandom(hand: Card[], count: number, rng: Rng): Card[] {
  const taken: Card[] = [];
  for (let i = 0; i < count; i += 1) {
    const card = randomOf(hand, rng);
    if (!card) {
      break;
    }
    hand.splice(hand.indexOf(card), 1);
    taken.push(card);
  }
  return taken;
}

/** "Skip 2 random players for N turns." */
function hush(context: EffectContext, turns: number): EffectResult {
  const shuffled = shuffle(otherPlayers(context.game, context.actor), context.random);
  const targets = shuffled.slice(0, 2);
  const name = actorName(context);
  const logs = applySkipTurns(context.game, targets, turns, context.actor, context.random);
  return {
    applied: true,
    log: [
      `${name} silences ${targets.map((p) => p.name).join(", ") || "nobody"} for ${turns} turn(s).`,
      ...logs,
    ],
  };
}

registerResolver("t3-hush", (context) => hush(context, 1));
registerResolver("t2-hush", (context) => hush(context, 3));

/** "Skip all enemy players for N turns." */
function globalSilence(context: EffectContext, turns: number): EffectResult {
  const others = otherPlayers(context.game, context.actor);
  const name = actorName(context);
  const logs = applySkipTurns(context.game, others, turns, context.actor, context.random);
  return {
    applied: true,
    log: [`${name} silences all ${others.length} enemy player(s) for ${turns} turn(s).`, ...logs],
  };
}

registerResolver("t1-global-silence", (context) => globalSilence(context, 3));
registerResolver("t1-sloth", (context) => globalSilence(context, 20));

/** Skips the actor for `turns` turns. */
function skipSelf(context: EffectContext, turns: number): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  actor.skippedTurns = (actor.skippedTurns ?? 0) + turns;
  return { applied: true, log: [`${actor.name} skips themselves for ${turns} turn(s).`] };
}

/** Resolves one of two effects based on a coin flip. */
function coinFlip(
  heads: (context: EffectContext) => EffectResult,
  tails: (context: EffectContext) => EffectResult,
): (context: EffectContext) => EffectResult {
  return (context) => {
    const name = actorName(context);
    const isHeads = context.random() < 0.5;
    const result = isHeads ? heads(context) : tails(context);
    const side = isHeads ? "heads" : "tails";
    return { applied: true, log: [`${name} flips a coin — ${side}!`, ...(result.log ?? [])] };
  };
}

registerResolver(
  "t3-prototype-z",
  coinFlip((context) => skipSelf(context, 1), plusToTarget(4)),
);

registerResolver(
  "t2-augmented-zep-y",
  coinFlip((context) => skipSelf(context, 2), plusToTarget(6)),
);

/** "Switch N cards in your hand with anyone blindly; if they have fewer than N, +fallback them." */
function tradeSector(context: EffectContext, count: number, fallback: number): EffectResult {
  const actor = actorPlayer(context);
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!actor || !target) {
    return { applied: false };
  }
  const name = actorName(context);
  if (target.hand.length < count) {
    const added = addCards(
      context.game,
      target,
      fallback * (context.amountMultiplier ?? 1),
      context.random,
    );
    return {
      applied: true,
      log: [
        `${name} trades with ${target.name}, who has fewer than ${count} cards — ${target.name} draws ${added}.`,
      ],
    };
  }
  const actorCards = takeRandom(actor.hand, count, context.random);
  const targetCards = takeRandom(target.hand, count, context.random);
  actor.hand.push(...targetCards);
  target.hand.push(...actorCards);
  return {
    applied: true,
    log: [`${name} blindly trades ${actorCards.length} card(s) with ${target.name}.`],
  };
}

registerResolver("t3-trade-sector", (context) => tradeSector(context, 2, 1), {
  targets: { min: 1, max: 1 },
});
registerResolver("t2-trade-sector", (context) => tradeSector(context, 3, 2), {
  targets: { min: 1, max: 1 },
});

/** "Discard 1-5 cards in your hand. Draw 1 for each card discarded." */
function scavenge(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const max = Math.min(5, actor.hand.length);
  if (max <= 0) {
    return { applied: true, log: [`${actor.name} has no cards to discard.`] };
  }
  const count = 1 + Math.floor(context.random() * max);
  const discarded = takeRandom(actor.hand, count, context.random).length;
  const drawn = addCards(
    context.game,
    actor,
    discarded * (context.amountMultiplier ?? 1),
    context.random,
  );
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} discards ${discarded} card(s) and draws ${drawn}.`],
  };
}

registerResolver("t3-scavenge", scavenge);

/** "Discard your hand. Draw 1 for each card discarded. It's your turn again." */
function rummage(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const count = actor.hand.length;
  actor.hand.length = 0;
  const drawn = addCards(
    context.game,
    actor,
    count * (context.amountMultiplier ?? 1),
    context.random,
  );
  const name = actorName(context);
  return {
    applied: true,
    keepTurn: true,
    log: [`${name} discards their hand and redraws ${drawn} card(s).`],
  };
}

registerResolver("t2-rummage", rummage);

/** Grants freshly-minted vault tokens of a tier. */
function gainVaults(
  context: EffectContext,
  tier: "vault-silver" | "vault-gold",
  count: number,
): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const tokens = grantVaultTokens(context.game, actor, tier, count, context.random);
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} gains ${tokens.length} ${tier === "vault-silver" ? "Silver" : "Gold"} Vault token(s).`,
    ],
  };
}

registerResolver("t2-twice-than-one", (context) => gainVaults(context, "vault-silver", 2));
registerResolver("t1-thrice-than-twice", (context) => gainVaults(context, "vault-silver", 3));

function switchHands(a: Player, b: Player): void {
  const held = a.hand;
  a.hand = b.hand;
  b.hand = held;
}

/** "Switch hands with anyone and do it again to another pair of players." */
function envy(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  const first = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!actor || !first) {
    return { applied: false };
  }
  switchHands(actor, first);
  const log: string[] = [`${actor.name} switches hands with ${first.name}.`];
  const pool = context.game.players.filter(
    (player) => player.id !== actor.id && player.id !== first.id,
  );
  const [secondA, secondB] = shuffle(pool, context.random);
  if (secondA && secondB) {
    switchHands(secondA, secondB);
    log.push(`${secondA.name} and ${secondB.name} switch hands.`);
  }
  return { applied: true, log };
}

registerResolver("t1-envy", envy, { targets: { min: 1, max: 1 } });

/** "+6 to all enemy players and skip the enemy with the most cards for 1 turn." */
function genesis(context: EffectContext): EffectResult {
  const result = plusToAllEnemies(6)(context);
  const most = [...otherPlayers(context.game, context.actor)].sort(
    (a, b) => b.hand.length - a.hand.length,
  )[0];
  if (most) {
    const logs = applySkipTurns(context.game, [most], 1, context.actor, context.random);
    result.log?.push(`${most.name} is skipped for 1 turn for holding the most cards.`);
    result.log?.push(...logs);
  }
  return result;
}

registerResolver("t1-genesis", genesis);

// ---- Wave 1: effects gated by a play-condition (To play:) cost ----

/** "Get a Silver Vault and +2 anyone." */
function offerings(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const cost: CostSpec = { count: 3, match: "draw-plus", label: "3 draw [+] cards" };
  const paid = payCost(actor, cost);
  if (paid < cost.count) {
    return { applied: false, log: [`${actor.name} cannot discard 3 draw [+] cards.`] };
  }
  grantVaultTokens(context.game, actor, "vault-silver", 1, context.random);
  const picked = context.targets?.[0];
  const target = picked
    ? context.game.getPlayer(picked)
    : randomOf(otherPlayers(context.game, context.actor), context.random);
  const scaled = 2 * (context.amountMultiplier ?? 1);
  let added = 0;
  let targetName = "nobody";
  if (target) {
    added = addCards(context.game, target, scaled, context.random);
    targetName = target.name;
  }
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} discards 3 draw [+] cards.`,
      `${name} gains a Silver Vault token.`,
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${targetName} (${added}).`,
    ],
  };
}

registerResolver("t3-offerings", offerings, {
  targets: { min: 1, max: 1, allowSelf: true },
  cost: { count: 3, match: "draw-plus", label: "3 draw [+] cards" },
});

/** "Get a Gold Vault and +3 2 enemy players." */
function ruin(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const cost: CostSpec = { count: 7, match: ["red", "yellow"], label: "7 red or yellow cards" };
  const paid = payCost(actor, cost);
  if (paid < cost.count) {
    return { applied: false, log: [`${actor.name} cannot discard 7 red or yellow cards.`] };
  }
  grantVaultTokens(context.game, actor, "vault-gold", 1, context.random);
  const targets = resolveTargets(context.game, context.actor, context.targets, 2, context.random);
  const scaled = 3 * (context.amountMultiplier ?? 1);
  let added = 0;
  for (const target of targets) {
    added += addCards(context.game, target, scaled, context.random);
  }
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} discards 7 red or yellow cards.`,
      `${name} gains a Gold Vault token.`,
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${targets.length} enemy player(s) (${added}).`,
    ],
  };
}

registerResolver("t2-ruin", ruin, {
  targets: { min: 2, max: 2 },
  cost: { count: 7, match: ["red", "yellow"], label: "7 red or yellow cards" },
});

/** "Discard 2 special cards to draw 10." */
function sacrificialLamb(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const cost: CostSpec = { count: 2, match: "special", label: "2 special cards" };
  const paid = payCost(actor, cost);
  if (paid < cost.count) {
    return { applied: false, log: [`${actor.name} cannot discard 2 special cards.`] };
  }
  const drawn = addCards(context.game, actor, 10 * (context.amountMultiplier ?? 1), context.random);
  const name = actorName(context);
  return { applied: true, log: [`${name} discards 2 special cards and draws ${drawn}.`] };
}

registerResolver("t2-sacrificial-lamb", sacrificialLamb, {
  cost: { count: 2, match: "special", label: "2 special cards" },
});

/** "Pick a color, discard all of those cards with the same color." (self-hand) */
function jettison(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const color = context.chosenColor;
  if (!color) {
    return { applied: false, log: [`${actor.name} must pick a color to jettison.`] };
  }
  const before = actor.hand.length;
  actor.hand = actor.hand.filter((card) => card.color !== color);
  const discarded = before - actor.hand.length;
  const name = actorName(context);
  return { applied: true, log: [`${name} discards all ${discarded} ${color} card(s).`] };
}

registerResolver("t2-jettison", jettison, { color: true });

// ---- Wave 2: reveal / steal-visible effects (hand-reveal serialization) ----

/** "See the cards of a player." */
function futureSight(context: EffectContext): EffectResult {
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!target) {
    return { applied: false };
  }
  revealHands(context.game, context.actor, [target.id], false);
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} sees ${target.name}'s hand (${target.hand.length} card(s)).`],
  };
}

registerResolver("t2-future-sight", futureSight, {
  targets: { min: 1, max: 1, allowSelf: true },
});

/** "Pick an enemy player, +3 them and steal 1-3 cards while seeing their cards." */
function plunder(context: EffectContext): EffectResult {
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!target) {
    return { applied: false };
  }
  const scaled = 3 * (context.amountMultiplier ?? 1);
  const added = addCards(context.game, target, scaled, context.random);
  const { taken, holders } = applyPicked(context, "steal");
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${target.name} (${added}).`,
      `${name} steals ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || target.name}.`,
    ],
  };
}

registerResolver("t1-plunder", plunder, {
  targets: { min: 1, max: 1 },
  steal: { min: 1, max: 3, mode: "steal" },
});

/** "+2 to all players then steal a total of 1-5 cards from any enemies while seeing their cards." */
function avarice(context: EffectContext): EffectResult {
  const scaled = 2 * (context.amountMultiplier ?? 1);
  let added = 0;
  for (const player of context.game.players) {
    added += addCards(context.game, player, scaled, context.random);
  }
  const { taken, holders } = applyPicked(context, "steal");
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to all ${context.game.players.length} player(s) (${added} total).`,
      `${name} steals ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || "nobody"}.`,
    ],
  };
}

registerResolver("t1-avarice", avarice, {
  targets: { min: 1, max: 5 },
  steal: { min: 1, max: 5, mode: "steal" },
});

/** "+1 to all enemy players and discard a total of 1-7 cards from any enemies while seeing their cards." */
function scrapheap(context: EffectContext): EffectResult {
  const others = otherPlayers(context.game, context.actor);
  const scaled = 1 * (context.amountMultiplier ?? 1);
  let added = 0;
  for (const player of others) {
    added += addCards(context.game, player, scaled, context.random);
  }
  const { taken, holders } = applyPicked(context, "discard");
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${others.length} enemy player(s) (${added} total).`,
      `${name} discards ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || "nobody"}.`,
    ],
  };
}

registerResolver("t1-scrapheap", scrapheap, {
  targets: { min: 1, max: 7 },
  steal: { min: 1, max: 7, mode: "discard" },
});

/** "Pick 1-15 cards from any enemies while seeing their cards, then give them to other players." */
function scrapstorm(context: EffectContext): EffectResult {
  const { taken, holders } = applyPicked(context, "give");
  const name = actorName(context);
  return {
    applied: true,
    log: [
      `${name} takes ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || "nobody"} and gives them to other players.`,
    ],
  };
}

registerResolver("t1-scrapstorm", scrapstorm, {
  targets: { min: 1, max: 15 },
  steal: { min: 1, max: 15, mode: "give" },
});

/** "+1 a random enemy, skip a random enemy for 1 turn, discard 1 card from any enemy while seeing their cards, and see all the cards of a random enemy." */
function jackOfAllTrades(context: EffectContext): EffectResult {
  const name = actorName(context);
  const others = otherPlayers(context.game, context.actor);
  const randomEnemy = (): Player | undefined => randomOf(others, context.random);

  const buffed = randomEnemy();
  const scaled = 1 * (context.amountMultiplier ?? 1);
  let buffLog = "";
  if (buffed) {
    addCards(context.game, buffed, scaled, context.random);
    buffLog = `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to random enemy ${buffed.name}.`;
  }

  const silenced = randomEnemy();
  let silenceLog = "";
  let skipLogs: string[] = [];
  if (silenced) {
    skipLogs = applySkipTurns(context.game, [silenced], 1, context.actor, context.random);
    silenceLog = `${name} skips random enemy ${silenced.name} for 1 turn.`;
  }

  const { taken, holders } = applyPicked(context, "discard");

  const seen = randomEnemy();
  let seeLog = "";
  if (seen) {
    revealHands(context.game, context.actor, [seen.id], false);
    seeLog = `${name} sees ${seen.name}'s ${seen.hand.length} card(s).`;
  }

  return {
    applied: true,
    log: [
      buffLog,
      silenceLog,
      `${name} discards ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || "an enemy"}.`,
      seeLog,
      ...skipLogs,
    ].filter(Boolean),
  };
}

registerResolver("t1-jack-of-all-trades", jackOfAllTrades, {
  targets: { min: 1, max: 1 },
  steal: { min: 1, max: 1, mode: "discard" },
});

/** "+4 2 enemy players, skip them for 4 turns, discard 1-4 cards from each while seeing their cards." */
function jackMaster(context: EffectContext): EffectResult {
  const targets = resolveTargets(context.game, context.actor, context.targets, 2, context.random);
  const name = actorName(context);
  if (targets.length === 0) {
    return { applied: false };
  }
  const scaled = 4 * (context.amountMultiplier ?? 1);
  let added = 0;
  for (const target of targets) {
    added += addCards(context.game, target, scaled, context.random);
  }
  const skipLogs = applySkipTurns(context.game, targets, 4, context.actor, context.random);
  const { taken, holders } = applyPicked(context, "discard");
  revealHands(
    context.game,
    context.actor,
    targets.map((target) => target.id),
    false,
  );
  return {
    applied: true,
    log: [
      `${name} adds ${scaled} card${scaled === 1 ? "" : "s"} to ${targets.map((t) => t.name).join(", ")} (${added} total) and skips them for 4 turns.`,
      `${name} discards ${taken.length} card(s) from ${holders.map((p) => p.name).join(", ") || "the targets"}.`,
      `${name} sees the cards of ${targets.map((t) => t.name).join(", ")}.`,
      ...skipLogs,
    ],
  };
}

registerResolver("t1-jack-master", jackMaster, {
  targets: { min: 2, max: 2 },
  steal: { min: 2, max: 8, mode: "discard", perPlayer: { min: 1, max: 4 } },
});

/** "See the cards of everyone and pick one to see their cards forever." */
function allSeeingEye(context: EffectContext): EffectResult {
  const name = actorName(context);
  revealHands(
    context.game,
    context.actor,
    context.game.players.map((player) => player.id),
    false,
  );
  const forever = context.targets?.[0];
  if (forever) {
    revealHands(context.game, context.actor, [forever], true);
  }
  const foreverName = forever ? playerName(context, forever) : "nobody";
  return {
    applied: true,
    log: [`${name} sees everyone's cards.`, `${name} will forever see ${foreverName}'s cards.`],
  };
}

registerResolver("t1-all-seeing-eye", allSeeingEye, {
  targets: { min: 1, max: 1, allowSelf: true },
});

/** "See all the cards permanently and skip anyone for 5 rounds." */
function omniscient(context: EffectContext): EffectResult {
  const name = actorName(context);
  revealHands(
    context.game,
    context.actor,
    context.game.players.map((player) => player.id),
    true,
  );
  const targetId = context.targets?.[0];
  const target = targetId ? context.game.getPlayer(targetId) : undefined;
  let skipLog = "";
  if (target) {
    const logs = applySkipTurns(context.game, [target], 5, context.actor, context.random);
    skipLog = `${name} skips ${target.name} for 5 turns.`;
    skipLog = [skipLog, ...logs].join(" ");
  }
  return {
    applied: true,
    log: [`${name} sees everyone's cards permanently.`, skipLog].filter(Boolean),
  };
}

registerResolver("t1-omniscient", omniscient, {
  targets: { min: 1, max: 1, allowSelf: true },
});

// ---- Wave 3: challenge — everyone must play a color card or draw the penalty ----

/**
 * "All [other] players must play a <color> card, otherwise +N them."
 * Auto-resolved: every challenged player who holds a card of the color plays
 * one (blindly, first match); anyone who cannot draws N instead.
 */
function colorChallenge(
  color: Color,
  penalty: number,
  includeSelf: boolean,
): (context: EffectContext) => EffectResult {
  return (context) => {
    const pool = includeSelf ? context.game.players : otherPlayers(context.game, context.actor);
    const scaled = penalty * (context.amountMultiplier ?? 1);
    const name = actorName(context);
    let played = 0;
    let drew = 0;
    for (const player of pool) {
      const card = player.hand.find((c) => c.color === color);
      if (card) {
        player.hand.splice(player.hand.indexOf(card), 1);
        context.game.pile.push(card);
        context.game.activeColor = color;
        played += 1;
      } else {
        addCards(context.game, player, scaled, context.random);
        drew += 1;
      }
    }
    return {
      applied: true,
      log: [
        `${name} challenges everyone to play a ${color} card (or draw ${scaled}).`,
        `${played} player(s) played a ${color} card, ${drew} could not and drew ${scaled}.`,
      ],
    };
  };
}

registerResolver("t3-midas-touch", colorChallenge("yellow", 4, true));
registerResolver("t3-flash-flood", colorChallenge("blue", 4, false));
registerResolver("t3-red-flag", colorChallenge("red", 4, false));
registerResolver("t3-green-thumb", colorChallenge("green", 4, false));

/** "Pick a player to play any + card, if they don't +5 them." */
function forceOfWill(context: EffectContext): EffectResult {
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!target) {
    return { applied: false };
  }
  const plus = target.hand.find((card) => card.type === "draw2" || card.type === "draw4");
  const scaled = 5 * (context.amountMultiplier ?? 1);
  const name = actorName(context);
  if (plus) {
    target.hand.splice(target.hand.indexOf(plus), 1);
    context.game.pile.push(plus);
    context.game.activeColor = plus.color ?? null;
    context.game.pendingDraw += plus.type === "draw4" ? 4 : 2;
    return {
      applied: true,
      log: [
        `${name} forces ${target.name} to play ${plus.name} (+${plus.type === "draw4" ? 4 : 2} pending).`,
      ],
    };
  }
  const added = addCards(context.game, target, scaled, context.random);
  return {
    applied: true,
    log: [`${name} forces ${target.name} to play a + card — none held, so they draw ${added}.`],
  };
}

registerResolver("t2-force-of-will", forceOfWill, { targets: { min: 1, max: 1 } });

// ---- Wave 4: timed / deferred — round-delayed resolution (see effects/deferred.ts) ----

/**
 * "Give 2 cards to any player and return the cards in 4 rounds. To play, you must have
 * 6+ cards." 2 random cards leave the actor's hand for the target; the same card ids
 * return to the actor 4 rounds later (only what the target still holds).
 */
function futureMarket(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const cost: CostSpec = { count: 6, match: "any", label: "6+ cards", mode: "hold" };
  if (payCost(actor, cost) < cost.count) {
    return { applied: false, log: [`${actor.name} must hold 6+ cards to play Future Market.`] };
  }
  const target = resolveTargets(context.game, context.actor, context.targets, 1, context.random)[0];
  if (!target) {
    return { applied: false };
  }
  const given = takeRandom(actor.hand, 2, context.random);
  target.hand.push(...given);
  scheduleDeferred(context.game, {
    kind: "return-cards",
    triggerRound: (context.roundPlayed ?? context.game.round) + 4,
    actorId: actor.id,
    holderId: target.id,
    cardIds: given.map((card) => card.id),
  });
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} gives ${given.length} card(s) to ${target.name}; they return in 4 rounds.`],
  };
}

registerResolver("t3-future-market", futureMarket, {
  targets: { min: 1, max: 1, allowSelf: true },
  cost: { count: 6, match: "any", label: "6+ cards", mode: "hold" },
});

/** Removes a card from the pile by reference, falling back to id (already returned = no-op). */
function removeFromPile(pile: Card[], card: Card): boolean {
  const byRef = pile.lastIndexOf(card);
  if (byRef >= 0) {
    pile.splice(byRef, 1);
    return true;
  }
  const byId = pile.findIndex((candidate) => candidate.id === card.id);
  if (byId >= 0) {
    pile.splice(byId, 1);
    return true;
  }
  return false;
}

/**
 * "Return played cards by 3 turns." Undoes the last 3 plays (before the token itself):
 * the cards come off the pile and go back to the hands of the players who played them.
 */
function implodedClockwork(context: EffectContext): EffectResult {
  const name = actorName(context);
  const entries = context.game.pileLog.slice(0, -1).slice(-3);
  let returned = 0;
  for (const entry of entries) {
    if (!removeFromPile(context.game.pile, entry.card)) {
      continue;
    }
    const owner = context.game.getPlayer(entry.playerId);
    if (owner) {
      owner.hand.push(entry.card);
      returned += 1;
    }
  }
  return {
    applied: true,
    log: [`${name} rewinds time — ${returned} card(s) return to their players' hands.`],
  };
}

registerResolver("t3-imploded-clockwork", implodedClockwork);

/** "You can't draw in the deck for 2 rounds. You are skipped instead." */
function liquidation(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  actor.liquidationUntilRound = (context.roundPlayed ?? context.game.round) + 2;
  return {
    applied: true,
    log: [`${actor.name} can't draw for 2 rounds — they are skipped instead.`],
  };
}

registerResolver("t3-liquidation", liquidation);

/** "Get 2 Diamond Vaults. After 3 rounds, +15 and discard your Vaults." */
function allIn(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const tokens = grantVaultTokens(context.game, actor, "vault-diamond", 2, context.random);
  scheduleDeferred(context.game, {
    kind: "all-in",
    triggerRound: (context.roundPlayed ?? context.game.round) + 3,
    actorId: actor.id,
  });
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} gains ${tokens.length} Diamond Vault token(s); All In pays out in 3 rounds.`],
  };
}

registerResolver("t3-all-in", allIn);

/**
 * "Double the cards of everyone after 15 rounds divided by 1.5." Playtest interpretation:
 * when the 15th round passes, each player draws a third of their hand (≈ double, then /1.5).
 */
function greenTide(context: EffectContext): EffectResult {
  scheduleDeferred(context.game, {
    kind: "green-tide",
    triggerRound: (context.roundPlayed ?? context.game.round) + 15,
  });
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} sets the Green Tide rolling — everyone's cards swell after 15 rounds.`],
  };
}

registerResolver("t3-green-tide", greenTide);

// ---- Wave 5: event-driven passives (see effects/events.ts for the event hooks) ----

/** Registers a passive tied to the actor; the resolver itself just activates it. */
function registerPassive(
  build: (ownerId: string) => PassiveState,
): (context: EffectContext) => EffectResult {
  return (context) => {
    const actor = actorPlayer(context);
    if (!actor) {
      return { applied: false };
    }
    const passive = build(actor.id);
    addPassive(context.game, passive);
    return { applied: true, log: [`${actor.name} activates the ${passive.kind} passive.`] };
  };
}

/** Next player in the current direction (same formula as `engine.stepIndex`). */
function nextSeat(room: Room, fromIndex: number, steps = 1): Player | undefined {
  const n = room.players.length;
  if (n === 0) {
    return undefined;
  }
  const raw = fromIndex + room.currentDirection * steps;
  const index = ((raw % n) + n) % n;
  return room.players[index];
}

registerResolver(
  "t3-accumulation",
  registerPassive((ownerId) => ({ kind: "accumulation", ownerId })),
);
registerResolver(
  "t3-investment",
  registerPassive((ownerId) => ({ kind: "investment", ownerId })),
);

/** "Pick a player, that player will be +1 every time they play a blue or red card." */
registerResolver(
  "t2-most-wanted",
  (context) => {
    const actor = actorPlayer(context);
    const target = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    if (!actor || !target) {
      return { applied: false };
    }
    addPassive(context.game, { kind: "most-wanted", ownerId: actor.id, targetId: target.id });
    return { applied: true, log: [`${actor.name} marks ${target.name} as Most Wanted.`] };
  },
  { targets: { min: 1, max: 1 } },
);

/** "Pick a player, whenever they play a green card, discard a card from your hand." */
registerResolver(
  "t2-parasitism",
  (context) => {
    const actor = actorPlayer(context);
    const target = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    if (!actor || !target) {
      return { applied: false };
    }
    addPassive(context.game, { kind: "parasitism", ownerId: actor.id, targetId: target.id });
    return { applied: true, log: [`${actor.name} infests ${target.name} with Parasitism.`] };
  },
  { targets: { min: 1, max: 1 } },
);

/** "Pick 2 players, neither of them can win until both of their hands are reduced to 1." */
registerResolver(
  "t2-cruelty",
  (context) => {
    const actor = actorPlayer(context);
    const victims = resolveTargets(context.game, context.actor, context.targets, 2, context.random);
    if (!actor || victims.length < 2) {
      return { applied: false };
    }
    addPassive(context.game, {
      kind: "cruelty",
      ownerId: actor.id,
      victims: victims.map((victim) => victim.id),
    });
    return {
      applied: true,
      log: [`${actor.name} marks ${victims.map((v) => v.name).join(" and ")} with Cruelty.`],
    };
  },
  { targets: { min: 2, max: 2 } },
);

/** "Whenever you skip an enemy player +3 them. Skip the next player." */
registerResolver("t1-tyranny", (context) => {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  addPassive(context.game, { kind: "tyranny", ownerId: actor.id });
  const logs = [`${actor.name} activates the tyranny passive.`];
  const next = nextSeat(context.game, context.game.getPlayerIndex(actor.id), 1);
  if (next) {
    logs.push(...applySkipTurns(context.game, [next], 1, actor.id, context.random));
  }
  return { applied: true, log: logs };
});

registerResolver(
  "t1-equality",
  registerPassive((ownerId) => ({ kind: "equality", ownerId })),
);

/** "You can play 2 cards in your turn, some special cards have effects and +2 to all enemy players." */
registerResolver(
  "t1-zephyr",
  registerPassive((ownerId) => ({ kind: "zephyr", ownerId, playsThisTurn: 0 })),
);

/** "All your red cards have +1. Gain additional + if you played Offerings/Ruin before prayers." */
registerResolver("t1-prayers", (context) => {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const played = actor.playedEffectIds ?? [];
  const playedOfferings = played.includes("t3-offerings");
  const playedRuin = played.includes("t2-ruin");
  const bonus = playedOfferings && playedRuin ? 4 : playedOfferings ? 1 : playedRuin ? 2 : 0;
  addPassive(context.game, { kind: "prayers", ownerId: actor.id, bonus });
  return {
    applied: true,
    log: [
      `${actor.name} prays — red cards grant +${1 + bonus}${bonus > 0 ? ` (${bonus} from Offerings/Ruin played before)` : ""}.`,
    ],
  };
});

/** "All your moves are now doubled." (Playtest reading: the owner's effects and + cards.) */
registerResolver(
  "t1-ultimate-machine-form",
  registerPassive((ownerId) => ({ kind: "ultimate-machine-form", ownerId })),
);

/** "No one can play their last card if you're still in the game. ... Everyone can see everyone's cards." */
registerResolver("t1-silver-tongue", (context) => {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  addPassive(context.game, { kind: "silver-tongue", ownerId: actor.id });
  const logs = [`${actor.name}'s Silver Tongue reveals every hand to every player.`];
  for (const viewer of context.game.players) {
    revealHands(
      context.game,
      viewer.id,
      context.game.players.map((player) => player.id),
      true,
    );
  }
  return { applied: true, log: logs };
});

/** "All enemies with more than 2 cards gain Bleed ... at 5 stacks, +20 them and reset." */
registerResolver("t1-maim", (context) => {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const passive: PassiveState = { kind: "maim", ownerId: actor.id, bleed: new Map() };
  addPassive(context.game, passive);
  const logs = [`${actor.name} activates Maim — enemies gain Bleed as they hoard cards.`];
  logs.push(...recomputeBleed(context.game, passive, context.random).logs);
  return { applied: true, log: logs };
});

/** "Pick a player to infect ... +1 them and +2 to all other enemies ... until it reaches the host again." */
registerResolver(
  "t1-scourge",
  (context) => {
    const actor = actorPlayer(context);
    const target = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    if (!actor || !target) {
      return { applied: false };
    }
    const passive: PassiveState = { kind: "scourge", ownerId: actor.id, infecteeId: target.id };
    addPassive(context.game, passive);
    const logs = [`${actor.name} infects ${target.name} with the Scourge.`];
    logs.push(...advanceScourge(context.game, passive, context.random).logs);
    return { applied: true, log: logs };
  },
  { targets: { min: 1, max: 1 } },
);

/** "All enemy players cannot use special cards anymore ... Deadweight ... removed at 30 total or +4 each in 20 rounds." */
registerResolver("t1-cutthroat", (context) => {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const passive: PassiveState = {
    kind: "cutthroat",
    ownerId: actor.id,
    startedAtRound: context.roundPlayed ?? context.game.round,
  };
  addPassive(context.game, passive);
  const logs = [`${actor.name} activates Cutthroat — enemy special cards are now Deadweight.`];
  logs.push(...checkCutthroat(context.game, passive, context.random).logs);
  return { applied: true, log: logs };
});
