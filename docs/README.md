---
title: BRUNO Documentation Index
status: draft
source: project analysis + "1.4 BRUNO.pdf"
updated: 2026-08-09
tags: [index, documentation]
---

# BRUNO Documentation

BRUNO is a real-time multiplayer card game — "UNO with superpowers". This folder is the
single source of truth for game design, card data, architecture, and the modernization
plan for the codebase.

## How to use this documentation

1. Read `STYLE.md` first if you are authoring or editing docs.
2. Start with `00-glossary.md` for the vocabulary used everywhere else.
3. Use `game/` for how the game works and what cards exist.
4. Use `architecture/` for how the code is (and will be) structured.
5. Use `modernization.md` for the agent-executable roadmap to rebuild the project.
6. `card-data-schema.md` defines the TypeScript shape that card data must satisfy in code.

## Index

| Doc                               | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `STYLE.md`                        | Authoring conventions for these docs (agent-optimal).        |
| `00-glossary.md`                  | Canonical definitions for every term used in this project.   |
| `development.md`                  | Local development: setup, run, verify, layout, notes.        |
| `stack.md`                        | Current stack vs. target stack with rationale.               |
| `card-data-schema.md`             | TypeScript types for cards, decks, and game events.          |
| `modernization.md`                | Phased roadmap to modernize server + client.                 |
| `figma-make-prompt-guide.md`      | Prompt + iteration guide for designing the UI in Figma Make. |
| `game/overview.md`                | Game concept, objective, and round flow.                     |
| `game/rules.md`                   | Core rules: turns, playing, drawing, stacking, winning.      |
| `game/deck-composition.md`        | What cards are in the deck and in what quantities.           |
| `game/vault-mechanism.md`         | How vault tokens offer 5 random tier effects.                |
| `game/cards-tier3-silver.md`      | Tier III (Silver Vault) card catalog.                        |
| `game/cards-tier2-gold.md`        | Tier II (Gold Vault) card catalog.                           |
| `game/cards-tier1-diamond.md`     | Tier I (Diamond Vault) card catalog.                         |
| `game/locations.md`               | Location cards and their effects.                            |
| `game/mayhem.md`                  | Per-round Mayhem events.                                     |
| `game/origins.md`                 | Origin Vaults (starting powers).                             |
| `game/special-systems.md`         | Pandora's Box, Masterchef, Fateweaver, artifacts.            |
| `architecture/current.md`         | How the current code is structured and its known flaws.      |
| `architecture/target.md`          | Target monorepo structure after modernization.               |
| `architecture/socket-contract.md` | Client ↔ server event contract (current + proposed).         |
| `architecture/state-model.md`     | Game state, player identity, and hand-visibility rules.      |

## Source material

- **Game design / card set:** `1.4 BRUNO.pdf` (13 pages) in the repo root. Text was
  extracted programmatically from the PDF's ToUnicode CMaps because the file is a
  Google Docs render with no text layer. Card names/effects are transcribed into
  `game/cards-*.md` with page references.
- **Current implementation:** the old prototype in `legacy/` (`index.js`, `game.js`,
  `views/game.html`, `assets/`). Behavior was read directly from source and documented in
  `architecture/current.md`.

## Status legend

| Status      | Meaning                                                       |
| ----------- | ------------------------------------------------------------- |
| `stable`    | Confirmed by the user and/or fully specified in the PDF.      |
| `draft`     | Written from best-effort extraction; needs user confirmation. |
| `tentative` | Marked `[Tentative]` in the PDF; design not final.            |
| `proposed`  | Proposed design for the modernization; not yet implemented.   |
