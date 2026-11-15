import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate.js";
import { storeOccurrenceImage } from "../../services/upload.js";
import { publicBaseUrl, readImageUpload } from "./read-image-upload.js";

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    "/uploads/image",
    { preHandler: [authenticate] },
    async (request) => {
      const { buffer, mime } = await readImageUpload(request);

      return storeOccurrenceImage({
        buffer,
        mime,
        publicBaseUrl: publicBaseUrl(request),
      });
    },
  );
}
