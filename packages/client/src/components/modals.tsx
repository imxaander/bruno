import { useState, type ReactNode } from "react";
import type { VaultOffer } from "@bruno/shared";
import GameCard, { type VaultTier } from "./GameCard.js";

const FONT_DISPLAY = "'Barlow Condensed', sans-serif";
const FONT_UI = "'Rajdhani', sans-serif";

interface FrameProps {
  title: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
}

function Frame({ title, subtitle, width = 480, children }: FrameProps) {
  return (
    <div
      style={{
        width,
        background: "#0b0b12",
        border: "1px solid rgba(0,238,255,0.2)",
        borderRadius: 14,
        boxShadow: "0 0 60px rgba(0,238,255,0.08), 0 24px 64px rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(0,238,255,0.08)",
        }}
      >
        <h3
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 22,
            color: "#00eeff",
            margin: 0,
            letterSpacing: "0.06em",
            textShadow: "0 0 14px rgba(0,238,255,0.5)",
          }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "rgba(200,216,240,0.38)",
              letterSpacing: "0.08em",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,4,8,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(4px)",
      }}
    >
      {children}
    </div>
  );
}

export type CardColorName = "red" | "blue" | "green" | "yellow";

const SWATCHES: Array<{
  label: string;
  color: CardColorName;
  bg: string;
  glow: string;
  glowDim: string;
  text: string;
}> = [
  {
    label: "RED",
    color: "red",
    bg: "linear-gradient(160deg, #ff6070 0%, #e0001e 45%, #900012 100%)",
    glow: "rgba(255,40,60,0.85)",
    glowDim: "rgba(255,40,60,0.28)",
    text: "#fff",
  },
  {
    label: "BLUE",
    color: "blue",
    bg: "linear-gradient(160deg, #55aaff 0%, #0044dd 45%, #002499 100%)",
    glow: "rgba(0,100,255,0.85)",
    glowDim: "rgba(0,100,255,0.28)",
    text: "#fff",
  },
  {
    label: "GREEN",
    color: "green",
    bg: "linear-gradient(160deg, #44ffaa 0%, #00bb44 45%, #006628 100%)",
    glow: "rgba(0,200,80,0.85)",
    glowDim: "rgba(0,200,80,0.28)",
    text: "#fff",
  },
  {
    label: "YELLOW",
    color: "yellow",
    bg: "linear-gradient(160deg, #ffe566 0%, #ffcc00 45%, #aa7800 100%)",
    glow: "rgba(255,200,0,0.85)",
    glowDim: "rgba(255,200,0,0.28)",
    text: "#1a0f00",
  },
];

interface ColorPickerProps {
  onPick: (color: CardColorName) => void;
}

