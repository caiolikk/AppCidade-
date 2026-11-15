import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/categories", async () =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        // D-022: opções do Figma, na ordem do menu. Categoria sem subcategoria → [].
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, description: true },
        },
      },
    }),
  );
}
