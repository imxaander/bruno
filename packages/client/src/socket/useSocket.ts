import { useCallback, useEffect, useRef, useState } from "react";
import { createSocket, type BrunoSocket } from "./client.js";
import { auth, onIdToken } from "../firebase/client.js";

export interface PlayerIdentity {
  id: string;
  name: string;
}

function randomId(prefix: string): string {
  return prefix + Math.random().toString(36).replace("0.", "");
}

function readIdentity(): PlayerIdentity {
  try {
    const raw = localStorage.getItem("bruno_player_info");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerIdentity>;
      if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
        return { id: parsed.id, name: parsed.name };
      }
    }
  } catch {
    // corrupt stored identity; start fresh
  }
  return { id: "", name: "" };
}

export function useSocket() {
  const [socket, setSocket] = useState<BrunoSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [identity, setIdentity] = useState<PlayerIdentity>(readIdentity);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sock = createSocket({ autoConnect: false });
    // Fetch the current Firebase ID token, attach it for (re)connects, and verify it
    // against the live socket so the server can set socket.data.uid even when the
    // socket connected before sign-in completed. Anonymous guests are skipped.
    const applyAuth = async (verify: boolean) => {
      const user = auth?.currentUser;
      if (!user || user.isAnonymous) {
        return;
      }
      try {
        const token = await user.getIdToken();
        sock.auth = { token };
        if (verify) {
          sock.emit("auth:verify", { token });
        }
      } catch {
        // Token fetch failed — stay a guest
      }
    };
    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
      void applyAuth(true);
      // If we're in a game, rejoin after reconnection.
      const rid = roomIdRef.current;
      const id = readIdentity().id;
      if (rid && id) {
        sock.emit("game:rejoin", { gameId: rid, playerId: id });
        sock.emit("game:state:get", { gameId: rid, playerId: id });
      }
    };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      setReconnecting(reason === "transport close" || reason === "transport error");
    };
    const onReconnectAttempt = async () => {
      setReconnecting(true);
      await applyAuth(false);
    };
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.io.on("reconnect_attempt", onReconnectAttempt);
    // Re-verify whenever auth state or the ID token changes (fires once immediately
    // with the current user, and again after anonymous -> Google upgrades).
    const unsubscribeAuth = onIdToken(() => {
      void applyAuth(true);
    });
    // Attach Firebase token before connecting.
    void (async () => {
      await applyAuth(false);
      sock.connect();
    })();
    setSocket(sock);
    return () => {
      unsubscribeAuth();
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.io.off("reconnect_attempt", onReconnectAttempt);
      sock.disconnect();
    };
  }, []);

  const saveIdentity = useCallback(
    (name: string) => {
      const next: PlayerIdentity = { id: identity.id || randomId("PID"), name };
      localStorage.setItem("bruno_player_info", JSON.stringify(next));
      setIdentity(next);
    },
    [identity.id],
  );

  const setRoomId = useCallback((id: string | null) => {
    roomIdRef.current = id;
  }, []);

  const rejoin = useCallback(() => {
    const rid = roomIdRef.current;
    const id = identity.id;
    if (rid && id && socket) {
      socket.emit("game:rejoin", { gameId: rid, playerId: id });
      socket.emit("game:state:get", { gameId: rid, playerId: id });
    }
  }, [socket, identity.id]);

  return { socket, connected, reconnecting, identity, saveIdentity, setRoomId, rejoin };
}
