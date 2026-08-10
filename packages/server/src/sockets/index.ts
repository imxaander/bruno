import type { Server } from "socket.io";
import {
  GameActionSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@bruno/shared";

export type BrunoServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSockets(io: BrunoServer): void {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("rooms:list", () => {
      socket.emit("rooms:list:return", []);
    });

    socket.on("game:action", (payload) => {
      const parsed = GameActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("error", {
          ok: false,
          code: "INVALID_ACTION",
          message: "Action payload failed validation.",
        });
        return;
      }

      socket.emit("error", {
        ok: false,
        code: "NOT_IMPLEMENTED",
        message: `Game actions are not implemented yet (${parsed.data.type}).`,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
