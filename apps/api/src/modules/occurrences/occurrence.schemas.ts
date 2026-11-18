import { z } from "zod";

// Validação de coordenadas no schema: vale sempre, com ou sem geofence (D-018).
const latitudeSchema = z
  .number({ invalid_type_error: "Latitude deve ser um número." })
  .finite("Latitude inválida.")
  .min(-90, "Latitude deve estar entre -90 e 90.")
  .max(90, "Latitude deve estar entre -90 e 90.");

const longitudeSchema = z
  .number({ invalid_type_error: "Longitude deve ser um número." })
  .finite("Longitude inválida.")
  .min(-180, "Longitude deve estar entre -180 e 180.")
  .max(180, "Longitude deve estar entre -180 e 180.");

export const geofenceBodySchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

const mediaSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  publicId: z.string().min(3).max(200),
});

export const createOccurrenceBodySchema = z.object({
  title: z
    .string({ required_error: "Informe um título." })
    .trim()
    .min(3, "O título precisa ter pelo menos 3 caracteres.")
    .max(200, "O título pode ter no máximo 200 caracteres."),
  description: z
    .string({ required_error: "Descreva a ocorrência." })
    .trim()
    .min(3, "A descrição precisa ter pelo menos 3 caracteres.")
    .max(500, "A descrição pode ter no máximo 500 caracteres."),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  categoryId: z
    .string({ required_error: "Escolha uma categoria." })
    .uuid("Categoria inválida."),
  // Opcional no schema; o service exige quando a categoria tem subcategorias (D-022).
  subcategoryId: z.string().uuid("Subcategoria inválida.").optional(),
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

/**
 * Edição pelo autor (D-032): só os campos enviados mudam. Local vai em par (latitude +
 * longitude) e a categoria leva junto a subcategoria (`null` = sem subcategoria, "Outros").
 * `media` troca a foto.
 */
export const updateOccurrenceBodySchema = z
  .object({
    title: createOccurrenceBodySchema.shape.title.optional(),
    description: createOccurrenceBodySchema.shape.description.optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    categoryId: createOccurrenceBodySchema.shape.categoryId.optional(),
    subcategoryId: z.string().uuid("Subcategoria inválida.").nullable().optional(),
    media: z.array(mediaSchema).length(1, "Envie uma foto.").optional(),
  })
  .refine((body) => (body.latitude === undefined) === (body.longitude === undefined), {
    message: "Envie latitude e longitude juntas.",
  })
  .refine((body) => body.subcategoryId === undefined || body.categoryId !== undefined, {
    message: "Envie a categoria junto com a subcategoria.",
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Nada para alterar.",
  });
