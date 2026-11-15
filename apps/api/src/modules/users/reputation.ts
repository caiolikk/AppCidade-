import type { EvaluationType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/**
 * REGRA PROVISÓRIA DE REPUTAÇÃO (D-024) — único lugar onde ela existe.
 *
 * As avaliações não têm nota: são UTIL, PERSISTE ou INCORRETA. Para exibir na escala do
 * Figma (0–5, ex.: "4.8"):
 *   reputação = 5 × (positivas ÷ total), com 1 casa decimal
 * Positivas: UTIL (o relato ajudou) e PERSISTE (alguém confirmou que o problema existe).
 * Negativa: INCORRETA.
 *
 * Só contam avaliações RECEBIDAS nas ocorrências do usuário, sem os votos dele mesmo. Cada
 * pessoa vota no máximo uma vez por ocorrência (unique userId+occurrenceId), então não há
 * duplicatas. Sem avaliações recebidas → score null ("Sem avaliações"), nunca zero.
 */
export const REPUTATION_SCALE = 5;

const POSITIVE: ReadonlySet<EvaluationType> = new Set(["UTIL", "PERSISTE"]);

export type Reputation = {
  /** 0–5 com uma casa decimal; null quando ainda não há avaliações recebidas. */
  score: number | null;
  scale: number;
  positive: number;
  received: number;
};

export function computeReputation(counts: Partial<Record<EvaluationType, number>>): Reputation {
  let received = 0;
  let positive = 0;
  for (const [type, count] of Object.entries(counts) as Array<[EvaluationType, number]>) {
    received += count;
    if (POSITIVE.has(type)) {
      positive += count;
    }
  }

  return {
    score: received === 0 ? null : Math.round((REPUTATION_SCALE * positive * 10) / received) / 10,
    scale: REPUTATION_SCALE,
    positive,
    received,
  };
}

/** Agrega no banco (GROUP BY type) as avaliações recebidas pelo autor, sem carregar linhas. */
export async function getUserReputation(userId: string) {
  const groups = await prisma.evaluation.groupBy({
    by: ["type"],
    where: {
      occurrence: { userId },
      userId: { not: userId },
    },
    _count: { _all: true },
  });

  return computeReputation(
    Object.fromEntries(groups.map((group) => [group.type, group._count._all])),
  );
}
