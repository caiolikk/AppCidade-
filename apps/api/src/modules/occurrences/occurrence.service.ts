import { Prisma, type OccurrenceStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import { deleteStoredImage } from "../../services/upload.js";
import { assertPointInUserNeighborhood } from "../geo/geofencing.js";
import { toAdminOccurrence, toPublicOccurrence } from "./occurrence.dto.js";
import type {
  createOccurrenceBodySchema,
  evaluationBodySchema,
  updateOccurrenceBodySchema,
  updateStatusBodySchema,
} from "./occurrence.schemas.js";
import type { z } from "zod";

/** Include padrão dos DTOs de ocorrência (também usado pelo perfil, D-025). */
export const occurrencePublicInclude = {
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
  media: { orderBy: { createdAt: "asc" as const } },
  evaluations: { select: { type: true } },
};

/** Ocorrências não removidas pelo autor (D-032). Toda consulta do app filtra por isto. */
export const activeOccurrence = { deletedAt: null };

/**
 * D-032: o autor pode editar ou remover só enquanto a ocorrência está "em análise" — os 3
 * status que o app mostra em amarelo (`statusVisual` = "analise"). Depois que o gestor a
 * move adiante (atendimento, resolvida, arquivada, inválida), não pode mais.
 */
export const AUTHOR_EDITABLE_STATUSES: readonly OccurrenceStatus[] = [
  "REPORTADA",
  "RECEBIDA",
  "EM_ANALISE",
];

function canAuthorEdit(status: OccurrenceStatus) {
  return AUTHOR_EDITABLE_STATUSES.includes(status);
}

/**
 * D-022: a subcategoria tem de ser da categoria escolhida; é obrigatória quando a categoria
 * tem opções (a categoria "Outros" não tem). Usada na criação e na edição.
 */
async function assertCategoryChoice(categoryId: string, subcategoryId: string | null | undefined) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { subcategories: { select: { id: true } } },
  });

  if (!category) {
    throw new HttpError(400, "Categoria inexistente.");
  }

  if (subcategoryId) {
    if (!category.subcategories.some((item) => item.id === subcategoryId)) {
      throw new HttpError(400, "A subcategoria não pertence à categoria escolhida.");
    }
  } else if (category.subcategories.length > 0) {
    throw new HttpError(400, "Escolha uma subcategoria.");
  }
}

export async function checkGeofence(
  userId: string,
  latitude: number,
  longitude: number,
) {
  await assertPointInUserNeighborhood({ userId, latitude, longitude });
  return { allowed: true };
}

export async function createOccurrence(
  userId: string,
  input: z.infer<typeof createOccurrenceBodySchema>,
) {
  if (input.media.length < 1) {
    throw new HttpError(400, "A ocorrência precisa de pelo menos uma foto.");
  }

  await assertCategoryChoice(input.categoryId, input.subcategoryId);

  // Regra de bairro desativada temporariamente (D-018). A estrutura continua disponível.
  if (env.OCCURRENCE_GEOFENCE_ENABLED) {
    await assertPointInUserNeighborhood({
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
    });
  }

  const occurrence = await prisma.$transaction(async (tx) => {
    const created = await tx.occurrence.create({
      data: {
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
        userId,
        media: {
          create: input.media.map((item) => ({
            url: item.url,
            thumbnailUrl: item.thumbnailUrl,
            publicId: item.publicId,
          })),
        },
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: "REPORTADA",
            changedById: userId,
          },
        },
      },
      include: {
        ...occurrencePublicInclude,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            cep: true,
            neighborhood: true,
          },
        },
      },
    });

    return created;
  });

  return toAdminOccurrence({ occurrence });
}

export async function listPublicOccurrences() {
  const occurrences = await prisma.occurrence.findMany({
    where: activeOccurrence,
    orderBy: { createdAt: "desc" },
    include: occurrencePublicInclude,
  });

  return occurrences.map((occurrence) => toPublicOccurrence({ occurrence }));
}

/**
 * Detalhe público. Com login (`viewerId`), diz se quem vê é o autor e se ainda pode editar
 * ou remover (D-032) — sem expor quem é o autor para os outros.
 */
export async function getPublicOccurrence(id: string, viewerId?: string | null) {
  const occurrence = await prisma.occurrence.findFirst({
    where: { id, ...activeOccurrence },
    include: occurrencePublicInclude,
  });

  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }

  const isAuthor = Boolean(viewerId) && occurrence.userId === viewerId;
  return {
    ...toPublicOccurrence({ occurrence }),
    viewer: { isAuthor, canEdit: isAuthor && canAuthorEdit(occurrence.status) },
  };
}

const NOT_EDITABLE_MESSAGE =
  "Esta ocorrência já está sendo tratada pela prefeitura e não pode mais ser alterada.";

