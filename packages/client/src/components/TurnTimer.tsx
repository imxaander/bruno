interface TurnTimerProps {
  seconds: number;
  active: boolean;
  total?: number;
}

export function TurnTimer({ seconds, active, total = 5 }: TurnTimerProps) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const ratio = active ? Math.max(0, Math.min(1, seconds / total)) : 1;
  const dash = circ * ratio;
  const color = seconds <= 1 ? "#ff3355" : seconds <= 2 ? "#ffaa00" : "#00eeff";

  return (
    <div className="turn-timer">
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: "absolute", inset: 0 }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(0,238,255,0.1)" strokeWidth="3" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          />
        </svg>
        <span className="turn-timer-value" style={{ color, textShadow: `0 0 10px ${color}` }}>
          {seconds}
        </span>
      </div>
      <div className="turn-timer-caption">
        <p className="turn-timer-label">{active ? "Your Turn" : "Waiting"}</p>
        <p className="turn-timer-sub">{active ? "Play a card" : "Opponent thinking"}</p>
      </div>
    </div>
  );
}
