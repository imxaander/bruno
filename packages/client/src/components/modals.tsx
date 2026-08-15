import { useState, type ReactNode } from "react";
import type { CardView, LeaderboardEntry, VaultGuideEntry, VaultOffer } from "@bruno/shared";
import GameCard, { type VaultTier } from "./GameCard.js";
import { VAULT_ICONS } from "./vaultIcons.js";
import { CHANGELOG, UPDATES_LATEST_VERSION } from "../changelog.js";

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
        background: "rgba(2,4,8,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(1px)",
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

export interface LocationTheme {
  title: string;
  glow: string;
  accent: string;
  soft: string;
  page: string;
  background: string;
}

const LOCATION_THEMES: Record<string, LocationTheme> = {
  "loc-fields": {
    title: "Fields",
    glow: "rgba(144, 238, 144, 0.35)",
    accent: "#b8f7a5",
    soft: "rgba(180, 247, 165, 0.12)",
    page: "radial-gradient(circle at 30% 20%, rgba(180,247,165,0.16), transparent 26%), radial-gradient(circle at 70% 80%, rgba(90,220,150,0.14), transparent 20%)",
    background: "linear-gradient(180deg, #071107 0%, #0c1510 100%)",
  },
  "loc-silver-prairie": {
    title: "Silver Prairie",
    glow: "rgba(210, 230, 255, 0.35)",
    accent: "#e0f3ff",
    soft: "rgba(200, 220, 255, 0.12)",
    page: "radial-gradient(circle at 20% 30%, rgba(230,245,255,0.14), transparent 24%), radial-gradient(circle at 80% 70%, rgba(190,215,245,0.1), transparent 18%)",
    background: "linear-gradient(180deg, #070a12 0%, #0f161f 100%)",
  },
  "loc-desert": {
    title: "Desert",
    glow: "rgba(255, 197, 115, 0.32)",
    accent: "#ffd89b",
    soft: "rgba(255, 214, 145, 0.12)",
    page: "radial-gradient(circle at 70% 20%, rgba(255,210,145,0.16), transparent 22%), radial-gradient(circle at 25% 75%, rgba(255,160,90,0.08), transparent 18%)",
    background: "linear-gradient(180deg, #120a03 0%, #1a0f06 100%)",
  },
  "loc-scorched-earth": {
    title: "Scorched Earth",
    glow: "rgba(255, 110, 55, 0.38)",
    accent: "#ffb17d",
    soft: "rgba(255, 140, 75, 0.12)",
    page: "radial-gradient(circle at 45% 25%, rgba(255,160,110,0.16), transparent 24%), radial-gradient(circle at 75% 75%, rgba(255,90,40,0.1), transparent 18%)",
    background: "linear-gradient(180deg, #160806 0%, #1f0d08 100%)",
  },
  "loc-ocean": {
    title: "Ocean",
    glow: "rgba(64, 184, 255, 0.38)",
    accent: "#6fd9ff",
    soft: "rgba(100, 200, 255, 0.12)",
    page: "radial-gradient(circle at 60% 20%, rgba(100,215,255,0.16), transparent 24%), radial-gradient(circle at 25% 75%, rgba(50,120,210,0.12), transparent 18%)",
    background: "linear-gradient(180deg, #04112d 0%, #071d38 100%)",
  },
  "loc-abyssal-depths": {
    title: "Abyssal Depths",
    glow: "rgba(98, 205, 255, 0.38)",
    accent: "#9ce8ff",
    soft: "rgba(140, 225, 255, 0.14)",
    page: "radial-gradient(circle at 55% 25%, rgba(150,235,255,0.16), transparent 22%), radial-gradient(circle at 30% 75%, rgba(20,80,140,0.12), transparent 18%)",
    background: "linear-gradient(180deg, #020c18 0%, #07142a 100%)",
  },
  "loc-volcano": {
    title: "Volcano",
    glow: "rgba(255, 100, 60, 0.42)",
    accent: "#ff964e",
    soft: "rgba(255, 130, 85, 0.12)",
    page: "radial-gradient(circle at 55% 25%, rgba(255,145,95,0.16), transparent 22%), radial-gradient(circle at 25% 75%, rgba(200,70,40,0.12), transparent 18%)",
    background: "linear-gradient(180deg, #130805 0%, #1d0d08 100%)",
  },
  "loc-hell-gate": {
    title: "Hell Gate",
    glow: "rgba(200, 90, 255, 0.38)",
    accent: "#c78cff",
    soft: "rgba(185, 115, 255, 0.12)",
    page: "radial-gradient(circle at 50% 25%, rgba(195,140,255,0.16), transparent 22%), radial-gradient(circle at 80% 70%, rgba(140,60,210,0.12), transparent 18%)",
    background: "linear-gradient(180deg, #10070f 0%, #140a16 100%)",
  },
};

