---
title: Glossary
status: draft
source: "1.4 BRUNO.pdf + current implementation"
updated: 2026-08-09
tags: [glossary, terms]
---

# Glossary

Canonical definitions for every term used across this documentation. When writing docs or
code, use these terms exactly.

## Card system terms

| Term                        | Definition                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Number card**             | A card with a color (Red/Blue/Green/Yellow) and a number 0–9. The basic playable card.                                                                                     |
| **Special card**            | Any non-number card: Skip, Reverse, +2, +4, Vaults, etc.                                                                                                                   |
| **Vault**                   | A tiered family of powerful special cards. Vaults are NOT part of the base 110-card deck by default; they enter play through cards, Origins, Locations, and other effects. |
| **Tier I / Diamond Vault**  | Highest-tier vault cards. Strongest effects.                                                                                                                               |
| **Tier II / Gold Vault**    | Mid-tier vault cards.                                                                                                                                                      |
| **Tier III / Silver Vault** | Lowest-tier vault cards.                                                                                                                                                   |
| **[P] (Passive)**           | A permanent modifier that stays active once the card enters play.                                                                                                          |
| **[sP] (Special passive)**  | A one-shot or temporary passive effect that triggers on a specific future event (e.g. "the next special card you receive").                                                |
| **[Tentative]**             | Design not final; explicitly flagged in the PDF. Do not implement without confirmation.                                                                                    |
| **NEW**                     | Card was newly added to the design (PDF 1.4).                                                                                                                              |
| **+N**                      | Give N cards to the target (usually from the deck). "`+4`" = make the target draw 4 cards.                                                                                 |
| **Skip**                    | The target player loses their turn.                                                                                                                                        |
| **Enemy player**            | A player who is not you and not your ally.                                                                                                                                 |
| **Ally**                    | A player you have a partnership with (via Double Trouble, Foedus, Triple Threat, etc.).                                                                                    |
| **Deadweight**              | A special card that cannot be played, discarded, or traded (from Cutthroat).                                                                                               |

## Game-flow terms

| Term              | Definition                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Round**         | One full pass of play through the turn order. A "turn" is one player's play window.                                       |
| **Turn timer**    | 5-second limit for a player to act, after which they auto-draw (current implementation).                                  |
| **Pile**          | The discard/played-card stack. The top card determines what can be played next.                                           |
| **Deck**          | The face-down draw stack.                                                                                                 |
| **Draw stacking** | The +2/+4 chain: playing a draw card while a draw effect is pending adds to the total the next non-draw player must draw. |
| **Location**      | A board/environment card that modifies rules for the whole game (Fields, Volcano, etc.).                                  |
| **Mayhem**        | A random event applied at the start of every round.                                                                       |
| **Origin Vault**  | A starting-power card chosen before the game (Vault Keeper, Technomancer, Grand Architect, Masterchef, Fateweaver).       |
| **Host**          | The player who created the room and may start the game.                                                                   |
| **Lobby**         | Pre-game room where players gather before the game starts.                                                                |

## Implementation terms

| Term                | Definition                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **ClientGameState** | The per-player view of game state sent to a client. See `architecture/state-model.md`.                     |
| **Socket event**    | A named message over Socket.io, `client→server` or `server→client`. See `architecture/socket-contract.md`. |
| **Game id**         | `Game.id`, a random number used to identify a room.                                                        |
| **Player id**       | `Player.id`, a client-generated string (currently `PID` prefix) stored in `localStorage`.                  |
