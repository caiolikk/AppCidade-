import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getMe, login, registerCitizen } from "./auth.service.js";
import { loginBodySchema, refreshBodySchema, registerBodySchema } from "./auth.schemas.js";
import { refreshSession, revokeSession } from "./session.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request) => {
    const body = registerBodySchema.parse(request.body);
    return registerCitizen(body);
  });

  app.post("/auth/login", async (request) => {
    const body = loginBodySchema.parse(request.body);
    return login(body);
  });

  // Sessão longa do app (D-033): troca o refresh token por um novo par (rotação).
  app.post("/auth/refresh", async (request) => {
    const body = refreshBodySchema.parse(request.body);
    return refreshSession(body.refreshToken);
  });

  // Encerra a sessão no servidor. Não exige o access token (ele pode ter vencido).
  app.post("/auth/logout", async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);
    await revokeSession(body.refreshToken);
    return reply.status(204).send();
  });

  app.get("/me", { preHandler: [authenticate] }, async (request) => {
    return getMe(request.authUser!.id);
  });

  app.get(
    "/manager/health",
    { preHandler: [authenticate, authorize("MANAGER", "ADMIN")] },
    async () => ({ status: "ok", scope: "manager" }),
  );

  app.get(
    "/admin/health",
    { preHandler: [authenticate, authorize("ADMIN")] },
    async () => ({ status: "ok", scope: "admin" }),
  );
}
