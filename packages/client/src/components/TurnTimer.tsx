interface TurnTimerProps {
  seconds: number;
  active: boolean;
}

export function TurnTimer({ seconds, active }: TurnTimerProps) {
  const classes = ["turn-timer", active ? "turn-timer-active" : ""].join(" ").trim();
  return (
    <div className={classes}>
      <span>Turn</span>
      <span className="turn-timer-value">{seconds}s</span>
    </div>
  );
}
