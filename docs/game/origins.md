---
title: Origin Vaults
status: draft
source: "1.4 BRUNO.pdf p.9"
updated: 2026-08-09
tags: [game, origins]
---

# Origin Vaults

Origin Vaults are starting powers. A player picks one before the game begins. There are five
origins. Grand Architect and Masterchef have sub-systems documented separately in
`special-systems.md`.

## Origins

| Id                       | Name            | Effect (verbatim from PDF)                                                                                                                                          | Source | Notes                                                                 |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `origin-vault-keeper`    | Vault Keeper    | Greed is good. Get a Gold Vault at the start of the game.                                                                                                           | p.9    |                                                                       |
| `origin-technomancer`    | Technomancer    | Technology at its finest. Your vaults have a chance to get another vault of the same type. 43% Silver, 20% Gold, 10% Diamond.                                       | p.9    | When you obtain a vault, chance to also get another of the same type. |
| `origin-grand-architect` | Grand Architect | Your Reality. Construct Pandora's Box. This can only be used once you use a vault. You can upgrade your Pandora's Box by using better vaults.                       | p.9    | See Pandora's Box in `special-systems.md`.                            |
| `origin-masterchef`      | Masterchef      | Let him Cook. You're cooking a food and can keep perfecting it. Red cards will speed up your cooking by 1 round. Serving your dish early will end your Masterpiece. | p.9    | See dish table in `special-systems.md`.                               |
| `origin-fateweaver`      | Fateweaver      | Winners mindset. Have a slot machine, you can spin it as many times depending on your card.                                                                         | p.9    | See Fateweaver tables in `special-systems.md`.                        |

## Technomancer probabilities

| Vault type | Duplicate chance |
| ---------- | ---------------- |
| Silver     | 43%              |
| Gold       | 20%              |
| Diamond    | 10%              |

## Open questions

1. Can a player change their Origin between games, and how is it chosen (UI)?
2. Are Origins exclusive (one per player) and mutually exclusive?
3. "This can only be used once you use a vault" (Grand Architect) — clarify activation timing.

## Implementation status

No Origin Vaults are implemented in the current codebase.
