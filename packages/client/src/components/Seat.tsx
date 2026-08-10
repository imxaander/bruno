import type { PublicPlayer } from "@bruno/shared";
import { Avatar } from "./Avatar.js";
import { Badge } from "./Badge.js";

interface SeatProps {
  player: PublicPlayer;
  self?: boolean;
}

export function Seat({ player, self = false }: SeatProps) {
  const classes = ["seat", player.isTurn ? "seat-active" : "", self ? "seat-self" : ""]
    .join(" ")
    .trim();

  return (
    <div className={classes}>
      <Avatar name={player.name} />
      <div className="seat-info">
        <span className="seat-name">{player.name}</span>
        <Badge label={player.isHost ? "Host" : "Member"} tone={player.isHost ? "host" : "member"} />
      </div>
      <span className="seat-count">{player.handCount}</span>
    </div>
  );
}
