import { z } from "zod";
import { onlyDigits } from "../../utils/digits.js";

/**
 * Campos editáveis do próprio perfil (D-025). `strict`: qualquer outro campo (id, email,
 * cpf, role...) é recusado com 400 — o usuário editado é sempre o do token.
 */
export const updateProfileBodySchema = z
  .object({
    name: z
      .string({ invalid_type_error: "Nome inválido." })
      .trim()
      .min(2, "O nome precisa ter pelo menos 2 caracteres.")
      .max(120, "O nome pode ter no máximo 120 caracteres.")
      .optional(),
    cep: z
      .string({ invalid_type_error: "CEP inválido." })
      .transform(onlyDigits)
      .refine((value) => value.length === 8, "CEP deve ter 8 dígitos.")
      .optional(),
  })
  .strict()
  .refine((body) => body.name !== undefined || body.cep !== undefined, {
    message: "Nada para atualizar.",
  });

export const myOccurrencesQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
