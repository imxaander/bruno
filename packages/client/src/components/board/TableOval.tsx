import { useState } from "react";
import type { CardView, PileEffect } from "@bruno/shared";
import { VAULT_ICONS } from "../vaultIcons.js";
import GameCard from "../GameCard.js";

interface TableOvalProps {
  deckCount: number;
  pileTop: CardView | null;
  pileEffect?: PileEffect;
  fleetingPileTop?: CardView;
  direction: 1 | -1;
}

export function TableOval({
  deckCount,
  pileTop,
  pileEffect,
  fleetingPileTop,
  direction,
}: TableOvalProps) {
  const [vaultHover, setVaultHover] = useState(false);
  const arcPath = direction === 1 ? "M 20 6 A 14 14 0 0 1 34 20" : "M 20 6 A 14 14 0 0 0 6 20";
  const arrowPoints = direction === 1 ? "34,15 38,22 30,22" : "6,15 2,22 10,22";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        height: 220,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at center, #0d0d1c 0%, #090914 100%)",
        border: "2px solid rgba(0,238,255,0.08)",
        boxShadow: "0 0 60px rgba(0,238,255,0.05) inset, 0 10px 50px rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 52,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
        <div data-deck style={{ position: "relative" }}>
          <GameCard
            faceDown
            size="lg"
            style={{ position: "absolute", top: -3, left: -2, opacity: 0.5 }}
          />
          <GameCard
            faceDown
            size="lg"
            style={{ position: "absolute", top: -1, left: -1, opacity: 0.7 }}
          />
          <GameCard faceDown size="lg" />
          <div
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#0b0b12",
              border: "1px solid rgba(0,238,255,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed'",
                fontWeight: 900,
                fontSize: 12,
                color: "#00eeff",
              }}
            >
              {deckCount}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(0,238,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Deck
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="rgba(0,238,255,0.15)"
            strokeWidth="1.5"
          />
          <path
            d={arcPath}
            fill="none"
            stroke="#00eeff"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px #00eeff)" }}
          />
          <polygon
            points={arrowPoints}
            fill="#00eeff"
            style={{ filter: "drop-shadow(0 0 4px #00eeff)" }}
          />
        </svg>
        <span style={{ fontSize: 9, color: "rgba(0,238,255,0.4)", letterSpacing: "0.1em" }}>
          {direction === 1 ? "CLOCKWISE" : "COUNTER"}
        </span>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}
        onMouseEnter={() => pileEffect && setVaultHover(true)}
        onMouseLeave={() => setVaultHover(false)}
      >
        <div style={{ position: "relative" }}>
          {/* Show fleeting card muted on top, or the real pileTop underneath */}
          {fleetingPileTop ? (
            <GameCard
              card={fleetingPileTop}
              size="lg"
              style={{
                opacity: 0.5,
                filter: "grayscale(0.5)",
              }}
            />
          ) : pileTop ? (
            <>
              <GameCard
                card={pileTop}
                size="lg"
                style={{ position: "absolute", top: 4, left: 4, opacity: 0.35 }}
              />
              <GameCard
                card={pileTop}
                size="lg"
                style={{
                  boxShadow: pileEffect
                    ? "0 0 52px rgba(0,238,255,1), 0 0 100px rgba(0,238,255,0.6), 0 0 160px rgba(0,238,255,0.22), 0 8px 24px rgba(0,0,0,0.9)"
                    : "0 0 52px rgba(0,110,255,1), 0 0 100px rgba(0,110,255,0.6), 0 0 160px rgba(0,110,255,0.22), 0 8px 24px rgba(0,0,0,0.9)",
                }}
              />
            </>
          ) : (
            <GameCard faceDown size="lg" />
          )}
          {vaultHover && pileEffect ? (
            <div
              style={{
                position: "absolute",
                bottom: "102%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 260,
                zIndex: 40,
                background: "rgba(9,11,18,0.97)",
                border: "1px solid rgba(0,238,255,0.3)",
                borderRadius: 10,
                boxShadow: "0 0 32px rgba(0,238,255,0.15), 0 14px 34px rgba(0,0,0,0.85)",
                padding: "12px 14px",
                pointerEvents: "none",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontFamily: "'Rajdhani'",
                  fontWeight: 800,
                  fontSize: 15,
                  color: "#9ff0ff",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {VAULT_ICONS[pileEffect.cardId] ?? ""} {pileEffect.tier.replace("vault-", "")} Vault
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Rajdhani'",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#e8f0ff",
                  letterSpacing: "0.02em",
                }}
              >
                {pileEffect.name}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "rgba(210,222,245,0.88)",
                }}
              >
                {pileEffect.text}
              </p>
            </div>
          ) : null}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(200,216,240,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Pile
        </span>
      </div>
    </div>
  );
}
