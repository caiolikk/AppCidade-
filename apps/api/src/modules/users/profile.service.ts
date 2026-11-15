import { prisma } from "../../lib/prisma.js";
import { deleteStoredImage, storeOccurrenceImage } from "../../services/upload.js";
import { HttpError } from "../../utils/http-error.js";
import { toPrivateUser } from "../auth/auth.dto.js";
import { resolveResidentialAddress } from "../cep/resolve-address.js";
import { toPublicOccurrence } from "../occurrences/occurrence.dto.js";
import { occurrencePublicInclude } from "../occurrences/occurrence.service.js";
import type { UpdateProfileBody } from "./profile.schemas.js";
import { getUserReputation } from "./reputation.js";

/** Figma "Minha Conta": a lista mostra as 10 mais recentes; o resto vem paginado. */
export const PROFILE_RECENT_LIMIT = 10;

/** Mais recentes primeiro; o id desempata ocorrências criadas no mesmo instante. */
const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

async function findUserOrThrow(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(401, "Usuário não encontrado.");
  }
  return user;
}

/**
 * Resumo do perfil em uma chamada: dados do usuário, indicadores (contagens/agregação no
 * banco, em paralelo) e as últimas ocorrências. Só para o próprio usuário (id do token).
 */
export async function getMyProfile(userId: string) {
  const user = await findUserOrThrow(userId);

  const [occurrences, evaluationsGiven, reputation, recent] = await Promise.all([
    prisma.occurrence.count({ where: { userId } }),
    prisma.evaluation.count({ where: { userId } }),
    getUserReputation(userId),
    prisma.occurrence.findMany({
      where: { userId },
      orderBy: newestFirst,
      take: PROFILE_RECENT_LIMIT,
      include: occurrencePublicInclude,
    }),
  ]);

  return {
    user: toPrivateUser(user),
    stats: {
      /** Ocorrências que o usuário criou. */
      occurrences,
      /** Avaliações que o usuário FEZ (em ocorrências de qualquer pessoa). */
      evaluationsGiven,
      /** Avaliações que outras pessoas fizeram nas ocorrências dele (base da reputação). */
      evaluationsReceived: reputation.received,
      reputation,
    },
    recentOccurrences: recent.map((occurrence) => toPublicOccurrence({ occurrence })),
  };
}

export async function listMyOccurrences(userId: string, skip: number, take: number) {
  const [items, total] = await Promise.all([
    prisma.occurrence.findMany({
      where: { userId },
      orderBy: newestFirst,
      skip,
      take,
      include: occurrencePublicInclude,
    }),
    prisma.occurrence.count({ where: { userId } }),
  ]);

  return { items: items.map((occurrence) => toPublicOccurrence({ occurrence })), total };
}

/**
 * Atualiza nome e/ou local de moradia. O CEP passa pela mesma resolução do cadastro (ViaCEP
 * → bairro de Santos → polígono): o bairro nunca vem do cliente (D-008) e não é o GPS.
 */
export async function updateMyProfile(userId: string, input: UpdateProfileBody) {
  const current = await findUserOrThrow(userId);
  const data: {
    name?: string;
    cep?: string;
    neighborhood?: string;
    santosNeighborhoodId?: string | null;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.cep !== undefined && input.cep !== current.cep) {
    const address = await resolveResidentialAddress(input.cep);
    data.cep = address.cep;
    data.neighborhood = address.neighborhoodName;
    data.santosNeighborhoodId = address.santosNeighborhoodId;
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  return toPrivateUser(user);
}

/** Troca a foto: guarda a nova (mesma infraestrutura das fotos de ocorrência) e apaga a antiga. */
export async function updateMyAvatar(
  userId: string,
  input: { buffer: Buffer; mime: string; publicBaseUrl: string },
) {
  const current = await findUserOrThrow(userId);
  const stored = await storeOccurrenceImage(input);

  const user = await prisma.user.update({
    where: { id: userId },
    // Miniatura (400×400 no Cloudinary): é o que aparece no perfil.
    data: { avatarUrl: stored.thumbnailUrl, avatarPublicId: stored.publicId },
  });

  await deleteStoredImage(current.avatarPublicId);
  return toPrivateUser(user);
}

export async function removeMyAvatar(userId: string) {
  const current = await findUserOrThrow(userId);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null, avatarPublicId: null },
  });

  await deleteStoredImage(current.avatarPublicId);
  return toPrivateUser(user);
}
