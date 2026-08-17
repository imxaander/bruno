import { useEffect, useState } from "react";

interface GameTimerProps {
  startedAt: number;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function GameTimer({ startedAt }: GameTimerProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(10,14,26,0.85)",
        border: "1px solid rgba(0,238,255,0.25)",
        borderRadius: 6,
        padding: "4px 12px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 14,
        color: "rgba(0,238,255,0.7)",
        letterSpacing: "0.08em",
        userSelect: "none",
        zIndex: 5,
      }}
    >
      {formatElapsed(elapsed)}
    </div>
  );
}