export function ColorPicker({ onPick }: ColorPickerProps) {
  return (
    <Overlay>
      <Frame title="CHOOSE COLOR" subtitle="Wild card played — pick the active color" width={500}>
        <div
          style={{ padding: "20px 22px 24px", display: "flex", gap: 14, justifyContent: "center" }}
        >
          {SWATCHES.map((s) => (
            <button
              key={s.label}
              onClick={() => onPick(s.color)}
              style={{
                width: 100,
                height: 138,
                borderRadius: 12,
                background: s.bg,
                border: "1px solid rgba(255,255,255,0.24)",
                boxShadow: `0 0 22px ${s.glow}, 0 0 56px ${s.glowDim}, 0 8px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.36)`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.14s ease, box-shadow 0.14s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px) scale(1.04)";
                e.currentTarget.style.boxShadow = `0 0 40px ${s.glow}, 0 0 80px ${s.glowDim}, 0 12px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.36)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = `0 0 22px ${s.glow}, 0 0 56px ${s.glowDim}, 0 8px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.36)`;
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "44%",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.32) 40%, transparent 100%)",
                  borderRadius: "11px 11px 0 0",
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
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: "11px 11px 0 0",
                  pointerEvents: "none",
                }}
              />
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 900,
                  fontSize: 26,
                  color: s.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                  textShadow: s.text === "#fff" ? "0 2px 6px rgba(0,0,0,0.4)" : "none",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </Frame>
    </Overlay>
  );
}

export interface VaultOption {
  tier: VaultTier;
  value: string;
  name: string;
}

const ORIGIN_OPTIONS: VaultOption[] = [
  { tier: "silver", value: "SKIP+", name: "Cascade Skip" },
  { tier: "silver", value: "SWAP", name: "Hand Swap" },
  { tier: "gold", value: "SURGE", name: "Power Surge" },
  { tier: "gold", value: "VOID", name: "Void Strike" },
  { tier: "diamond", value: "ECHO", name: "Echo Mirror" },
];

interface OriginSelectProps {
  onPick: (option: VaultOption) => void;
}

export function OriginSelect({ onPick }: OriginSelectProps) {
  return (
    <Overlay>
      <Frame title="CHOOSE YOUR POWER" subtitle="Select 1 of 5 vault cards to play" width={520}>
        <div
          style={{
            padding: "22px 24px",
            display: "flex",
            gap: 14,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          {ORIGIN_OPTIONS.map((v, i) => (
            <div
              key={i}
              onClick={() => onPick(v)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget.querySelector(".vault-card") as HTMLElement;
                if (el) el.style.transform = "translateY(-12px) scale(1.06)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget.querySelector(".vault-card") as HTMLElement;
                if (el) el.style.transform = "";
              }}
            >
              <div className="vault-card" style={{ transition: "transform 0.14s ease" }}>
                <GameCard vault={v.tier} value={v.value} size="md" />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(200,216,240,0.45)",
                  letterSpacing: "0.06em",
                  textAlign: "center",
                  maxWidth: 64,
                }}
              >
                {v.name}
              </span>
            </div>
          ))}
        </div>
      </Frame>
    </Overlay>
  );
}

const TIER_THEME: Record<
  VaultOffer["type"],
  { label: string; border: string; glow: string; text: string }
> = {
  "vault-silver": {
    label: "SILVER",
    border: "rgba(200,220,255,0.45)",
    glow: "rgba(190,210,255,0.5)",
    text: "#dfe9ff",
  },
  "vault-gold": {
    label: "GOLD",
    border: "rgba(255,214,90,0.55)",
    glow: "rgba(255,200,60,0.55)",
    text: "#ffd98a",
  },
  "vault-diamond": {
    label: "DIAMOND",
    border: "rgba(120,240,255,0.55)",
    glow: "rgba(0,238,255,0.6)",
    text: "#9ff0ff",
  },
};

interface VaultPickerProps {
  offers: VaultOffer[];
  onPick: (offerId: string) => void;
}

export function VaultPicker({ offers, onPick }: VaultPickerProps) {
  return (
    <Overlay>
      <Frame title="CHOOSE YOUR POWER" subtitle="Pick one of 5 random vault effects" width={560}>
        <div
          style={{
            padding: "22px 24px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {offers.map((offer) => {
            const tier = TIER_THEME[offer.type];
            return (
              <button
                key={offer.id}
                onClick={() => onPick(offer.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 18px",
                  background: "rgba(16,16,28,0.9)",
                  border: `1px solid ${tier.border}`,
                  borderRadius: 10,
                  boxShadow: `0 0 18px ${tier.glow}, 0 4px 14px rgba(0,0,0,0.5)`,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_UI,
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(6px)";
                  e.currentTarget.style.boxShadow = `0 0 32px ${tier.glow}, 0 6px 20px rgba(0,0,0,0.6)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = `0 0 18px ${tier.glow}, 0 4px 14px rgba(0,0,0,0.5)`;
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 74,
                    textAlign: "center",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 900,
                    fontSize: 13,
                    letterSpacing: "0.1em",
                    color: tier.text,
                    textShadow: `0 0 10px ${tier.glow}`,
                  }}
                >
                  {tier.label}
                </span>
                <span
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 18,
                      color: "#e8f0ff",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {offer.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.35,
                      color: "rgba(200,216,240,0.55)",
                    }}
                  >
                    {offer.effect}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Frame>
    </Overlay>
  );
}

interface TargetPlayer {
  id: string;
  name: string;
}

