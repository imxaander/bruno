import { useLayoutEffect, useState, type CSSProperties } from "react";
import GameCard from "../GameCard.js";

export interface DrawFlyTarget {
  playerId: string;
  playerName: string;
  count: number;
}

interface DrawFlyProps {
  targets: DrawFlyTarget[];
  playerOrder: string[];
  myId: string;
  players: { id: string; equippedCardBack?: string }[];
}

const RING_SEAT_POINTS: Array<{ left: number; top: number }> = [
  { left: 6, top: 54 },
  { left: 6, top: 20 },
  { left: 20, top: 5 },
  { left: 50, top: 2 },
  { left: 74, top: 5 },
  { left: 94, top: 20 },
  { left: 94, top: 54 },
];

const CARD_W = 64;
const CARD_H = 90;

interface FlightCard {
  left: number;
  top: number;
  style: CSSProperties & Record<string, string>;
  cardBack?: string;
}

function rectCenter(selector: string): { x: number; y: number } | null {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function fallbackSeatPoint(
  playerId: string,
  opponents: string[],
  playerCount: number,
  myId: string,
  width: number,
  height: number,
): { x: number; y: number } {
  if (playerId === myId) {
    return { x: width / 2, y: height * 0.9 };
  }
  const index = opponents.indexOf(playerId);
  if (index === -1) {
    return { x: width / 2, y: height / 2 };
  }
  if (playerCount > 4) {
    const seat = RING_SEAT_POINTS[index] ?? RING_SEAT_POINTS[0]!;
    return { x: (seat.left / 100) * width, y: (seat.top / 100) * height };
  }
  const spread = opponents.length > 1 ? (72 / (opponents.length - 1)) * index : 36;
  return { x: ((14 + spread) / 100) * width, y: height * 0.2 };
}

function endPointFor(
  target: DrawFlyTarget,
  opponents: string[],
  playerCount: number,
  myId: string,
  width: number,
  height: number,
): { x: number; y: number } {
  if (target.playerId === myId) {
    const handEl = document.querySelector<HTMLElement>(`[data-player-hand="${myId}"]`);
    if (handEl) {
      const rect = handEl.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.bottom - 45 };
    }
    return { x: width / 2, y: height * 0.9 };
  }
  const seat = rectCenter(`[data-player-seat="${target.playerId}"]`);
  return seat ?? fallbackSeatPoint(target.playerId, opponents, playerCount, myId, width, height);
}

function computeCards(
  targets: DrawFlyTarget[],
  opponents: string[],
  playerCount: number,
  myId: string,
  playerMap: Map<string, string | undefined>,
): FlightCard[] | null {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const start = rectCenter("[data-deck]") ?? { x: width * 0.42, y: height * 0.44 };

  const cards: FlightCard[] = [];
  let order = 0;
  for (const target of targets) {
    const end = endPointFor(target, opponents, playerCount, myId, width, height);
    const cardBack = playerMap.get(target.playerId);
    for (let i = 0; i < target.count; i += 1) {
      const mid = {
        x: (start.x + end.x) / 2,
        y: Math.min(start.y, end.y) - 90 - order * 8,
      };
      cards.push({
        left: start.x - CARD_W / 2,
        top: start.y - CARD_H / 2,
        cardBack,
        style: {
          "--dx": `${end.x - start.x}px`,
          "--dy": `${end.y - start.y}px`,
          "--mx": `${mid.x - start.x}px`,
          "--my": `${mid.y - start.y}px`,
          animationDelay: `${order * 0.12}s`,
        } as FlightCard["style"],
      });
      order += 1;
    }
  }
  return cards;
}

export default function DrawFly({ targets, playerOrder, myId, players }: DrawFlyProps) {
  const opponents = playerOrder.filter((id) => id !== myId);
  const playerMap = new Map(players.map((p) => [p.id, p.equippedCardBack]));
  const [cards, setCards] = useState<FlightCard[] | null>(null);

  useLayoutEffect(() => {
    const next = computeCards(targets, opponents, playerOrder.length, myId, playerMap);
    setCards((prev) => {
      if (
        prev &&
        next &&
        prev.length === next.length &&
        prev.every(
          (card, index) =>
            card.left === next[index]!.left &&
            card.top === next[index]!.top &&
            card.style["--dx"] === next[index]!.style["--dx"] &&
            card.style["--dy"] === next[index]!.style["--dy"] &&
            card.style["--mx"] === next[index]!.style["--mx"] &&
            card.style["--my"] === next[index]!.style["--my"] &&
            card.style.animationDelay === next[index]!.style.animationDelay,
        )
      ) {
        return prev;
      }
      return next;
    });
  });

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: card.left,
            top: card.top,
            animation: "draw-fly 0.7s cubic-bezier(0.45, 0, 0.55, 1) both",
            ...card.style,
          }}
        >
          <GameCard
            faceDown
            size="md"
            cardBack={card.cardBack}
            style={{ width: CARD_W, height: CARD_H }}
          />
        </div>
      ))}
    </div>
  );
}
