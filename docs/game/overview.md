---
title: Game Overview
status: draft
source: "1.4 BRUNO.pdf p.1 + current implementation"
updated: 2026-08-10
tags: [game, overview]
---

# Game Overview

BRUNO is a real-time multiplayer card game described in the codebase as _"a game like goono
but with fucking superpowers"_.

## Concept

- Players compete in a UNO-like game: match the top card of the pile by **color or number**,
  get rid of your hand first.
- The twist: **Vault cards** (Tier I/II/III), **Locations**, **Mayhem**, and **Origin
  Vaults** add powerful, chaotic effects — the "superpowers".

## Objective

Be the first player to empty your hand and win the game. Winning triggers post-win effects
(Ticket to Paradise, Arise, etc.) and feeds the Fateweaver streak system
(see [special-systems.md](./special-systems.md)).

## Player count

- Current implementation: 1–8 players per room (lobby UI shows `X / 8`).
- Some cards are player-count restricted (e.g. `Rewind` is _"4 or more players only"_).

## Round flow

1. **Lobby** — players join a room; host starts the game.
2. **Setup** — each player draws 8 cards; the deck is shuffled; a card is placed on the pile;
   a random player is picked to go first.
3. **Turn** — the current player plays a valid card, or **draws** when they have no playable
   card (7-second timer; a draw on timeout is automatic, and an open action prompt gets a
   default choice instead). While a draw-stack is pending they
   may instead draw the total to eat the stack. Drawing always ends the turn.
4. **Resolution** — played card effects apply (skip, reverse, draw stacking, vault effects).
5. **Advance** — turn passes to the next player in direction (with skip handling).
6. **Repeat** — rounds continue until a player empties their hand.
7. **After-game** — win/lose recorded (Fateweaver streaks), post-win effects resolve.

## Design pillars (from PDF 1.4)

- **Vaults escalate power** — Silver (Tier III) < Gold (Tier II) < Diamond (Tier I).
- **Passives change the rules for their owner** ([P] / [sP]).
- **Enemy targeting** — many effects are aimed at _enemy players_, implying team/ally
  mechanics (Double Trouble, Foedus, Triple Threat).
- **Chaos sources** — Locations (static), Mayhem (per round), Origins (starting powers).

## What is implemented today vs. designed

| Area                                    | Designed (PDF 1.4)         | Implemented (code)      |
| --------------------------------------- | -------------------------- | ----------------------- |
| Number cards 0–9 (4 colors)             | Yes                        | Yes (1× each per color) |
| Skip / Reverse / +2 / +4                | Yes                        | Yes (with stacking)     |
| Vault cards (Tier I/II/III)             | Full catalog               | **None**                |
| Locations                               | 8 base + 10 rank locations | **None**                |
| Mayhem                                  | 9 events                   | **None**                |
| Origin Vaults                           | 5 origins                  | **None**                |
| Fateweaver / Masterchef / Pandora's Box | Full tables                | **None**                |

See [deck-composition.md](./deck-composition.md) and `architecture/current.md` for details.