interface TargetPickerProps {
  players: TargetPlayer[];
  min: number;
  max: number;
  onConfirm: (targetIds: string[]) => void;
}

export function TargetPicker({ players, min, max, onConfirm }: TargetPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const count = selected.length;
  const ready = count >= min && count <= max;

  const toggle = (id: string): void => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= max) {
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <Overlay>
      <Frame
        title="PICK TARGETS"
        subtitle={`Choose ${min === max ? min : `${min}\u2013${max}`} player${max === 1 ? "" : "s"} to affect`}
        width={460}
      >
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {players.map((player) => {
            const checked = selected.includes(player.id);
            const atLimit = !checked && count >= max;
            return (
              <button
                key={player.id}
                onClick={() => toggle(player.id)}
                disabled={atLimit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  background: checked ? "rgba(0,238,255,0.12)" : "rgba(16,16,28,0.9)",
                  border: `1px solid ${checked ? "rgba(0,238,255,0.5)" : "rgba(200,216,240,0.12)"}`,
                  borderRadius: 10,
                  cursor: atLimit ? "not-allowed" : "pointer",
                  opacity: atLimit ? 0.45 : 1,
                  fontFamily: FONT_UI,
                  textAlign: "left",
                  transition: "all 0.12s ease",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: 5,
                    border: `1px solid ${checked ? "#00eeff" : "rgba(200,216,240,0.25)"}`,
                    background: checked ? "#00eeff" : "transparent",
                    boxShadow: checked ? "0 0 10px rgba(0,238,255,0.7)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#06060c",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {checked ? "\u2713" : ""}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 17,
                    letterSpacing: "0.04em",
                    color: checked ? "#00eeff" : "#e8f0ff",
                  }}
                >
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>
        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: "1px solid rgba(0,238,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: ready ? "rgba(0,238,255,0.75)" : "rgba(200,216,240,0.4)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {count} / {max} selected
          </span>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!ready}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 30px",
              background: ready
                ? "linear-gradient(90deg,#00eeff,#0090ff)"
                : "rgba(200,216,240,0.08)",
              color: ready ? "#06060c" : "rgba(200,216,240,0.3)",
              border: "none",
              borderRadius: 8,
              cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </Frame>
    </Overlay>
  );
}

interface MayhemRevealProps {
  playerName: string;
  cardValue: string;
  tier: VaultTier;
  powerName: string;
  effectText: ReactNode;
  target: string;
  onDone: () => void;
}

export function MayhemReveal({
  playerName,
  cardValue,
  tier,
  powerName,
  effectText,
  target,
  onDone,
}: MayhemRevealProps) {
  return (
    <Overlay>
      <div
        style={{
          width: "min(760px, 92vw)",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,180,0,0.3)",
          boxShadow:
            "0 0 60px rgba(255,160,0,0.2), 0 0 120px rgba(255,100,0,0.1), 0 24px 64px rgba(0,0,0,0.9)",
          position: "relative",
          background: [
            "repeating-conic-gradient(from 12deg at 50% 46%, rgba(255,200,0,0.055) 0deg 2deg, transparent 2deg 30deg)",
            "radial-gradient(ellipse at 50% 46%, rgba(255,165,0,0.22) 0%, rgba(255,110,0,0.08) 38%, transparent 64%)",
            "#0b0b12",
          ].join(", "),
        }}
      >
        <div style={{ padding: "22px 40px 0", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 13,
              color: "rgba(200,216,240,0.45)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            {"\u26A1"} &nbsp; {playerName} PLAYED A VAULT CARD &nbsp; {"\u26A1"}
          </p>
        </div>
        <div style={{ textAlign: "center", padding: "10px 40px 0" }}>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: 88,
              letterSpacing: "0.04em",
              lineHeight: 0.9,
              margin: 0,
              color: "#ffcc00",
              textShadow:
                "0 0 40px rgba(255,200,0,1), 0 0 80px rgba(255,160,0,0.7), 0 0 140px rgba(255,100,0,0.4), 4px 4px 0 rgba(180,80,0,0.5)",
            }}
          >
            MAYHEM!
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            padding: "24px 60px 28px",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              animation: "reveal-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
              filter: "drop-shadow(0 0 32px rgba(255,190,0,0.7))",
            }}
          >
            <GameCard vault={tier} value={cardValue} size="xl" lifted />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 280 }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 900,
                  fontSize: 36,
                  color: "#ffaa00",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  textShadow: "0 0 20px rgba(255,170,0,0.8)",
                }}
              >
                {powerName}
              </p>
              <div
                style={{
                  height: 2,
                  background: "linear-gradient(90deg, rgba(255,170,0,0.6), transparent)",
                  marginTop: 8,
                  borderRadius: 2,
                }}
              />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: "rgba(220,230,248,0.82)",
                lineHeight: 1.65,
                fontWeight: 500,
              }}
            >
              {effectText}
            </p>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,160,0,0.2)",
            padding: "14px 40px",
            background: "rgba(255,130,0,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff6040",
              boxShadow: "0 0 10px rgba(255,80,40,0.9)",
              flexShrink: 0,
              animation: "neon-pulse 1s ease-in-out infinite",
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 13,
              color: "rgba(255,130,0,0.75)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Effect applied to: &nbsp;
            <span style={{ color: "#ff9060", fontWeight: 700 }}>{target}</span>
          </p>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff6040",
              boxShadow: "0 0 10px rgba(255,80,40,0.9)",
              flexShrink: 0,
              animation: "neon-pulse 1s ease-in-out infinite 0.5s",
            }}
          />
        </div>
        <div style={{ padding: "16px 40px 24px", textAlign: "center" }}>
          <button
            onClick={onDone}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 32px",
              background: "rgba(255,170,0,0.12)",
              color: "#ffaa00",
              border: "1px solid rgba(255,170,0,0.4)",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,170,0,0.22)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,170,0,0.12)")}
          >
            Continue
          </button>
        </div>
      </div>
    </Overlay>
  );
}

