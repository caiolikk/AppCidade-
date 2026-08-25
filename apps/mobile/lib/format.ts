import type { OccurrenceStatus, PublicOccurrence, Role } from "./types";

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  REPORTADA: "Reportada",
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  EM_ATENDIMENTO: "Em atendimento",
  RESOLVIDA: "Resolvida",
  ARQUIVADA: "Arquivada",
  INVALIDA: "Inválida",
};

export const EVALUATION_LABEL: Record<"UTIL" | "PERSISTE" | "INCORRETA", string> = {
  UTIL: "Útil",
  PERSISTE: "Ainda existe",
  INCORRETA: "Incorreta",
};

export const ROLE_LABEL: Record<Role, string> = {
  CITIZEN: "Cidadão",
  MANAGER: "Gestor",
  ADMIN: "Admin",
};

export function formatReportedAgo(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(elapsed / 60_000));
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function formatCep(cep: string) {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 6) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) {
    return digits;
  }
  if (digits.length < 7) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length < 10) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function toCardModel(occurrence: PublicOccurrence) {
  return {
    id: occurrence.id,
    title: occurrence.title,
    category: occurrence.category.name,
    reportedAgo: formatReportedAgo(occurrence.createdAt),
    evaluations: occurrence.votes.total,
    status: occurrence.status,
    tag: STATUS_LABEL[occurrence.status],
    thumbnailUrl: occurrence.thumbnailUrl,
  };
}

export type OccurrenceCardModel = ReturnType<typeof toCardModel>;
