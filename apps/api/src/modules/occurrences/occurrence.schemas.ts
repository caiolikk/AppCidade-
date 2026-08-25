import { z } from "zod";

export const geofenceBodySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const mediaSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  publicId: z.string().min(3).max(200),
});

export const createOccurrenceBodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(500),
  latitude: z.number(),
  longitude: z.number(),
  categoryId: z.string().uuid(),
  media: z.array(mediaSchema).min(1, "A ocorrência precisa de pelo menos uma foto."),
});

export const evaluationBodySchema = z.object({
  type: z.enum(["UTIL", "PERSISTE", "INCORRETA"]),
});

export const updateStatusBodySchema = z.object({
  status: z.enum([
    "REPORTADA",
    "RECEBIDA",
    "EM_ANALISE",
    "EM_ATENDIMENTO",
    "RESOLVIDA",
    "ARQUIVADA",
    "INVALIDA",
  ]),
});
