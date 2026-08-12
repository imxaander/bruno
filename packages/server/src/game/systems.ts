import type { Card, VaultCardType } from "@bruno/shared";
import { cardsByType, MAYHEM_EVENTS } from "@bruno/shared";
import { addCards, grantVaultTokens, randomOf } from "./effects/helpers.js";
import type { Player, Room } from "./room.js";
import type { Rng } from "./deck.js";

function chooseRandom<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  return items[Math.floor(rng() * items.length)];
}

export function chooseRandomLocation(rng: Rng): string | undefined {
  return chooseRandom(cardsByType("location"), rng)?.id;
}

export function chooseRandomOrigin(rng: Rng): string | undefined {
  return chooseRandom(cardsByType("origin"), rng)?.id;
}

export function chooseRandomMayhem(rng: Rng): string | undefined {
  return chooseRandom(MAYHEM_EVENTS, rng)?.id;
}

export function applyLocationStart(room: Room, rng: Rng): string[] {
  if (!room.locationId) {
    return [];
  }

  switch (room.locationId) {
    case "loc-fields": {
      const log: string[] = ["Location: Fields — all players draw 1 card."];
      for (const player of room.players) {
        const drawn = addCards(room, player, 1, rng);
        log.push(`${player.name} draws ${drawn} card${drawn === 1 ? "" : "s"} from Fields.`);
      }
      return log;
    }
    case "loc-silver-prairie":
      return ["Location: Silver Prairie — each player may trade one card with each other player once."];
    case "loc-desert":
      return ["Location: Desert — a random player is skipped at the beginning of the game."];
    case "loc-scorched-earth":
      return ["Location: Scorched Earth — players with 1 card may be rescued by the leader."];
    case "loc-ocean":
      return ["Location: Ocean — the first vault any player plays is a Diamond Vault."];
    case "loc-abyssal-depths":
      return ["Location: Abyssal Depths — all vaults are Diamond Vault."];
    case "loc-volcano":
      return ["Location: Volcano — Silver and Gold effects are doubled."];
    case "loc-hell-gate":
      return ["Location: Hell Gate — Diamond Vault behavior is active."];
    default:
      return [`Location: ${room.locationId} is active.`];
  }
}

export function applyOriginStart(room: Room, player: Player, rng: Rng): string[] {
  if (!player.originId) {
    return [];
  }
  switch (player.originId) {
    case "origin-vault-keeper": {
      const tokens = grantVaultTokens(room, player, "vault-gold", 1, rng);
      return [`${player.name} begins as Vault Keeper and gains ${tokens.length} Gold Vault.`];
    }
    case "origin-technomancer":
      return [`${player.name} begins as Technomancer.`];
    case "origin-grand-architect":
      return [`${player.name} begins as Grand Architect.`];
    case "origin-masterchef":
      return [`${player.name} begins as Masterchef.`];
    case "origin-fateweaver":
      return [`${player.name} begins as Fateweaver.`];
    default:
      return [];
  }
}

export function applyMayhem(room: Room, rng: Rng): string[] {
  if (!room.mayhemEventId) {
    return [];
  }
  const event = MAYHEM_EVENTS.find((entry) => entry.id === room.mayhemEventId);
  if (!event) {
    return [`Mayhem event ${room.mayhemEventId} could not be found.`];
  }

  const log: string[] = [`Mayhem begins: ${event.name}. ${event.effect}`];
  switch (event.id) {
    case "mayhem-1": {
      const target = chooseRandom(room.players, rng);
      if (target) {
        const drawn = addCards(room, target, 1, rng);
        log.push(`${target.name} draws ${drawn} card${drawn === 1 ? "" : "s"}.`);
      }
      break;
    }
    case "mayhem-2": {
      const target = chooseRandom(room.players, rng);
      if (target) {
        const drawn = addCards(room, target, 4, rng);
        log.push(`${target.name} draws ${drawn} cards.`);
      }
      break;
    }
    case "mayhem-3": {
      for (const player of room.players) {
        const drawn = addCards(room, player, 6, rng);
        log.push(`${player.name} draws ${drawn} cards.`);
      }
      const least = [...room.players].sort((a, b) => a.hand.length - b.hand.length)[0];
      if (least) {
        const extra = addCards(room, least, 4, rng);
        log.push(`${least.name} draws ${extra} extra cards for having the fewest cards.`);
      }
      break;
    }
    case "mayhem-7": {
      const sorted = [...room.players].sort((a, b) => a.hand.length - b.hand.length);
      const least = sorted[0];
      const most = sorted[sorted.length - 1];
      if (least && most && least !== most) {
        const leastHand = least.hand.splice(0, least.hand.length);
        const mostHand = most.hand.splice(0, most.hand.length);
        least.hand.push(...mostHand);
        most.hand.push(...leastHand);
        log.push(`${least.name} and ${most.name} swap hands.`);
      }
      break;
    }
    case "mayhem-8": {
      for (const player of room.players) {
        const count = player.hand.length;
        player.hand.length = 0;
        const drawn = addCards(room, player, count, rng);
        log.push(`${player.name} discards and redraws ${drawn} card${drawn === 1 ? "" : "s"}.`);
      }
      break;
    }
    case "mayhem-9": {
      for (const player of room.players) {
        const kept = player.hand.slice(0, 1);
        const removed = player.hand.length - kept.length;
        player.hand = kept;
        log.push(`${player.name} reduces hand to 1 card, discarding ${removed}.`);
      }
      break;
    }
    default:
      log.push(`Mayhem event ${event.name} has no implemented effect yet.`);
      break;
  }
  return log;
}
