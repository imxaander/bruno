import { useEffect } from "react";

const FONT_UI = "'Rajdhani', sans-serif";
const FONT_DISPLAY = "'Barlow Condensed', sans-serif";

const TONES = {
  warn: {
    text: "#ffb84d",
    background: "rgba(255,150,0,0.10)",
    border: "rgba(255,170,60,0.45)",
    glow: "0 0 30px rgba(255,150,0,0.20)",
  },
  info: {
    text: "#9fd8ff",
    background: "rgba(90,170,255,0.10)",
    border: "rgba(120,190,255,0.4)",
    glow: "0 0 30px rgba(120,190,255,0.18)",
  },
  error: {
    text: "#ff7a9c",
    background: "rgba(255,60,110,0.10)",
    border: "rgba(255,90,130,0.4)",
    glow: "0 0 30px rgba(255,60,110,0.18)",
  },
} as const;

export type GameAlertTone = keyof typeof TONES;

interface GameAlertProps {
  message: string | null;
  tone?: GameAlertTone;
  duration?: number;
  onDismiss: () => void;
}

/** Non-blocking in-game notification (toast) shown until dismissed or auto-dismissed. */
export default function GameAlert({
  message,
  tone = "warn",
  duration = 3200,
  onDismiss,
}: GameAlertProps) {
  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) {
    return null;
  }
  const accent = TONES[tone];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 92,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 20px",
          borderRadius: 10,
          background: "rgba(9,9,15,0.92)",
          border: `1px solid ${accent.border}`,
          boxShadow: `0 6px 30px rgba(0,0,0,0.6), ${accent.glow}`,
          animation: "reveal-in 0.25s cubic-bezier(0.34,1.4,0.64,1) both",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: `1.5px solid ${accent.border}`,
            fontFamily: FONT_UI,
            fontWeight: 700,
            fontSize: 12,
            lineHeight: "22px",
            textAlign: "center",
            color: accent.text,
          }}
        >
          !
        </span>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "0.03em",
            color: accent.text,
            textShadow: `0 0 12px ${accent.glow}`,
          }}
        >
          {message}
        </span>
      </div>
    </div>
  );
}
