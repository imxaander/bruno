---
title: Documentation Style Guide
status: stable
source: project convention
updated: 2026-08-09
tags: [style, agents]
---

# Documentation Style Guide

These docs are written to be **agent-optimal**: a coding agent (or human) should be able to
read any single document and act on it without guessing. Follow these rules strictly.

## 1. Frontmatter

Every `.md` file in `docs/` MUST start with YAML frontmatter:

```yaml
---
title: Short Human Title
status: draft # stable | draft | tentative | proposed
source: 1.4 BRUNO.pdf p.1
updated: 2026-08-09 # YYYY-MM-DD
tags: [game, cards]
---
```

`source` is mandatory when content is derived from the PDF or from reading source code.
Use `1.4 BRUNO.pdf p.N` for page references.

## 2. Filenames and slugs

- Lowercase, `kebab-case`, `.md` only. No code files in `docs/`.
- Card ids in tables use `slug` form: `t3-hush`, `t2-force-of-will`, `t1-finality`.

## 3. Heading hierarchy

- `#` only in frontmatter-bound files (the file title).
- `##` for top-level sections, `###` for subsections. Never skip a level.

## 4. Tables for data

All card statistics, deck counts, probabilities, and event payloads go in Markdown tables.

- First row is the header; repeat the header on every table (don't split).
- Use `—` for unknown / not-yet-specified values. Do not invent numbers.
- Column `Status` uses the status legend from `README.md`.

## 5. Terminology discipline

- Use the exact glossary terms from `00-glossary.md`. If you need a new term, add it there
  first, then link to it.
- Card effects MUST use the canonical notation: `+N` (add N cards), `[P]` (passive),
  `[sP]` (special passive), `[Tentative]`, `NEW`, `To play:` conditions.
- Quote card text verbatim when it is ambiguous, then give the interpreted meaning.

## 6. Cross-references

Use relative links to other docs, e.g. `[+2/+4 stacking](../game/rules.md#draw-stacking)`.
Anchor ids must match generated GitHub ids for the target heading.

## 7. Completeness rules

- Every card from the PDF MUST appear in exactly one `game/cards-*.md` table. No orphans.
- Every table MUST have a `Source` column referencing the PDF page (e.g. `p.1`).
- When a card's effect is partially unreadable in the PDF, write the readable part and put
  `(text unreadable in PDF)` — never invent wording.
- Unimplemented behavior is recorded in the same document it describes, under
  `## Implementation status`, with the `draft` status.

## 8. Link anchor rules for agents

When an agent needs to jump to a rule, use the format:

```markdown
[draw stacking rule](../game/rules.md#draw-stacking)
```

Headings are `## 4. Draw stacking (+2/+4)` → anchor `#4-draw-stacking-24-4`. Prefer keeping
headings short so anchors are stable. Avoid changing a heading after it has been referenced.

## 9. Do not duplicate

If information exists in one doc, reference it. Do not copy tables into multiple files
(exception: a summary may point to the canonical table).
