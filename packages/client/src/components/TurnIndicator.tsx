interface TurnIndicatorProps {
  myTurn: boolean;
}

export function TurnIndicator({ myTurn }: TurnIndicatorProps) {
  if (!myTurn) {
    return null;
  }
  return <div className="your-turn-glow" aria-hidden />;
}
