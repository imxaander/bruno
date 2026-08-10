import { useEffect, useState } from "react";
import type { ErrorEnvelope, RoomSummary } from "@bruno/shared";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Modal } from "../components/Modal.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface RoomsProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  goLobby: (gameId: string, gameName: string) => void;
}

export function Rooms({ socket, identity, goLobby }: RoomsProps) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onList = (list: RoomSummary[]) => setRooms(list);
    const onError = (payload: ErrorEnvelope) => setError(payload.message);
    socket.on("rooms:list:return", onList);
    socket.on("error", onError);
    socket.emit("rooms:list");
    return () => {
      socket.off("rooms:list:return", onList);
      socket.off("error", onError);
    };
  }, [socket]);

  const refresh = () => socket?.emit("rooms:list");

  const createRoom = () => {
    const trimmed = roomName.trim();
    if (!trimmed) {
      return;
    }
    socket?.emit("rooms:create", { name: trimmed, playerName: identity.name });
    setRoomName("");
    setCreateOpen(false);
    refresh();
  };

  const joinRoom = (gameId: string, gameName: string) => {
    socket?.emit("lobby:join", { gameId, playerName: identity.name });
    goLobby(gameId, gameName);
  };

  const connected = socket?.connected ?? false;

  return (
    <main className="page page-rooms">
      <header className="page-header">
        <h2>Game Rooms</h2>
        <span className={`conn-dot${connected ? "" : " conn-dot-off"}`} />
      </header>
      {error ? <p className="error-line">{error}</p> : null}
      <ul className="room-list">
        {rooms.length === 0 ? (
          <li className="room-empty">No rooms yet — create one.</li>
        ) : (
          rooms.map((room) => (
            <li key={room.id} className="room-row">
              <span className="room-name">{room.name}</span>
              <Badge label={`${room.playerCount} / 8`} tone="count" />
              <Button variant="secondary" size="sm" onClick={() => joinRoom(room.id, room.name)}>
                JOIN
              </Button>
            </li>
          ))
        )}
      </ul>
      <div className="room-actions">
        <Button variant="secondary" onClick={refresh}>
          Refresh Rooms
        </Button>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          New Game
        </Button>
      </div>
      <Modal open={createOpen} title="New Game" onClose={() => setCreateOpen(false)}>
        <label htmlFor="new-game-name">Name</label>
        <input
          id="new-game-name"
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
          placeholder="Room name..."
        />
        <Button onClick={createRoom}>Create New Game!</Button>
      </Modal>
    </main>
  );
}
