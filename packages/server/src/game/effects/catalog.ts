import { isVaultTokenCard } from "@bruno/shared";
import { addCards, otherPlayers, randomOf, resolveTargets } from "./helpers.js";
import { registerResolver } from "./registry.js";
import { actorPlayer, type EffectContext, type EffectResult } from "./types.js";
import { shuffle } from "../deck.js";

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
    let added = 0;
    for (const player of others) {
      added += addCards(context.game, player, amount, context.random);
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${amount} card${amount === 1 ? "" : "s"} to ${others.length} enemy player(s) (${added} total).`,
      ],
    };
  };
}

/** "+N to N players" — uses explicit targets, falling back to random others. */
function plusToTwoPlayers(amount: number): (context: EffectContext) => EffectResult {
  return (context) => {
    const targets = resolveTargets(context.game, context.actor, context.targets, 2, context.random);
    let added = 0;
    for (const player of targets) {
      added += addCards(context.game, player, amount, context.random);
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${amount} card${amount === 1 ? "" : "s"} to ${targets.length} player(s) (${added} total).`,
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
    const enemy = resolveTargets(
      context.game,
      context.actor,
      context.targets,
      1,
      context.random,
    )[0];
    addCards(context.game, actor, selfAmount, context.random);
    let enemyAdded = 0;
    let enemyName = "nobody";
    if (enemy) {
      enemyAdded = addCards(context.game, enemy, enemyAmount, context.random);
      enemyName = enemy.name;
    }
    const name = actorName(context);
    return {
      applied: true,
      log: [
        `${name} adds ${selfAmount} card${selfAmount === 1 ? "" : "s"} to themselves and ${enemyAmount} to ${enemyName} (${enemyAdded}).`,
      ],
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
    const added = addCards(context.game, target, add, context.random);
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
      log: [`${name} hits ${target.name}: +${add} and discards ${discarded} card(s) at random.`],
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

/** "Pick 3 players and steal 2 random vaults from them." */
function vaultHunter(context: EffectContext): EffectResult {
  const actor = actorPlayer(context);
  if (!actor) {
    return { applied: false };
  }
  const targets = resolveTargets(context.game, context.actor, context.targets, 3, context.random);
  let stolen = 0;
  const targetNames: string[] = [];
  for (const target of targets) {
    const vaults = target.hand.filter(isVaultTokenCard);
    for (let i = 0; i < 2; i += 1) {
      const card = randomOf(vaults, context.random);
      if (!card) {
        break;
      }
      vaults.splice(vaults.indexOf(card), 1);
      target.hand.splice(target.hand.indexOf(card), 1);
      actor.hand.push(card);
      stolen += 1;
    }
    targetNames.push(target.name);
  }
  const name = actorName(context);
  return {
    applied: true,
    log: [`${name} steals ${stolen} vault token(s) from ${targetNames.join(", ") || "nobody"}.`],
  };
}

registerResolver("t2-vault-hunter", vaultHunter, { targets: { min: 3, max: 3 } });

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
