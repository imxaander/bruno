import type { GameEffect } from "@bruno/shared";
import GameCard, { type VaultTier } from "./GameCard.js";

const TIER_TO_VAULT: Record<GameEffect["tier"], VaultTier> = {
  "vault-silver": "silver",
  "vault-gold": "gold",
  "vault-diamond": "diamond",
};

const ACCENT: Record<VaultTier, { color: string; soft: string; border: string; glow: string }> = {
  silver: {
    color: "#c8dce8",
    soft: "rgba(180,210,235,0.12)",
    border: "rgba(200,225,245,0.35)",
    glow: "0 0 40px rgba(160,195,220,0.25)",
  },
  gold: {
    color: "#ffd040",
    soft: "rgba(255,200,0,0.12)",
    border: "rgba(255,200,60,0.4)",
    glow: "0 0 44px rgba(255,180,0,0.28)",
  },
  diamond: {
    color: "#bdf0ff",
    soft: "rgba(150,220,255,0.12)",
    border: "rgba(160,230,255,0.4)",
    glow: "0 0 44px rgba(140,210,255,0.28)",
  },
};

interface EffectBannerProps {
  effect: GameEffect;
  visible: boolean;
}

export default function EffectBanner({ effect, visible }: EffectBannerProps) {
  const tier = TIER_TO_VAULT[effect.tier];
  const accent = ACCENT[tier];
  return (
    <div
      style={{
        position: "fixed",
        top: "24%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "14px 26px 16px",
          borderRadius: 14,
          background: "rgba(9,9,15,0.88)",
          border: `1px solid ${accent.border}`,
          boxShadow: `0 0 60px rgba(0,0,0,0.6), ${accent.glow}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: accent.color,
          }}
        >
          {effect.playerName} played a vault card
        </p>
        <div style={{ animation: "reveal-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <GameCard vault={tier} value={effect.name} size="md" lifted />
        </div>
        {effect.lines.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "8px 14px",
              borderRadius: 8,
              background: accent.soft,
            }}
          >
            {effect.lines.map((line, index) => (
              <p
                key={index}
                style={{
                  margin: 0,
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: "rgba(220,232,250,0.9)",
                  textAlign: "center",
                }}
              >
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
