import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  const app = await buildApp();

  try {
    await prisma.$connect();
    app.log.info("Prisma conectado ao PostgreSQL");
  } catch (error) {
    app.log.warn(
      { err: error },
      "Prisma ainda não conectou. /health continua disponível.",
    );
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Encerrando a API");
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
