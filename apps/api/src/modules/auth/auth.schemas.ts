import { z } from "zod";
import { onlyDigits } from "../../utils/digits.js";

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  cpf: z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 11, "CPF deve ter 11 dígitos"),
  cep: z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 8, "CEP deve ter 8 dígitos"),
  neighborhood: z.string().trim().min(2).max(80),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
