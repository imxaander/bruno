import type { CSSProperties } from "react";
import { getCard, type CardType, type CardView } from "@bruno/shared";

type CardSize = "sm" | "md" | "lg";

interface CardFaceProps {
  card: CardView;
  size?: CardSize;
  playable?: boolean;
  className?: string;
}

function typeGlyph(type: CardType): string {
  switch (type) {
    case "skip":
      return "⊘";
    case "reverse":
      return "⟲";
    case "draw2":
      return "+2";
    case "draw4":
      return "+4";
    case "switch-color":
      return "◐";
    case "shuffle":
      return "⇄";
    default:
      return "";
  }
}

export function CardFace({ card, size = "md", playable = false, className }: CardFaceProps) {
  const full = getCard(card.id);
  const isVault = card.type.startsWith("vault-");
  const isDark = card.type === "draw4" || card.type === "switch-color" || card.type === "shuffle";

  const label = isVault
    ? full
      ? full.name.charAt(0).toUpperCase()
      : "★"
    : card.number !== undefined
      ? String(card.number)
      : typeGlyph(card.type);

  const style = {
    "--card-color": card.color ? `var(--bruno-card-${card.color})` : undefined,
    "--card-tier": isVault ? `var(--bruno-tier-${card.type.slice("vault-".length)})` : undefined,
  } as CSSProperties;

  const classes = [
    "card",
    `card-${size}`,
    isVault ? "card-vault" : "",
    isDark ? "card-dark" : "",
    playable ? "card-playable" : "",
    className ?? "",
  ]
    .join(" ")
    .trim();

  return (
    <div className={classes} style={style}>
      <span className="card-glyph">{label}</span>
      {full ? <span className="card-caption">{full.name}</span> : null}
    </div>
  );
}

interface CardBackProps {
  size?: CardSize;
  count?: number;
  className?: string;
}

export function CardBack({ size = "md", count, className }: CardBackProps) {
  const classes = ["card", "card-back", `card-${size}`, className ?? ""].join(" ").trim();
  return (
    <div className={classes}>
      <span className="card-back-mark">B</span>
      {count !== undefined ? <span className="card-count-badge">{count}</span> : null}
    </div>
  );
}
