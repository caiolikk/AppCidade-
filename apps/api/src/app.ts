import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { categoryRoutes } from "./modules/categories/category.routes.js";
import { occurrenceRoutes } from "./modules/occurrences/occurrence.routes.js";
import { uploadRoutes } from "./modules/uploads/upload.routes.js";
import { profileRoutes } from "./modules/users/profile.routes.js";
import { localUploadDir } from "./services/upload.js";
import { HttpError } from "./utils/http-error.js";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  await mkdir(localUploadDir, { recursive: true });

  await app.register(cors, {
    origin: true,
    // O @fastify/cors 11 libera só GET/HEAD/POST por padrão: no navegador, PATCH/PUT/DELETE
    // (perfil, avatar, status) falhavam no preflight. Ver docs/PROBLEMS.md P-014.
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(fastifyStatic, {
    root: localUploadDir,
    prefix: "/media/",
    decorateReply: false,
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

    // Erros 4xx do próprio Fastify (JSON malformado, corpo inválido, etc.) não são erro interno.
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ message: "Requisição inválida." });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Erro interno." });
  });

  app.get("/health", async () => ({
    status: "ok",
  }));

  await app.register(authRoutes);
  await app.register(categoryRoutes);
  await app.register(occurrenceRoutes);
  await app.register(uploadRoutes);
  await app.register(profileRoutes);

  return app;
}
