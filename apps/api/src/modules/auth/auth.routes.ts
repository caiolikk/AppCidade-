import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getMe, login, registerCitizen } from "./auth.service.js";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request) => {
    const body = registerBodySchema.parse(request.body);
    return registerCitizen(body);
  });

  app.post("/auth/login", async (request) => {
    const body = loginBodySchema.parse(request.body);
    return login(body);
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
