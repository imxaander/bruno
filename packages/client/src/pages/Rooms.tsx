import { useEffect, useState } from "react";
import type { ErrorEnvelope, RoomCreateReturn, RoomSummary } from "@bruno/shared";
import { StatusBadge, StatusDot, type StatusType } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import GameCard from "../components/GameCard.js";
import { PageHeader } from "../components/PageHeader.js";
import type { BrunoSocket } from "../socket/client.js";
import type { PlayerIdentity } from "../socket/useSocket.js";

interface RoomsProps {
  socket: BrunoSocket | null;
  identity: PlayerIdentity;
  goLobby: (gameId: string, gameName: string, maxPlayers?: number) => void;
}

const MAX_PLAYERS = 8;

function statusOf(room: RoomSummary): StatusType {
  return room.playerCount >= room.maxPlayers ? "full" : "open";
}

export function Rooms({ socket, identity, goLobby }: RoomsProps) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onList = (list: RoomSummary[]) => setRooms(list);
    const onCreate = (payload: RoomCreateReturn) => {
      if (payload.ok) {
        goLobby(payload.gameId, payload.name, payload.maxPlayers);
      } else {
        setError(payload.message);
      }
    };
    const onError = (payload: ErrorEnvelope) => setError(payload.message);
    socket.on("rooms:list:return", onList);
    socket.on("rooms:create:return", onCreate);
    socket.on("error", onError);
    socket.emit("rooms:list");
    return () => {
      socket.off("rooms:list:return", onList);
      socket.off("rooms:create:return", onCreate);
      socket.off("error", onError);
    };
  }, [socket, goLobby]);

  const refresh = () => socket?.emit("rooms:list");

  const createRoom = () => {
    const trimmed = roomName.trim();
    if (!trimmed) {
      return;
    }
    socket?.emit("rooms:create", {
      name: trimmed,
      playerId: identity.id,
      playerName: identity.name,
      maxPlayers,
    });
    setRoomName("");
    setCreateOpen(false);
  };

  const joinRoom = (gameId: string, gameName: string) => {
    socket?.emit("lobby:join", { gameId, playerId: identity.id, playerName: identity.name });
    goLobby(gameId, gameName);
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a14 0%, #080810 60%, #080810 100%)",
        fontFamily: "'Rajdhani', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader label="Game Rooms" />

      {error ? (
        <div
          style={{
            padding: "6px 28px",
            background: "rgba(255,0,204,0.08)",
            borderBottom: "1px solid rgba(255,0,204,0.25)",
          }}
        >
          <span style={{ fontSize: 12, color: "#ff00cc", fontWeight: 600 }}>{error}</span>
        </div>
      ) : null}

      <div style={{ flex: 1, display: "flex", padding: "32px 48px", gap: 32 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 28,
                  color: "#c8d8f0",
                  margin: 0,
                  letterSpacing: "0.04em",
                }}
              >
                GAME ROOMS
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "rgba(200,216,240,0.4)",
                  letterSpacing: "0.08em",
                }}
              >
                {rooms.length} rooms
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" size="sm" onClick={refresh}>
                {"\u27F3"} Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                + New Game
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 90px 100px",
              gap: 0,
              padding: "6px 20px",
              borderBottom: "1px solid rgba(0,238,255,0.07)",
            }}
          >
            {["Room Name", "Host", "Players", ""].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(0,238,255,0.4)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rooms.length === 0 ? (
              <div
                style={{
                  padding: "24px 20px",
                  textAlign: "center",
                  background: "rgba(11,11,18,0.92)",
                  border: "1px dashed rgba(0,238,255,0.2)",
                  borderRadius: 9,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "rgba(200,216,240,0.4)",
                    letterSpacing: "0.08em",
                  }}
                >
                  No rooms yet — create one.
                </p>
              </div>
            ) : (
              rooms.map((room) => {
                const status = statusOf(room);
                return (
                  <div
                    key={room.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 90px 100px",
                      alignItems: "center",
                      padding: "14px 20px",
                      background: "rgba(11,11,18,0.92)",
                      border: "1px solid rgba(0,238,255,0.08)",
                      borderRadius: 9,
                      gap: 0,
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(0,238,255,0.22)";
                      e.currentTarget.style.background = "rgba(0,238,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(0,238,255,0.08)";
                      e.currentTarget.style.background = "rgba(11,11,18,0.92)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <StatusDot status={status} />
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed'",
                          fontWeight: 700,
                          fontSize: 18,
                          color: "#d8e8ff",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {room.name}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    <span style={{ fontSize: 13, color: "rgba(200,216,240,0.5)", fontWeight: 600 }}>
                      —
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontFamily: "'Barlow Condensed'",
                          fontWeight: 700,
                          fontSize: 17,
                          color: "#c8d8f0",
                        }}
                      >
                        {room.playerCount}
                      </span>
                      <span style={{ color: "rgba(200,216,240,0.3)", fontSize: 14 }}>/</span>
                      <span
                        style={{ fontSize: 14, color: "rgba(200,216,240,0.4)", fontWeight: 600 }}
                      >
                        {room.maxPlayers}
                      </span>
                    </div>
                    <div>
                      {status === "open" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => joinRoom(room.id, room.name)}
                        >
                          JOIN
                        </Button>
                      ) : (
                        <span
                          style={{ fontSize: 12, color: "rgba(255,60,80,0.5)", fontWeight: 600 }}
                        >
                          Full
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: "rgba(11,11,18,0.92)",
              border: "1px solid rgba(0,238,255,0.08)",
              borderRadius: 10,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(0,238,255,0.5)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              You
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "rgba(200,216,240,0.5)", fontWeight: 600 }}>
                Handle
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#c8d8f0",
                }}
              >
                {identity.name || "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "rgba(200,216,240,0.5)", fontWeight: 600 }}>
                Max Players
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#c8d8f0",
                }}
              >
                {MAX_PLAYERS}
              </span>
            </div>
          </div>
          <div
            style={{
              background: "rgba(11,11,18,0.92)",
              border: "1px solid rgba(0,238,255,0.08)",
              borderRadius: 10,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(0,238,255,0.5)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Sample Cards
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <GameCard color="red" value="7" size="sm" />
              <GameCard vault="gold" value="SURGE" size="sm" />
              <GameCard vault="diamond" value="ECHO" size="sm" />
            </div>
          </div>
        </div>
      </div>

      {createOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,4,8,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 420,
              background: "#0b0b12",
              border: "1px solid rgba(0,238,255,0.2)",
              borderRadius: 14,
              padding: "32px",
              boxShadow: "0 0 60px rgba(0,238,255,0.08), 0 24px 64px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Barlow Condensed'",
                  fontWeight: 800,
                  fontSize: 26,
                  color: "#00eeff",
                  margin: 0,
                  letterSpacing: "0.06em",
                }}
              >
                NEW GAME
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(200,216,240,0.4)" }}>
                Configure your room settings
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(0,238,255,0.55)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Room Name
              </label>
              <input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    createRoom();
                  }
                }}
                placeholder="e.g. NEON BLAZE"
                style={{
                  background: "rgba(0,238,255,0.04)",
                  border: nameFocused ? "1px solid #00eeff" : "1px solid rgba(0,238,255,0.2)",
                  borderRadius: 7,
                  padding: "12px 16px",
                  fontFamily: "'Rajdhani'",
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#c8d8f0",
                  outline: "none",
                  boxShadow: nameFocused ? "0 0 14px rgba(0,238,255,0.16)" : "none",
                  transition: "all 0.15s",
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(0,238,255,0.55)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Max Players
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      fontFamily: "'Barlow Condensed'",
                      fontWeight: 800,
                      fontSize: 16,
                      background:
                        n === maxPlayers ? "rgba(0,238,255,0.14)" : "rgba(0,238,255,0.04)",
                      color: n === maxPlayers ? "#00eeff" : "rgba(200,216,240,0.4)",
                      border:
                        n === maxPlayers
                          ? "1px solid rgba(0,238,255,0.35)"
                          : "1px solid rgba(0,238,255,0.1)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Button
                variant="ghost"
                size="md"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => setCreateOpen(false)}
              >
                CANCEL
              </Button>
              <Button
                variant="primary"
                size="md"
                style={{ flex: 2, padding: "12px" }}
                onClick={createRoom}
              >
                CREATE ROOM
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
