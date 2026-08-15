import { useCallback, useMemo, useState } from "react";
import type { GameEndedPayload } from "@bruno/shared";
import { useSocket, type PlayerIdentity } from "./socket/useSocket.js";
import { AuthProvider, useAuth } from "./firebase/AuthProvider.js";
import { ProfileModal } from "./firebase/ProfileModal.js";
import { AfterGame } from "./pages/AfterGame.js";
import { Game } from "./pages/Game.js";
import { Help } from "./pages/Help.js";
import { Home } from "./pages/Home.js";
import { Lobby } from "./pages/Lobby.js";
import { Ranks } from "./pages/Ranks.js";
import { Rooms } from "./pages/Rooms.js";

type Screen = "home" | "rooms" | "lobby" | "game" | "aftergame" | "ranks" | "help";

function AppContent() {
  const { socket, identity, saveIdentity, setRoomId: setSocketRoomId, reconnecting } = useSocket();
  const { profile, rank, user, profileError, displayName, guest, available, refreshProfile } =
    useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [ended, setEnded] = useState<GameEndedPayload | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const isSignedIn = available && !!user && !guest;
  // Signed-in players are the Firebase uid + their profile username; guests keep
  // the locally stored guest handle. Never clobber the guest identity with the
  // signed-in name so it survives sign-out.
  const effectiveIdentity = useMemo<PlayerIdentity>(() => {
    if (isSignedIn) {
      return {
        id: user?.uid || identity.id,
        name: profile?.username || displayName || identity.name,
      };
    }
    return identity;
  }, [isSignedIn, user, profile, displayName, identity]);

  const goRooms = useCallback(() => {
    setEnded(null);
    setSocketRoomId(null);
    setScreen("rooms");
  }, [setSocketRoomId]);
  const goHome = useCallback(() => {
    setEnded(null);
    setScreen("home");
  }, []);
  const goRanks = useCallback(() => {
    setEnded(null);
    setScreen("ranks");
  }, []);
  const goHelp = useCallback(() => {
    setEnded(null);
    setScreen("help");
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
      // Scoring is committed server-side before game:ended is emitted, so re-fetch
      // the profile now — the points/wins/rank shown after a win or loss stay fresh.
      void refreshProfile();
    },
    [setSocketRoomId, refreshProfile],
  );

  const handlePlay = useCallback(
    (name: string) => {
      if (!isSignedIn && name) {
        saveIdentity(name);
      }
      goRooms();
    },
    [isSignedIn, saveIdentity, goRooms],
  );

  const handleProfileClick = useCallback(() => {
    setProfileOpen(true);
  }, []);

  const content = (() => {
    if (screen === "home") {
      return (
        <Home
          identity={identity}
          socket={socket}
          saveIdentity={saveIdentity}
          onPlay={handlePlay}
          goRanks={goRanks}
          goHelp={goHelp}
        />
      );
    }
    if (screen === "ranks") {
      return (
        <Ranks
          goHome={goHome}
          goHelp={goHelp}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={handleProfileClick}
        />
      );
    }
    if (screen === "help") {
      return (
        <Help
          goHome={goHome}
          goRanks={goRanks}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={handleProfileClick}
        />
      );
    }
    if (screen === "rooms") {
      return (
        <Rooms
          socket={socket}
          identity={effectiveIdentity}
          goLobby={goLobby}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={handleProfileClick}
        />
      );
    }
    if (screen === "lobby") {
      return (
        <Lobby
          socket={socket}
          identity={effectiveIdentity}
          roomId={roomId}
          roomName={roomName}
          maxPlayers={maxPlayers}
          goRooms={goRooms}
          goGame={goGame}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={handleProfileClick}
        />
      );
    }
    if (screen === "game") {
      return (
        <Game
          socket={socket}
          identity={effectiveIdentity}
          roomId={roomId}
          goLobby={goRooms}
          onEnded={handleEnded}
          reconnecting={reconnecting}
          profileIcon={profile?.icon}
          profileRank={rank?.name}
          onProfileClick={handleProfileClick}
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
      {profileOpen ? (
        <ProfileModal
          profile={profile}
          rank={rank}
          email={user?.email ?? null}
          error={profileError}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
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
