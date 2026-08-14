import type { CSSProperties } from "react";
import { getCard, type CardType, type CardView } from "@bruno/shared";

export type CardColor = "red" | "blue" | "green" | "yellow";
export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";
export type VaultTier = "silver" | "gold" | "diamond";

interface GameCardProps {
  color?: CardColor;
  value?: string;
  size?: CardSize;
  faceDown?: boolean;
  dimmed?: boolean;
  vault?: VaultTier;
  dark?: boolean;
  lifted?: boolean;
  card?: CardView;
  style?: CSSProperties;
}

const GRADIENTS: Record<CardColor, string> = {
  red: "linear-gradient(175deg, #ff5060 0%, #d8001e 42%, #8c0016 100%)",
  blue: "linear-gradient(175deg, #55aaff 0%, #0044dd 42%, #002899 100%)",
  green: "linear-gradient(175deg, #55ffaa 0%, #00bb44 42%, #006628 100%)",
  yellow: "linear-gradient(175deg, #ffe966 0%, #ffcc00 42%, #a87800 100%)",
};

const GLOWS_DIM: Record<CardColor, string> = {
  red: "rgba(255,50,70,0.35)",
  blue: "rgba(0,100,255,0.35)",
  green: "rgba(0,210,90,0.35)",
  yellow: "rgba(255,200,0,0.35)",
};

const GLOWS_BRIGHT: Record<CardColor, string> = {
  red: "rgba(255,50,70,0.92)",
  blue: "rgba(0,100,255,0.92)",
  green: "rgba(0,210,90,0.92)",
  yellow: "rgba(255,200,0,0.92)",
};

const TEXT: Record<CardColor, string> = {
  red: "#fff",
  blue: "#fff",
  green: "#fff",
  yellow: "#1a0f00",
};

const DIMS: Record<CardSize, { w: number; h: number; r: number; fs: number; cf: number }> = {
  xs: { w: 34, h: 48, r: 4, fs: 19, cf: 8 },
  sm: { w: 52, h: 74, r: 6, fs: 31, cf: 11 },
  md: { w: 76, h: 108, r: 9, fs: 48, cf: 15 },
  lg: { w: 96, h: 136, r: 11, fs: 62, cf: 19 },
  xl: { w: 132, h: 184, r: 14, fs: 84, cf: 25 },
};

const VAULT: Record<
  VaultTier,
  { bg: string; glow: string; border: string; text: string; tier: string }
> = {
  silver: {
    bg: "linear-gradient(155deg, #5a6a78 0%, #c8dce8 18%, #8a9eae 32%, #d8eaf4 48%, #6a7e8e 62%, #bcd0de 78%, #546472 100%)",
    glow: "0 0 32px rgba(180,210,235,0.95), 0 0 64px rgba(160,195,220,0.55), 0 0 100px rgba(140,175,210,0.25)",
    border: "2px solid rgba(220,238,252,0.85)",
    text: "#0a1420",
    tier: "SILVER",
  },
  gold: {
    bg: "linear-gradient(155deg, #6a3c00 0%, #ffd040 16%, #9a5a00 30%, #ffe880 46%, #805000 60%, #ffcc30 76%, #6a3800 100%)",
    glow: "0 0 36px rgba(255,210,0,1), 0 0 72px rgba(255,160,0,0.65), 0 0 120px rgba(255,120,0,0.3)",
    border: "2px solid rgba(255,240,100,0.9)",
    text: "#1a0800",
    tier: "GOLD",
  },
  diamond: {
    bg: "linear-gradient(155deg, #90c8ff 0%, #ffffff 22%, #d8f0ff 38%, #fff8ff 52%, #a8d8ff 66%, #ffffff 80%, #88c0f8 100%)",
    glow: "0 0 28px rgba(210,240,255,0.95), 0 0 60px rgba(180,100,255,0.5), 0 0 100px rgba(80,200,255,0.45), 0 0 140px rgba(255,100,255,0.2)",
    border: "2px solid rgba(255,255,255,0.98)",
    text: "#060810",
    tier: "DIAMOND",
  },
};

const DARK_GRADIENT = "linear-gradient(175deg, #2c2c40 0%, #171724 55%, #0c0c14 100%)";

const HEX_BACK_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='21'%3E%3Cpolygon points='12,1 23,7 23,15 12,20 1,15 1,7' fill='none' stroke='%2300eeff' stroke-width='0.55' stroke-opacity='0.28'/%3E%3C/svg%3E\")";

const DARK_GLOW =
  "0 0 10px rgba(0,238,255,0.28), 0 8px 22px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -2px 0 rgba(0,0,0,0.3)";

function typeFaceValue(type: CardType, number?: number): string {
  switch (type) {
    case "number":
      return String(number ?? "");
    case "skip":
      return "SKIP";
    case "reverse":
      return "REV";
    case "draw2":
      return "+2";
    case "draw4":
      return "+4";
    case "switch-color":
      return "WILD";
    case "shuffle":
      return "SHUF";
    default:
      return "";
  }
}

function isDarkType(type: CardType): boolean {
  return type === "draw4" || type === "switch-color" || type === "shuffle";
}

function vaultTierOf(type: CardType): VaultTier | undefined {
  if (type === "vault-silver") return "silver";
  if (type === "vault-gold") return "gold";
  if (type === "vault-diamond") return "diamond";
  return undefined;
}

