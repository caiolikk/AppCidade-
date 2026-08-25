import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/categories", async () =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  );
}