/**
 * Busca a ocorrência para o autor alterar: 404 se não existe ou foi removida, 403 se é de
 * outra pessoa, 409 se já saiu de "em análise".
 */
async function findEditableByAuthor(userId: string, occurrenceId: string) {
  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, ...activeOccurrence },
    include: { media: { select: { publicId: true } } },
  });
  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }
  if (occurrence.userId !== userId) {
    throw new HttpError(403, "Só quem registrou a ocorrência pode alterá-la.");
  }
  if (!canAuthorEdit(occurrence.status)) {
    throw new HttpError(409, NOT_EDITABLE_MESSAGE);
  }
  return occurrence;
}

/** Update condicional: só grava se continuar do autor, ativa e em análise (corrida com o gestor). */
function editableWhere(userId: string, occurrenceId: string) {
  return {
    id: occurrenceId,
    userId,
    ...activeOccurrence,
    status: { in: [...AUTHOR_EDITABLE_STATUSES] },
  };
}

/** Edição pelo autor (D-032). Trocar a foto apaga a anterior (linha e arquivo). */
export async function updateOwnOccurrence(
  userId: string,
  occurrenceId: string,
  input: z.infer<typeof updateOccurrenceBodySchema>,
) {
  const current = await findEditableByAuthor(userId, occurrenceId);

  if (input.categoryId !== undefined) {
    await assertCategoryChoice(input.categoryId, input.subcategoryId ?? null);
  }
  if (
    env.OCCURRENCE_GEOFENCE_ENABLED &&
    input.latitude !== undefined &&
    input.longitude !== undefined
  ) {
    await assertPointInUserNeighborhood({
      userId,
      latitude: input.latitude,
      longitude: input.longitude,
    });
  }

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.occurrence.updateMany({
      where: editableWhere(userId, occurrenceId),
      data: {
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        categoryId: input.categoryId,
        // Trocar a categoria sempre redefine a subcategoria (null = sem, ex.: "Outros").
        subcategoryId: input.categoryId !== undefined ? (input.subcategoryId ?? null) : undefined,
      },
    });
    if (count === 0) {
      throw new HttpError(409, NOT_EDITABLE_MESSAGE);
    }
    if (input.media) {
      await tx.occurrenceMedia.deleteMany({ where: { occurrenceId } });
      await tx.occurrenceMedia.createMany({
        data: input.media.map((item) => ({
          occurrenceId,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          publicId: item.publicId,
        })),
      });
    }
  });

  if (input.media) {
    const kept = new Set(input.media.map((item) => item.publicId));
    await Promise.all(
      current.media
        .filter((item) => !kept.has(item.publicId))
        .map((item) => deleteStoredImage(item.publicId)),
    );
  }

  return getPublicOccurrence(occurrenceId, userId);
}

/**
 * Remoção suave pelo autor (D-032): a ocorrência some do app (`deletedAt`), mas avaliações e
 * histórico de status ficam no banco. As fotos são apagadas (quem remove espera que sumam).
 */
export async function removeOwnOccurrence(userId: string, occurrenceId: string) {
  const current = await findEditableByAuthor(userId, occurrenceId);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.occurrence.updateMany({
      where: editableWhere(userId, occurrenceId),
      data: { deletedAt: new Date() },
    });
    if (count === 0) {
      throw new HttpError(409, NOT_EDITABLE_MESSAGE);
    }
    await tx.occurrenceMedia.deleteMany({ where: { occurrenceId } });
  });

  await Promise.all(current.media.map((item) => deleteStoredImage(item.publicId)));
  return { removed: true };
}

export async function getAdminOccurrence(id: string) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id },
    include: {
      ...occurrencePublicInclude,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          cep: true,
          neighborhood: true,
        },
      },
    },
  });

  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }

  return toAdminOccurrence({ occurrence });
}

export async function evaluateOccurrence(
  userId: string,
  occurrenceId: string,
  input: z.infer<typeof evaluationBodySchema>,
) {
  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, ...activeOccurrence },
  });

  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }

  try {
    const evaluation = await prisma.evaluation.create({
      data: {
        userId,
        occurrenceId,
        type: input.type,
      },
    });

    return evaluation;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "Você já avaliou esta ocorrência.");
    }

    throw error;
  }
}

export async function updateOccurrenceStatus(
  managerId: string,
  occurrenceId: string,
  input: z.infer<typeof updateStatusBodySchema>,
) {
  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, ...activeOccurrence },
  });

  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }

  const updated = await prisma.occurrence.update({
    where: { id: occurrenceId },
    data: {
      status: input.status,
      statusHistory: {
        create: {
          previousStatus: occurrence.status,
          newStatus: input.status,
          changedById: managerId,
        },
      },
    },
    include: {
      ...occurrencePublicInclude,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          cpf: true,
          cep: true,
          neighborhood: true,
        },
      },
    },
  });

  return toAdminOccurrence({ occurrence: updated });
}
