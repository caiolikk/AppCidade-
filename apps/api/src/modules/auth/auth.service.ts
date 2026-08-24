import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import { signAccessToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { toPrivateUser } from "./auth.dto.js";
import type { LoginBody, RegisterBody } from "./auth.schemas.js";

export async function registerCitizen(input: RegisterBody) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { cpf: input.cpf }],
    },
  });

  if (existing) {
    throw new HttpError(409, "E-mail ou CPF já cadastrado.");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      cpf: input.cpf,
      cep: input.cep,
      neighborhood: input.neighborhood,
      passwordHash: await hashPassword(input.password),
      role: "CITIZEN",
    },
  });

  return {
    user: toPrivateUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    expiresIn: "15m",
  };
}

export async function login(input: LoginBody) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }

  return {
    user: toPrivateUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    expiresIn: "15m",
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(401, "Usuário não encontrado.");
  }

  return toPrivateUser(user);
}
