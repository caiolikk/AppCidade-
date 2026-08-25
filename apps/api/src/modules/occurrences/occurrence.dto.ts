import type { EvaluationType, Occurrence, OccurrenceMedia } from "@prisma/client";

type VoteCount = Record<EvaluationType, number> & { total: number };

const emptyVotes = (): VoteCount => ({
  UTIL: 0,
  PERSISTE: 0,
  INCORRETA: 0,
  total: 0,
});

export function toPublicOccurrence(input: {
  occurrence: Occurrence & {
    category: { id: string; name: string };
    media: OccurrenceMedia[];
    evaluations: { type: EvaluationType }[];
  };
}) {
  const votes = emptyVotes();
  for (const vote of input.occurrence.evaluations) {
    votes[vote.type] += 1;
    votes.total += 1;
  }

  return {
    id: input.occurrence.id,
    title: input.occurrence.title,
    description: input.occurrence.description,
    status: input.occurrence.status,
    category: input.occurrence.category,
    latitude: Number(input.occurrence.latitude),
    longitude: Number(input.occurrence.longitude),
    thumbnailUrl: input.occurrence.media[0]?.thumbnailUrl ?? null,
    votes,
    createdAt: input.occurrence.createdAt,
  };
}

export function toAdminOccurrence(input: {
  occurrence: Occurrence & {
    category: { id: string; name: string };
    media: OccurrenceMedia[];
    evaluations: { type: EvaluationType }[];
    user: {
      id: string;
      name: string;
      email: string;
      cpf: string;
      cep: string;
      neighborhood: string;
    };
  };
}) {
  return {
    ...toPublicOccurrence(input),
    description: input.occurrence.description,
    author: input.occurrence.user,
    media: input.occurrence.media.map((item) => ({
      id: item.id,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      publicId: item.publicId,
      createdAt: item.createdAt,
    })),
    updatedAt: input.occurrence.updatedAt,
  };
}
