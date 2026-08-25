import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { HttpError } from "../utils/http-error.js";
import { assertCloudinaryReady, isCloudinaryConfigured } from "./cloudinary.js";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export const localUploadDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads",
);

export type StoredImage = {
  url: string;
  thumbnailUrl: string;
  publicId: string;
};

export function assertAllowedImageType(mime: string) {
  const normalized = mime.toLowerCase();
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new HttpError(400, "Envie uma imagem JPG, PNG ou WEBP.");
  }
  return normalized;
}

export async function storeOccurrenceImage(input: {
  buffer: Buffer;
  mime: string;
  publicBaseUrl: string;
}): Promise<StoredImage> {
  const mime = assertAllowedImageType(input.mime);

  if (input.buffer.length < 32) {
    throw new HttpError(400, "Arquivo de imagem inválido.");
  }

  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(input.buffer);
  }

  await mkdir(localUploadDir, { recursive: true });
  const id = randomUUID();
  const filename = `${id}${EXTENSIONS[mime] ?? ".jpg"}`;
  await writeFile(path.join(localUploadDir, filename), input.buffer);
  const url = `${input.publicBaseUrl}/media/${filename}`;

  return {
    url,
    thumbnailUrl: url,
    publicId: `local-${id}`,
  };
}

function uploadToCloudinary(buffer: Buffer): Promise<StoredImage> {
  assertCloudinaryReady();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cidade-plus",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(
            error ?? new HttpError(502, "Não foi possível enviar a imagem agora."),
          );
          return;
        }

        resolve({
          url: result.secure_url,
          thumbnailUrl: cloudinary.url(result.public_id, {
            width: 400,
            height: 400,
            crop: "fill",
            secure: true,
          }),
          publicId: result.public_id,
        });
      },
    );

    Readable.from(buffer).pipe(stream);
  });
}
