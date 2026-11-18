import type { FastifyInstance } from "fastify";
import { authenticate, optionalAuthUserId } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  checkGeofence,
  createOccurrence,
  evaluateOccurrence,
  getAdminOccurrence,
  getPublicOccurrence,
  listPublicOccurrences,
  removeOwnOccurrence,
  updateOccurrenceStatus,
  updateOwnOccurrence,
} from "./occurrence.service.js";
import {
  createOccurrenceBodySchema,
  evaluationBodySchema,
  geofenceBodySchema,
  updateOccurrenceBodySchema,
  updateStatusBodySchema,
} from "./occurrence.schemas.js";

export async function occurrenceRoutes(app: FastifyInstance) {
  app.get("/occurrences", async () => listPublicOccurrences());

  app.get("/occurrences/:id", async (request) => {
    const { id } = request.params as { id: string };
    // Público; com token válido inclui `viewer` (autor? pode editar?) — D-032.
    return getPublicOccurrence(id, optionalAuthUserId(request));
  });

  // Edição e remoção pelo autor, só enquanto "em análise" (D-032).
  app.patch(
    "/occurrences/:id",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateOccurrenceBodySchema.parse(request.body);
      return updateOwnOccurrence(request.authUser!.id, id, body);
    },
  );

  app.delete(
    "/occurrences/:id",
    { preHandler: [authenticate] },
    async (request) => {
      const { id } = request.params as { id: string };
      return removeOwnOccurrence(request.authUser!.id, id);
    },
  );

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
