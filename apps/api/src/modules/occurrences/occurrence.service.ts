import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import { assertPointInUserNeighborhood } from "../geo/geofencing.js";
import { toAdminOccurrence, toPublicOccurrence } from "./occurrence.dto.js";
import type {
  createOccurrenceBodySchema,
  evaluationBodySchema,
  updateStatusBodySchema,
} from "./occurrence.schemas.js";
import type { z } from "zod";

const occurrencePublicInclude = {
  category: { select: { id: true, name: true } },
  media: { orderBy: { createdAt: "asc" as const } },
  evaluations: { select: { type: true } },
};

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

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });

  if (!category) {
    throw new HttpError(400, "Categoria inexistente.");
  }

  await assertPointInUserNeighborhood({
    userId,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const occurrence = await prisma.$transaction(async (tx) => {
    const created = await tx.occurrence.create({
      data: {
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        categoryId: input.categoryId,
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
    orderBy: { createdAt: "desc" },
    include: occurrencePublicInclude,
  });

  return occurrences.map((occurrence) => toPublicOccurrence({ occurrence }));
}

export async function getPublicOccurrence(id: string) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id },
    include: occurrencePublicInclude,
  });

  if (!occurrence) {
    throw new HttpError(404, "Ocorrência não encontrada.");
  }

  return toPublicOccurrence({ occurrence });
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
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
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
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
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
