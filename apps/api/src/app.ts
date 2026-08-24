import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { HttpError } from "./utils/http-error.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Dados inválidos.",
        issues: error.issues,
      });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Erro interno." });
  });

  app.get("/health", async () => ({
    status: "ok",
  }));

  await app.register(authRoutes);

  return app;
}
