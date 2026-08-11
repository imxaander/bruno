import { fileURLToPath } from "node:url";

export interface ServerConfig {
  port: number;
  clientUrl: string;
  staticDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(env.PORT ?? 3000),
    clientUrl: env.CLIENT_URL ?? "http://localhost:5173",
    staticDir: env.STATIC_DIR ?? fileURLToPath(new URL("../../client/dist", import.meta.url)),
  };
}
