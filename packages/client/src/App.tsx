import { useCallback, useState } from "react";
import type { GameEndedPayload } from "@bruno/shared";
import { useSocket } from "./socket/useSocket.js";
import { AuthProvider, useAuth } from "./firebase/AuthProvider.js";
import { ProfileModal } from "./firebase/ProfileModal.js";
import { AfterGame } from "./pages/AfterGame.js";
import { Game } from "./pages/Game.js";
import { Home } from "./pages/Home.js";
import { Lobby } from "./pages/Lobby.js";
import { Rooms } from "./pages/Rooms.js";

type Screen = "home" | "rooms" | "lobby" | "game" | "aftergame";

function AppContent() {
  const { socket, identity, saveIdentity, setRoomId: setSocketRoomId, reconnecting } = useSocket();
  const { profile, rank, user } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ended, setEnded] = useState<GameEndedPayload | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const goRooms = useCallback(() => {
    setEnded(null);
    setSocketRoomId(null);
    setScreen("rooms");
  }, [setSocketRoomId]);
  const goHome = useCallback(() => {
    setEnded(null);
    setScreen("home");
  }, []);
  const goLobby = useCallback(
    (gameId: string, name: string, roomMaxPlayers = 8) => {
      setRoomId(gameId);
      setSocketRoomId(gameId);
      setRoomName(name);
      setMaxPlayers(roomMaxPlayers);
      setScreen("lobby");
    },
    [setSocketRoomId],
  );
  const goGame = useCallback(
    (gameId: string) => {
      setRoomId(gameId);
      setSocketRoomId(gameId);
      setScreen("game");
    },
    [setSocketRoomId],
  );
  const handleEnded = useCallback(
    (payload: GameEndedPayload) => {
      setEnded(payload);
      setSocketRoomId(null);
      setScreen("aftergame");
    },
    [setSocketRoomId],
  );

  const handlePlay = useCallback(
    (name: string) => {
      if (!identity.id && name) {
        saveIdentity(name);
      }
      goRooms();
    },
    [identity.id, saveIdentity, goRooms],
  );

  const profileProps = profile && rank
    ? { profile, rank, email: user?.email ?? null, onClose: () => setProfileOpen(false) }
    : null;

  const content = (() => {
    if (screen === "home") {
      return (
        <Home identity={identity} socket={socket} saveIdentity={saveIdentity} onPlay={handlePlay} />
      );
    }
    if (screen === "rooms") {
      return (
        <Rooms
          socket={socket}
          identity={identity}
          goLobby={goLobby}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={() => setProfileOpen(true)}
        />
      );
    }
    if (screen === "lobby") {
      return (
        <Lobby
          socket={socket}
          identity={identity}
          roomId={roomId}
          roomName={roomName}
          maxPlayers={maxPlayers}
          goRooms={goRooms}
          goGame={goGame}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={() => setProfileOpen(true)}
        />
      );
    }
    if (screen === "game") {
      return (
        <Game
          socket={socket}
          identity={identity}
          roomId={roomId}
          goLobby={goRooms}
          onEnded={handleEnded}
          reconnecting={reconnecting}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={() => setProfileOpen(true)}
        />
      );
    }
    return (
      <AfterGame
        winner={ended?.winner ?? null}
        players={ended?.players ?? []}
        reason={ended?.reason ?? "hand_emptied"}
        goHome={goHome}
        goRooms={goRooms}
      />
    );
  })();

  return (
    <>
      {content}
      {profileOpen && profileProps ? <ProfileModal {...profileProps} /> : null}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