const DEFAULT_LOCATION_THEME: LocationTheme = {
  title: "Location",
  glow: "rgba(255,255,255,0.22)",
  accent: "#c8d8f0",
  soft: "rgba(255,255,255,0.08)",
  page: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.12), transparent 22%)",
  background: "linear-gradient(180deg, #09101a 0%, #0d1723 100%)",
};

export function getLocationTheme(locationId: string): LocationTheme {
  return LOCATION_THEMES[locationId] ?? DEFAULT_LOCATION_THEME;
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
      <Frame
        title="CHOOSE YOUR POWER"
        subtitle={`Pick one of ${offers.length} vault effects`}
        width={560}
      >
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
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 26,
                      lineHeight: 1,
                      filter: `drop-shadow(0 0 10px ${tier.glow})`,
                    }}
                  >
                    {VAULT_ICONS[offer.id] ?? "\u2728"}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 900,
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      color: tier.text,
                      textShadow: `0 0 10px ${tier.glow}`,
                    }}
                  >
                    {tier.label}
                  </span>
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
                  {offer.playCondition ? (
                    <span
                      style={{
                        fontSize: 11,
                        lineHeight: 1.3,
                        color: "rgba(255,184,77,0.9)",
                      }}
                    >
                      {offer.playCondition}
                    </span>
                  ) : null}
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

export interface CardPickerSource {
  playerId: string;
  playerName: string;
  cards: CardView[];
}

interface CardPickerProps {
  sources: CardPickerSource[];
  min: number;
  max: number;
  perPlayer?: { min: number; max: number };
  selfHand?: boolean;
  onConfirm: (cardIds: string[]) => void;
}

