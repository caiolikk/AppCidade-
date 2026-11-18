import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import { signAccessToken } from "../../utils/jwt.js";
import { toPrivateUser } from "./auth.dto.js";

/**
 * Sessão do app (D-033): access token JWT curto (`JWT_EXPIRES_IN`, 15 min) + refresh token
 * opaco e longo, com validade deslizante (`REFRESH_TOKEN_TTL_DAYS`). Só o hash do refresh
 * token fica no banco; cada renovação revoga o anterior e emite um novo (rotação).
 */

/**
 * Tolerância para um refresh token recém-rotacionado: se a resposta da renovação se perder
 * (rede ruim), o app ainda renova com o anterior. Depois disso, token revogado = 401.
 */
export const ROTATION_GRACE_MS = 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const invalidSession = () => new HttpError(401, "Sessão expirada. Entre novamente.");

/** Emite access + refresh token para o usuário (login, cadastro e renovação). */
export async function createSession(user: User) {
  const refreshToken = randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    },
  });

  return {
    user: toPrivateUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    expiresIn: env.JWT_EXPIRES_IN,
    refreshToken,
  };
}

/** Troca um refresh token válido por um novo par; o usado é revogado. */
export async function refreshSession(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  const now = Date.now();
  if (!stored || stored.expiresAt.getTime() <= now) {
    throw invalidSession();
  }
  if (stored.revokedAt && now - stored.revokedAt.getTime() > ROTATION_GRACE_MS) {
    throw invalidSession();
  }

  if (!stored.revokedAt) {
    // Condicional: duas renovações simultâneas com o mesmo token não revogam duas vezes.
    await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date(now) },
    });
  }

  // Cada renovação deixa uma linha revogada: limpa as antigas do usuário (fora da tolerância).
  await prisma.refreshToken.deleteMany({
    where: {
      userId: stored.userId,
      OR: [
        { revokedAt: { lt: new Date(now - DAY_MS) } },
        { expiresAt: { lt: new Date(now) } },
      ],
    },
  });

  return createSession(stored.user);
}

/**
 * Logout: revoga o refresh token (sem erro se já não valer). Também apaga os vencidos do
 * usuário, para a tabela não crescer sem limite.
 */
export async function revokeSession(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { id: true, userId: true },
  });
  if (!stored) {
    return;
  }
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), expiresAt: new Date() },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId: stored.userId, expiresAt: { lt: new Date(Date.now() - DAY_MS) } },
    }),
  ]);
}
