import type { Role } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "../utils/http-error.js";

export function authorize(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.authUser) {
      throw new HttpError(401, "Token de acesso ausente.");
    }

    if (!roles.includes(request.authUser.role)) {
      throw new HttpError(403, "Você não tem permissão para acessar este recurso.");
    }
  };
}
