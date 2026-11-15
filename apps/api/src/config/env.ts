import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, "../..");
const repoRoot = path.resolve(apiRoot, "../..");

loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(apiRoot, ".env"), override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  /**
   * Regra "só criar ocorrência dentro do polígono do bairro residencial" (D-008).
   * Desativada temporariamente (D-018): o padrão é "false". Para reativar, use "true" no .env.
   */
  OCCURRENCE_GEOFENCE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /**
   * Produção sem Cloudinary grava fotos no disco local, que na maioria das plataformas é
   * apagado a cada deploy. Só use "true" com disco persistente (VPS ou volume). Plano
   * hospedagem-e-deploy.
   */
  UPLOADS_LOCAL_IN_PRODUCTION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

// Plataformas (Railway, Render, Fly...) informam a porta em PORT; localmente vale API_PORT.
const parsed = envSchema.parse({
  ...process.env,
  API_PORT: process.env.PORT ?? process.env.API_PORT,
});

const hasCloudinary = Boolean(
  parsed.CLOUDINARY_CLOUD_NAME && parsed.CLOUDINARY_API_KEY && parsed.CLOUDINARY_API_SECRET,
);

if (parsed.NODE_ENV === "production" && !hasCloudinary && !parsed.UPLOADS_LOCAL_IN_PRODUCTION) {
  throw new Error(
    "Produção sem Cloudinary: configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e " +
      "CLOUDINARY_API_SECRET (ou UPLOADS_LOCAL_IN_PRODUCTION=true se o disco for persistente).",
  );
}

export const env = parsed;
