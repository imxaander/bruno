import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@bruno/shared";

export type BrunoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(): BrunoSocket {
  return io({
    autoConnect: false,
  });
}
