export interface ServerConfig {
  port: number;
  clientUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(env.PORT ?? 3000),
    clientUrl: env.CLIENT_URL ?? "http://localhost:5173",
  };
}
