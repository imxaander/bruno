import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CardView } from "@bruno/shared";
import GameCard from "../GameCard.js";
import {
  CARD_W,
  CARD_H,
  FAN_STEP,
  MIN_SPACING,
  chunkHand,
  fanMetrics,
  layoutMode,
  scrollSpacing,
} from "./hand-layout.js";

interface PlayerHandProps {
  hand: CardView[];
  playable: boolean[];
  myTurn: boolean;
  onPlay: (index: number) => void;
  badge?: ReactNode;
}

const BOX_WIDTH: CSSProperties = { width: "min(80vw, 1100px)" };

export function PlayerHand({ hand, playable, myTurn, onPlay, badge }: PlayerHandProps) {
  const n = hand.length;
  const mode = layoutMode(n).mode;
  const rows = chunkHand(hand);
  const [boxWidth, setBoxWidth] = useState(0);
  const fanRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = fanRef.current;
    if (!el) {
      return;
    }
    const update = () => setBoxWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [n, mode]);

  const width = boxWidth || 1100;
  const longestRow = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const spacing =
    mode === "scroll"
      ? scrollSpacing(n, width)
      : Math.min(FAN_STEP, Math.max(MIN_SPACING, (width - CARD_W) / Math.max(longestRow - 1, 1)));

  const cardButton = (
    card: CardView,
    globalIndex: number,
    left: string,
    transform: string,
    zIndex: number,
  ) => {
    const canPlay = myTurn && playable[globalIndex] === true;
    return (
      <button
        key={card.id}
        disabled={!canPlay}
        onClick={() => onPlay(globalIndex)}
        style={
          {
            position: "absolute",
            bottom: 0,
            left,
            padding: 0,
            background: "none",
            border: "none",
            cursor: canPlay ? "pointer" : "default",
            transform,
            transformOrigin: `${CARD_W / 2}px ${CARD_H + 160}px`,
            zIndex,
            transition: "transform 0.16s ease",
          } as CSSProperties
        }
      >
        <GameCard card={card} size="md" lifted={canPlay} dimmed={!canPlay} />
      </button>
    );
  };

  const fanBox = (rowCards: CardView[], startIndex: number, extra?: CSSProperties) => {
    const metrics = fanMetrics(rowCards.length, spacing);
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 140,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          ...extra,
        }}
      >
        {rowCards.map((card, i) =>
          cardButton(
            card,
            startIndex + i,
            `calc(50% + ${metrics.xOffset(i)}px)`,
            `translateY(${canPlayLift(myTurn, playable[startIndex + i])}px) rotate(${metrics.angle(i)}deg)`,
            metrics.zIndex(i),
          ),
        )}
      </div>
    );
  };

  let rowStart = 0;
  const fanBoxes = rows.map((row, r) => {
    const box = fanBox(row, rowStart, r > 0 ? { marginTop: -20 } : undefined);
    rowStart += row.length;
    return box;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 16,
        gap: 8,
      }}
    >
      {badge ? <div>{badge}</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#aaff00",
            boxShadow: "0 0 8px rgba(170,255,0,0.8)",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(170,255,0,0.7)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Your Hand
        </span>
        <span style={{ fontSize: 11, color: "rgba(200,216,240,0.3)", fontWeight: 600 }}>
          ({n} cards)
        </span>
      </div>
      {mode === "scroll" ? (
        <div
          ref={(el) => {
            fanRef.current = el;
            scrollRef.current = el;
          }}
          style={{
            ...BOX_WIDTH,
            height: 140,
            overflowX: "auto",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 140,
              width: Math.max(width, (n - 1) * spacing + CARD_W),
              flexShrink: 0,
            }}
          >
            {hand.map((card, i) =>
              cardButton(
                card,
                i,
                `${i * spacing}px`,
                `translateY(${canPlayLift(myTurn, playable[i])}px)`,
                i,
              ),
            )}
          </div>
        </div>
      ) : (
        <div ref={fanRef} style={BOX_WIDTH}>
          {fanBoxes}
        </div>
      )}
    </div>
  );
}

function canPlayLift(myTurn: boolean, isPlayable: boolean | undefined): number {
  return myTurn && isPlayable === true ? -14 : 0;
}