interface RewardSpinProps {
  tier: VaultTier;
  value: string;
  rewardLabel: string;
  onClaim: () => void;
}

export function RewardSpin({ tier, value, rewardLabel, onClaim }: RewardSpinProps) {
  return (
    <Overlay>
      <Frame title="ROUND REWARD" subtitle="Spin result — you earned a vault card!" width={420}>
        <div style={{ padding: "20px 24px", display: "flex", gap: 24, alignItems: "center" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                background:
                  "conic-gradient(#ff3355 0deg 45deg, #ffcc00 45deg 90deg, #0088ff 90deg 135deg, #c8e8ff 135deg 180deg, #00cc55 180deg 225deg, #ff00cc 225deg 270deg, #a0b8d0 270deg 315deg, #1a2540 315deg 360deg)",
                border: "3px solid rgba(0,238,255,0.3)",
                boxShadow: "0 0 28px rgba(0,238,255,0.3), 0 0 56px rgba(0,238,255,0.1)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "50%",
                width: 24,
                height: 24,
                transform: "translate(-50%,-50%)",
                background: "#07070e",
                borderRadius: "50%",
                border: "2px solid rgba(0,238,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#00eeff",
                  boxShadow: "0 0 8px rgba(0,238,255,0.9)",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "18px solid #ffcc00",
                filter: "drop-shadow(0 0 6px rgba(255,200,0,0.9))",
              }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(0,238,255,0.45)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              You Won
            </p>
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(255,204,0,0.1)",
                border: "1px solid rgba(255,204,0,0.35)",
                borderRadius: 8,
                boxShadow: "0 0 16px rgba(255,204,0,0.15)",
              }}
            >
              <p
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: 22,
                  color: "#ffcc00",
                  margin: 0,
                  textShadow: "0 0 10px rgba(255,200,0,0.7)",
                }}
              >
                {rewardLabel}
              </p>
            </div>
            <GameCard vault={tier} value={value} size="sm" />
            <button
              onClick={onClaim}
              style={{
                padding: "10px",
                width: "100%",
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                background: "linear-gradient(90deg,#ffcc00,#ffaa00)",
                color: "#1a0800",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Claim Reward
            </button>
          </div>
        </div>
      </Frame>
    </Overlay>
  );
}
