import type { FastifyRequest } from "fastify";
import { HttpError } from "../../utils/http-error.js";

/** URL base que o celular consegue alcançar (o mesmo host que ele usou para chamar a API). */
export function publicBaseUrl(request: FastifyRequest) {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  const proto = request.headers["x-forwarded-proto"] ?? request.protocol;
  return `${proto}://${host}`;
}

/**
 * Lê a imagem do multipart (campo "file"), respeitando o limite de 8 MB do app.ts.
 * Usado pelo upload de foto da ocorrência e pela foto de perfil (D-025).
 */
export async function readImageUpload(request: FastifyRequest) {
  if (!request.isMultipart()) {
    throw new HttpError(400, "Envie a imagem como multipart/form-data no campo \"file\".");
  }

  const file = await request.file();

  if (!file) {
    throw new HttpError(400, "Nenhuma imagem enviada.");
  }

  const buffer = await file.toBuffer().catch((error: { code?: string }) => {
    if (error?.code === "FST_REQ_FILE_TOO_LARGE") {
      throw new HttpError(413, "A imagem deve ter no máximo 8 MB.");
    }
    throw error;
  });

  return { buffer, mime: file.mimetype };
}
