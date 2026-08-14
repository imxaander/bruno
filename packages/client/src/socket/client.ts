import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@bruno/shared";

export type BrunoSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface CreateSocketOptions {
  autoConnect?: boolean;
}

export function createSocket(options: CreateSocketOptions = {}): BrunoSocket {
  return io({
    autoConnect: options.autoConnect ?? true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
}