export default function GameCard({
  color = "red",
  value,
  size = "md",
  faceDown = false,
  dimmed = false,
  vault,
  dark = false,
  lifted = false,
  card,
  style,
}: GameCardProps) {
  const d = DIMS[size];

  let faceColor = color;
  let faceValue = value;
  let faceVault = vault;
  let faceDark = dark;

  if (card) {
    faceVault = vaultTierOf(card.type);
    faceDark = isDarkType(card.type);
    if (faceVault) {
      const full = getCard(card.id);
      faceValue = full ? full.name : card.id.startsWith("vault-") ? "VAULT" : "";
    } else if (card.color) {
      faceColor = card.color;
      faceValue = typeFaceValue(card.type, card.number);
    } else {
      faceDark = true;
      faceValue = typeFaceValue(card.type, card.number);
    }
  }

  const base: CSSProperties = {
    width: d.w,
    height: d.h,
    borderRadius: d.r,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: dimmed ? 0.26 : 1,
    filter: dimmed ? "saturate(0.25)" : undefined,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    cursor: dimmed ? "default" : "pointer",
    userSelect: "none",
    ...style,
  };

  if (faceDown) {
    return (
      <div
        style={{
          ...base,
          background: "#0a0e18",
          border: "1px solid rgba(0,238,255,0.55)",
          boxShadow:
            "0 0 0 1px rgba(0,238,255,0.18), 0 0 14px rgba(0,238,255,0.4), inset 0 0 18px rgba(0,238,255,0.06), 0 6px 18px rgba(0,0,0,0.88)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: HEX_BACK_BG,
            backgroundSize: "24px 21px",
            backgroundRepeat: "repeat",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: d.r - 2,
            border: "1px solid rgba(0,238,255,0.22)",
            boxShadow: "inset 0 0 8px rgba(0,238,255,0.06)",
          }}
        />
        <span
          style={{
            fontFamily: "'Barlow Condensed'",
            fontWeight: 900,
            fontSize: d.fs * 0.62,
            color: "#00eeff",
            textShadow: "0 0 10px rgba(0,238,255,0.9), 0 0 24px rgba(0,238,255,0.5)",
            position: "relative",
            zIndex: 1,
            letterSpacing: "-0.02em",
          }}
        >
          B
        </span>
      </div>
    );
  }

  if (faceVault) {
    const vs = VAULT[faceVault];
    return (
      <div
        style={{
          ...base,
          background: vs.bg,
          border: vs.border,
          boxShadow: `${vs.glow}, 0 10px 28px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.25)`,
          transform: lifted ? "translateY(-10px) scale(1.05)" : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "38%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.44) 40%, rgba(255,255,255,0.04) 72%, transparent 100%)",
            borderRadius: `${d.r - 1}px ${d.r - 1}px 0 0`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "rgba(255,255,255,0.8)",
            borderRadius: `${d.r - 1}px ${d.r - 1}px 0 0`,
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            fontFamily: "'Barlow Condensed'",
            fontWeight: 900,
            fontSize: d.fs * 0.58,
            color: vs.text,
            lineHeight: 1,
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            padding: "0 3px",
            textShadow: vs.text === "#060810" ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
            letterSpacing: "-0.02em",
          }}
        >
          {faceValue}
        </span>
        <span
          style={{
            fontFamily: "'Rajdhani'",
            fontWeight: 700,
            fontSize: d.cf * 0.85,
            color: vs.text,
            opacity: 0.72,
            letterSpacing: "0.1em",
            marginTop: 3,
            position: "relative",
            zIndex: 1,
          }}
        >
          {vs.tier}
        </span>
      </div>
    );
  }

  const isDark = faceDark;
  const bg = isDark ? DARK_GRADIENT : GRADIENTS[faceColor];
  const border = isDark ? "1px solid rgba(0,238,255,0.35)" : "1px solid rgba(255,255,255,0.24)";
  const faceText = isDark ? "#c8d8f0" : TEXT[faceColor];
  const boxShadow = isDark
    ? DARK_GLOW
    : lifted
      ? `0 0 52px ${GLOWS_BRIGHT[faceColor]}, 0 0 96px ${GLOWS_DIM[faceColor]}, 0 10px 24px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.36), inset 0 -2px 0 rgba(0,0,0,0.28)`
      : `0 0 8px ${GLOWS_DIM[faceColor]}, 0 8px 22px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -2px 0 rgba(0,0,0,0.22)`;

  return (
    <div
      style={{
        ...base,
        background: bg,
        border,
        boxShadow,
        transform: lifted ? "translateY(-10px) scale(1.06)" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "42%",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.54) 0%, rgba(255,255,255,0.4) 38%, rgba(255,255,255,0.06) 68%, transparent 100%)",
          borderRadius: `${d.r - 1}px ${d.r - 1}px 0 0`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.72)",
          borderRadius: `${d.r - 1}px ${d.r - 1}px 0 0`,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 4,
          left: 5,
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: d.cf + 1,
          color: faceText,
          lineHeight: 1,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {faceValue}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: 4,
          right: 5,
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: d.cf + 1,
          color: faceText,
          lineHeight: 1,
          transform: "rotate(180deg)",
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {faceValue}
      </span>
      <span
        style={{
          fontFamily: "'Barlow Condensed'",
          fontWeight: 900,
          fontSize: d.fs,
          color: faceText,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textShadow: isDark
            ? "0 0 12px rgba(0,238,255,0.55)"
            : "0 3px 0 rgba(0,0,0,0.3), 0 5px 14px rgba(0,0,0,0.55)",
          WebkitTextStroke: faceText === "#fff" ? "0.5px rgba(0,0,0,0.18)" : undefined,
          position: "relative",
          zIndex: 1,
        }}
      >
        {faceValue}
      </span>
    </div>
  );
}
