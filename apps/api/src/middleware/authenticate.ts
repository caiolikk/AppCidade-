import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "../utils/http-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Token de acesso ausente.");
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    request.authUser = { id: payload.sub, role: payload.role };
  } catch {
    throw new HttpError(401, "Token de acesso inválido ou expirado.");
  }
}

/**
 * Login opcional: rotas públicas que mostram algo a mais para quem está logado (ex.:
 * `viewer` no detalhe da ocorrência, D-032). Token ausente ou inválido não gera erro.
 */
export function optionalAuthUserId(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  try {
    return verifyAccessToken(header.slice("Bearer ".length)).sub;
  } catch {
    return null;
  }
}
