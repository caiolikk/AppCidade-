import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  checkGeofence,
  createOccurrence,
  evaluateOccurrence,
  getAdminOccurrence,
  getPublicOccurrence,
  listPublicOccurrences,
  updateOccurrenceStatus,
} from "./occurrence.service.js";
import {
  createOccurrenceBodySchema,
  evaluationBodySchema,
  geofenceBodySchema,
  updateStatusBodySchema,
} from "./occurrence.schemas.js";

export async function occurrenceRoutes(app: FastifyInstance) {
  app.get("/occurrences", async () => listPublicOccurrences());

  app.get("/occurrences/:id", async (request) => {
    const { id } = request.params as { id: string };
    return getPublicOccurrence(id);
  });

  app.post(
    "/occurrences/geofence-check",
    { preHandler: [authenticate] },
    async (request) => {
      const body = geofenceBodySchema.parse(request.body);
      return checkGeofence(request.authUser!.id, body.latitude, body.longitude);
    },
  );

  app.post(
    "/occurrences",
    { preHandler: [authenticate] },
    async (request) => {
      const body = createOccurrenceBodySchema.parse(request.body);
      return createOccurrence(request.authUser!.id, body);
    },
  );

  app.post(
    "/occurrences/:id/evaluations",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = evaluationBodySchema.parse(request.body);
      return evaluateOccurrence(request.authUser!.id, id, body);
    },
  );

  app.get(
    "/admin/occurrences/:id",
    { preHandler: [authenticate, authorize("MANAGER", "ADMIN")] },
    async (request) => {
      const { id } = request.params as { id: string };
      return getAdminOccurrence(id);
    },
  );

  app.patch(
    "/admin/occurrences/:id/status",
    { preHandler: [authenticate, authorize("MANAGER", "ADMIN")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateStatusBodySchema.parse(request.body);
      return updateOccurrenceStatus(request.authUser!.id, id, body);
    },
  );
}