export function CardPicker({ sources, min, max, perPlayer, selfHand, onConfirm }: CardPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const totalAvailable = sources.reduce((sum, source) => sum + source.cards.length, 0);
  const effectiveMin = Math.min(min, totalAvailable);
  const count = selected.length;
  const ready =
    count >= effectiveMin &&
    count <= max &&
    (perPlayer
      ? sources.every((source) => {
          const picked = source.cards.filter((card) => selected.includes(card.id)).length;
          return picked >= Math.min(perPlayer.min, source.cards.length) && picked <= perPlayer.max;
        })
      : true);

  const toggle = (cardId: string, source: CardPickerSource): void => {
    setSelected((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= max) {
        return prev;
      }
      if (perPlayer) {
        const picked = source.cards.filter((card) => prev.includes(card.id)).length;
        if (picked >= perPlayer.max) {
          return prev;
        }
      }
      return [...prev, cardId];
    });
  };

  const subtitle = selfHand
    ? `Pick ${min}${max > min ? `\u2013${max}` : ""} card${max === 1 ? "" : "s"} from your hand`
    : perPlayer && perPlayer.min === perPlayer.max
      ? `Pick exactly ${perPlayer.min} from each player`
      : perPlayer
        ? `Pick ${min}\u2013${max} total, ${perPlayer.min}\u2013${perPlayer.max} from each`
        : `Pick ${effectiveMin === max ? max : `${effectiveMin}\u2013${max}`} card${max === 1 ? "" : "s"}`;

  return (
    <Overlay>
      <Frame
        title={selfHand ? "DISCARD CARDS" : "PICK CARDS"}
        subtitle={`${subtitle}${selfHand ? "" : " \u2014 hands are revealed to you"}`}
        width={720}
      >
        <div
          style={{
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {sources.map((source) => {
            const picked = source.cards.filter((card) => selected.includes(card.id)).length;
            const atSourceLimit = perPlayer !== undefined && picked >= perPlayer.max;
            return (
              <div key={source.playerId}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 16,
                      color: "#00eeff",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {source.playerName}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(200,216,240,0.4)", fontWeight: 600 }}>
                    {source.cards.length} card{source.cards.length === 1 ? "" : "s"}
                    {perPlayer ? ` \u00b7 ${picked}/${perPlayer.max} picked` : ""}
                  </span>
                </div>
                {source.cards.length === 0 ? (
                  <span
                    style={{ fontSize: 12, color: "rgba(200,216,240,0.3)", fontStyle: "italic" }}
                  >
                    No cards in hand.
                  </span>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {source.cards.map((card) => {
                      const checked = selected.includes(card.id);
                      const disabled = !checked && (count >= max || atSourceLimit);
                      return (
                        <div key={card.id} style={{ position: "relative" }}>
                          <button
                            onClick={() => toggle(card.id, source)}
                            disabled={disabled}
                            style={{
                              padding: 0,
                              background: "none",
                              border: "none",
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: disabled ? 0.4 : 1,
                              transition: "transform 0.12s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!disabled) {
                                e.currentTarget.style.transform = "translateY(-6px)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <GameCard card={card} size="sm" />
                          </button>
                          {checked ? (
                            <span
                              style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "#00eeff",
                                color: "#06060c",
                                fontSize: 13,
                                fontWeight: 900,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 14px rgba(0,238,255,0.9)",
                                zIndex: 2,
                              }}
                            >
                              {"\u2713"}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
            {selfHand ? "Discard" : "Confirm"}
          </button>
        </div>
      </Frame>
    </Overlay>
  );
}

interface LocationRevealProps {
  name: string;
  effect: string;
  theme: LocationTheme;
  onDone: () => void;
}

export function LocationReveal({ name, effect, theme, onDone }: LocationRevealProps) {
  return (
    <Overlay>
      <div
        style={{
          width: "min(720px, 92vw)",
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${theme.accent}`,
          boxShadow: `0 0 100px ${theme.glow}, 0 24px 48px rgba(0,0,0,0.72)`,
          position: "relative",
          background: theme.background,
        }}
      >
        <div style={{ padding: "24px 32px 18px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 13,
              color: theme.accent,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            LOCATION REVEAL
          </p>
          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: 72,
              color: "#fff",
              textShadow: `0 0 28px ${theme.glow}`,
            }}
          >
            {name}
          </h2>
        </div>
        <div style={{ padding: "0 32px 24px" }}>
          <div
            style={{
              padding: "18px 22px",
              borderRadius: 14,
              background: theme.soft,
              border: `1px solid rgba(255,255,255,0.08)`,
              boxShadow: `inset 0 0 38px rgba(255,255,255,0.08)`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "0.02em",
                color: "#eef7ff",
              }}
            >
              Startup effect
            </p>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 15,
                lineHeight: 1.7,
                color: "rgba(240,245,255,0.92)",
              }}
            >
              {effect}
            </p>
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                letterSpacing: "0.18em",
                color: theme.accent,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: theme.glow,
                  boxShadow: `0 0 24px ${theme.glow}`,
                }}
              />
              Game location activated
            </span>
          </div>
        </div>
        <div style={{ padding: "16px 32px 26px", textAlign: "center" }}>
          <button
            onClick={onDone}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "12px 34px",
              background: theme.accent,
              color: "#061018",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              transition: "transform 0.12s ease, box-shadow 0.12s ease",
              boxShadow: `0 0 28px ${theme.glow}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </Overlay>
  );
}

interface MayhemRevealProps {
  playerName: string;
  cardValue: string;
  icon?: string;
  tier: VaultTier;
  powerName: string;
  effectText: ReactNode;
  target: string;
  resultText: ReactNode;
  onDone: () => void;
}

export function MayhemReveal({
  playerName,
  cardValue,
  icon,
  tier,
  powerName,
  effectText,
  target,
  resultText,
  onDone,
}: MayhemRevealProps) {
  return (
    <Overlay>
      <div
        style={{
          width: "min(760px, 92vw)",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(0,238,255,0.24)",
          boxShadow:
            "0 0 60px rgba(0,238,255,0.08), 0 0 120px rgba(0,238,255,0.06), 0 24px 64px rgba(0,0,0,0.9)",
          position: "relative",
          background: [
            "repeating-conic-gradient(from 12deg at 50% 46%, rgba(0,238,255,0.05) 0deg 2deg, transparent 2deg 30deg)",
            "radial-gradient(ellipse at 50% 46%, rgba(0,230,255,0.18) 0%, rgba(0,160,255,0.08) 38%, transparent 64%)",
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
            {icon ?? "\u26A1"} &nbsp; {playerName} PLAYED A VAULT CARD &nbsp; {icon ?? "\u26A1"}
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
              color: "#00eeff",
              textShadow:
                "0 0 40px rgba(0,238,255,0.9), 0 0 80px rgba(0,170,255,0.6), 0 0 120px rgba(0,120,255,0.35), 4px 4px 0 rgba(0,80,120,0.45)",
            }}
          >
            VAULT EFFECT
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
              filter: "drop-shadow(0 0 32px rgba(0,238,255,0.5))",
            }}
          >
            <GameCard vault={tier} value={cardValue} size="xl" lifted />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
            <div>
              <p
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 900,
                  fontSize: 36,
                  color: "#99f7ff",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  textShadow: "0 0 20px rgba(0,238,255,0.35)",
                }}
              >
                {icon ? <span style={{ fontSize: 44 }}>{icon}</span> : null}
                {powerName}
              </p>
              <div
                style={{
                  height: 2,
                  background: "linear-gradient(90deg, rgba(0,238,255,0.6), transparent)",
                  marginTop: 8,
                  borderRadius: 2,
                }}
              />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                color: "rgba(220,230,248,0.88)",
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              {effectText}
            </p>
          </div>
        </div>
        <div
          style={{
            padding: "0 40px 20px",
            display: "grid",
            gap: 14,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div
            style={{
              padding: "18px 20px",
              background: "rgba(0,238,255,0.08)",
              border: "1px solid rgba(0,238,255,0.18)",
              borderRadius: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "rgba(200,216,240,0.55)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Target
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 17,
                color: "#e8f9ff",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {target}
            </p>
          </div>
          <div
            style={{
              padding: "18px 20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "rgba(200,216,240,0.55)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Actual outcome
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 17,
                color: "#e8f9ff",
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {resultText}
            </p>
          </div>
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
              background: "rgba(0,238,255,0.12)",
              color: "#ddf8ff",
              border: "1px solid rgba(0,238,255,0.4)",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,238,255,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,238,255,0.12)")}
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

interface MayhemEventRevealProps {
  name: string;
  effect: string;
  onDone: () => void;
}

export function MayhemEventReveal({ name, effect, onDone }: MayhemEventRevealProps) {
  return (
    <Overlay>
      <div
        style={{
          width: "min(680px, 92vw)",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,40,90,0.4)",
          boxShadow:
            "0 0 90px rgba(255,40,90,0.18), 0 0 160px rgba(255,40,90,0.08), 0 24px 48px rgba(0,0,0,0.8)",
          position: "relative",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,40,90,0.16) 0%, rgba(60,0,24,0.1) 48%, transparent 72%), #0b0b12",
        }}
      >
        <div style={{ padding: "26px 32px 16px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 13,
              color: "#ff3a6e",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
            }}
          >
            {"\u26A0"} MAYHEM {"\u26A0"}
          </p>
          <h2
            style={{
              margin: "16px 0 0",
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: 64,
              color: "#ff7a9e",
              textShadow: "0 0 30px rgba(255,40,90,0.8)",
              lineHeight: 1,
            }}
          >
            {name}
          </h2>
        </div>
        <div style={{ padding: "14px 32px 26px" }}>
          <div
            style={{
              padding: "18px 22px",
              borderRadius: 14,
              background: "rgba(255,40,90,0.08)",
              border: "1px solid rgba(255,40,90,0.25)",
              boxShadow: "inset 0 0 38px rgba(255,40,90,0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.7,
                color: "rgba(250,235,242,0.94)",
              }}
            >
              {effect}
            </p>
          </div>
          <div style={{ padding: "16px 0 0", textAlign: "center" }}>
            <button
              onClick={onDone}
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "12px 34px",
                background: "linear-gradient(90deg,#ff3a6e,#ff1a4a)",
                color: "#1a0208",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
                boxShadow: "0 0 28px rgba(255,40,90,0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

interface VaultGuideProps {
  entries: VaultGuideEntry[];
  onClose: () => void;
}

const GUIDE_TIERS: Array<{
  type: VaultGuideEntry["type"];
  label: string;
  border: string;
  glow: string;
}> = [
  {
    type: "vault-silver",
    label: "SILVER",
    border: "rgba(200,220,255,0.45)",
    glow: "rgba(190,210,255,0.45)",
  },
  {
    type: "vault-gold",
    label: "GOLD",
    border: "rgba(255,214,90,0.55)",
    glow: "rgba(255,200,60,0.5)",
  },
  {
    type: "vault-diamond",
    label: "DIAMOND",
    border: "rgba(120,240,255,0.55)",
    glow: "rgba(0,238,255,0.55)",
  },
];

const STATUS_LABEL: Record<VaultGuideEntry["status"], string> = {
  stable: "Stable",
  draft: "Draft",
  tentative: "Tentative",
};

export function VaultGuide({ entries, onClose }: VaultGuideProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hovered = hoverId ? entries.find((entry) => entry.id === hoverId) : undefined;

  return (
    <Overlay>
      <Frame
        title="VAULT GUIDE"
        subtitle={`${entries.length} implemented vault effects`}
        width={680}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            padding: "18px 24px 24px",
            maxHeight: "calc(68vh / var(--bruno-zoom))",
            overflowY: "auto",
          }}
        >
          {GUIDE_TIERS.map((tier) => {
            const group = entries.filter((entry) => entry.type === tier.type);
            if (group.length === 0) {
              return null;
            }
            return (
              <div key={tier.type} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 800,
                    fontSize: 16,
                    letterSpacing: "0.2em",
                    color: tier.border,
                    textShadow: `0 0 12px ${tier.glow}`,
                  }}
                >
                  {tier.label}
                  <span style={{ color: "rgba(200,216,240,0.35)", marginLeft: 10, fontSize: 12 }}>
                    {group.length}
                  </span>
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(16,16,28,0.55)",
                    border: `1px solid rgba(255,255,255,0.06)`,
                  }}
                >
                  {group.map((entry) => (
                    <div
                      key={entry.id}
                      onMouseEnter={() => setHoverId(entry.id)}
                      onMouseLeave={() => setHoverId(null)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        width: 76,
                        padding: "8px 4px",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: hoverId === entry.id ? "rgba(0,238,255,0.08)" : "transparent",
                        border: `1px solid ${hoverId === entry.id ? tier.border : "transparent"}`,
                        transition: "background 0.12s ease, border-color 0.12s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 26,
                          lineHeight: 1,
                          filter: `drop-shadow(0 0 6px ${tier.glow})`,
                        }}
                      >
                        {VAULT_ICONS[entry.id] ?? "\u2728"}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 700,
                          fontSize: 11,
                          color: "rgba(220,232,250,0.85)",
                          textAlign: "center",
                          lineHeight: 1.15,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid rgba(0,238,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 26px",
              background: "transparent",
              color: "#00eeff",
              border: "1px solid rgba(0,238,255,0.35)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </Frame>
      {hovered ? (
        <div
          style={{
            position: "fixed",
            zIndex: 120,
            width: "min(380px, 70vw)",
            background: "rgba(9,11,18,0.97)",
            border: "1px solid rgba(0,238,255,0.25)",
            borderRadius: 12,
            boxShadow: "0 0 40px rgba(0,238,255,0.12), 0 16px 40px rgba(0,0,0,0.8)",
            padding: "14px 18px",
            pointerEvents: "none",
            bottom: "50%",
            left: "50%",
            transform: "translate(-50%, 0)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{VAULT_ICONS[hovered.id] ?? "\u2728"}</span>
            <p
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 17,
                color: "#e8f0ff",
                letterSpacing: "0.02em",
              }}
            >
              {hovered.name}
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(210,222,245,0.88)",
            }}
          >
            {hovered.effect}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(200,216,240,0.45)",
            }}
          >
            {STATUS_LABEL[hovered.status]}
            {hovered.playCondition ? ` \u2014 To play: ${hovered.playCondition}` : ""}
          </p>
        </div>
      ) : null}
    </Overlay>
  );
}

interface UpdatesPanelProps {
  onClose: () => void;
}

export function UpdatesPanel({ onClose }: UpdatesPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(CHANGELOG.slice(0, 1).map((e) => e.version)),
  );

  const toggle = (version: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  return (
    <Overlay>
      <Frame title="WHAT'S NEW" subtitle={`v${UPDATES_LATEST_VERSION}`} width={520}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "18px 24px 8px",
            maxHeight: "calc(62vh / var(--bruno-zoom))",
            overflowY: "auto",
          }}
        >
          {CHANGELOG.map((entry) => {
            const isOpen = expanded.has(entry.version);
            return (
              <div
                key={entry.version}
                style={{
                  borderRadius: 10,
                  background: isOpen ? "rgba(16,16,28,0.7)" : "rgba(16,16,28,0.35)",
                  border: `1px solid ${isOpen ? "rgba(0,238,255,0.12)" : "rgba(255,255,255,0.04)"}`,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <button
                  onClick={() => toggle(entry.version)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT_DISPLAY,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: "#e8f0ff",
                        letterSpacing: "0.04em",
                      }}
                    >
                      v{entry.version}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: "rgba(200,216,240,0.35)",
                        textTransform: "uppercase",
                      }}
                    >
                      {entry.date}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(0,238,255,0.5)",
                      transition: "transform 0.15s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>
                {isOpen ? (
                  <div style={{ padding: "0 16px 14px" }}>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 13,
                        color: "rgba(0,238,255,0.75)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {entry.title}
                    </p>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {entry.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "rgba(210,222,245,0.82)",
                          }}
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid rgba(0,238,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 26px",
              background: "transparent",
              color: "#00eeff",
              border: "1px solid rgba(0,238,255,0.35)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </Frame>
    </Overlay>
  );
}

const RANK_MEDAL_COLORS = ["#ffcc00", "#c8d8f0", "#ff8a3c"];

export function LeaderboardModal({
  entries,
  myUid,
  onClose,
}: {
  entries: LeaderboardEntry[] | null;
  myUid?: string | null;
  onClose: () => void;
}) {
  return (
    <Overlay>
      <Frame title="LEADERBOARD" subtitle="Top players by rank points" width={560}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "18px 24px 24px",
            maxHeight: "calc(68vh / var(--bruno-zoom))",
            overflowY: "auto",
          }}
        >
          {entries === null ? (
            <p
              style={{
                margin: "18px 0",
                textAlign: "center",
                fontSize: 13,
                letterSpacing: "0.12em",
                color: "rgba(200,216,240,0.4)",
              }}
            >
              LOADING…
            </p>
          ) : entries.length === 0 ? (
            <p
              style={{
                margin: "18px 0",
                textAlign: "center",
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(200,216,240,0.4)",
              }}
            >
              No ranked players yet. Sign in with Google and play to earn rank points.
            </p>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const medal = rank <= 3 ? RANK_MEDAL_COLORS[rank - 1] : null;
              const isMe = myUid != null && entry.uid === myUid;
              return (
                <div
                  key={entry.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isMe ? "rgba(0,238,255,0.08)" : "rgba(16,16,28,0.55)",
                    border: isMe
                      ? "1px solid rgba(0,238,255,0.35)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      textAlign: "center",
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 20,
                      color: medal ?? "rgba(200,216,240,0.35)",
                      textShadow: medal ? `0 0 12px ${medal}66` : "none",
                    }}
                  >
                    {rank}
                  </span>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      background: "rgba(0,238,255,0.1)",
                      border: "1px solid rgba(0,238,255,0.25)",
                    }}
                  >
                    {entry.icon ? (
                      <span style={{ fontSize: 22 }}>{entry.icon}</span>
                    ) : (
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 800,
                          color: "#00eeff",
                        }}
                      >
                        {(entry.username[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: FONT_UI,
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#eaf2ff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.username}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        color: "rgba(200,216,240,0.4)",
                      }}
                    >
                      <span style={{ marginRight: 4 }}>{entry.rankIcon}</span>
                      {entry.rankName}
                      {isMe ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 9,
                            letterSpacing: "0.14em",
                            color: "#00eeff",
                            border: "1px solid rgba(0,238,255,0.4)",
                            borderRadius: 4,
                            padding: "1px 5px",
                          }}
                        >
                          YOU
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 800,
                        fontSize: 22,
                        color: "#00eeff",
                        lineHeight: 1,
                        textShadow: "0 0 14px rgba(0,238,255,0.5)",
                      }}
                    >
                      {entry.points}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        color: "rgba(200,216,240,0.35)",
                      }}
                    >
                      {entry.wins} WINS
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid rgba(0,238,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 26px",
              background: "transparent",
              color: "#00eeff",
              border: "1px solid rgba(0,238,255,0.35)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      </Frame>
    </Overlay>
  );
}
