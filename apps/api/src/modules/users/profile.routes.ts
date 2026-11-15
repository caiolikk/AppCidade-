import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { publicBaseUrl, readImageUpload } from "../uploads/read-image-upload.js";
import { myOccurrencesQuerySchema, updateProfileBodySchema } from "./profile.schemas.js";
import {
  getMyProfile,
  listMyOccurrences,
  removeMyAvatar,
  updateMyAvatar,
  updateMyProfile,
} from "./profile.service.js";

/**
 * Perfil do PRÓPRIO usuário (D-025). Todas as rotas usam só o id do token: não existe
 * parâmetro de usuário, logo não há como ler ou editar o perfil de outra pessoa.
 */
export async function profileRoutes(app: FastifyInstance) {
  app.get("/me/profile", { preHandler: [authenticate] }, async (request) =>
    getMyProfile(request.authUser!.id),
  );

  app.get("/me/occurrences", { preHandler: [authenticate] }, async (request) => {
    const query = myOccurrencesQuerySchema.parse(request.query);
    return listMyOccurrences(request.authUser!.id, query.skip, query.take);
  });

  app.patch("/me", { preHandler: [authenticate] }, async (request) => {
    const body = updateProfileBodySchema.parse(request.body);
    return updateMyProfile(request.authUser!.id, body);
  });

  app.put("/me/avatar", { preHandler: [authenticate] }, async (request) => {
    const { buffer, mime } = await readImageUpload(request);
    return updateMyAvatar(request.authUser!.id, {
      buffer,
      mime,
      publicBaseUrl: publicBaseUrl(request),
    });
  });

  app.delete("/me/avatar", { preHandler: [authenticate] }, async (request) =>
    removeMyAvatar(request.authUser!.id),
  );
}
