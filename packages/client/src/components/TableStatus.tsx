import type { ReactNode } from "react";
import type { Color } from "@bruno/shared";

interface TableStatusProps {
  activeColor?: Color | null;
  pendingDraw?: number;
  myTurn: boolean;
}

const COLOR_THEME: Record<Color, { name: string; hex: string; glow: string }> = {
  red: { name: "RED", hex: "#ff3355", glow: "rgba(255,51,85,0.7)" },
  blue: { name: "BLUE", hex: "#00aaff", glow: "rgba(0,170,255,0.7)" },
  green: { name: "GREEN", hex: "#22ff88", glow: "rgba(34,255,136,0.7)" },
  yellow: { name: "YELLOW", hex: "#ffcc00", glow: "rgba(255,204,0,0.7)" },
};

export function TableStatus({ activeColor = null, pendingDraw = 0, myTurn }: TableStatusProps) {
  const theme = activeColor ? COLOR_THEME[activeColor] : null;
  const segments: ReactNode[] = [];

  if (theme) {
    segments.push(
      <div className="status-segment status-color" key="color">
        <span
          className="status-dot"
          style={{ background: theme.hex, boxShadow: `0 0 10px ${theme.hex}` }}
        />
        <span
          className="status-color-name"
          style={{ color: theme.hex, textShadow: `0 0 8px ${theme.glow}` }}
        >
          {theme.name}
        </span>
      </div>,
    );
  }

  if (pendingDraw > 0) {
    segments.push(
      <div className="status-segment status-draw" key="draw">
        <span className="status-draw-plus">+{pendingDraw}</span>
        <span className="status-draw-label">Draw</span>
      </div>,
    );
  }

  segments.push(
    <div className={`status-segment ${myTurn ? "status-turn" : "status-waiting"}`} key="turn">
      <span className="status-turn-label">{myTurn ? "YOUR TURN" : "WAITING"}</span>
    </div>,
  );

  return <div className="table-status">{segments}</div>;
}
