import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Category, PublicOccurrence } from "../lib/types";

/** Ordem de exibição do Figma (chips e grade de categorias). Desconhecidas vão antes de "Outros". */
const FIGMA_CATEGORY_ORDER = ["Infraestrutura", "Limpeza", "Segurança", "Trânsito", "Outros"];

function figmaRank(name: string) {
  const index = FIGMA_CATEGORY_ORDER.indexOf(name);
  if (index >= 0) {
    return index;
  }
  return FIGMA_CATEGORY_ORDER.length - 1.5;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories", { auth: false }),
    select: (items) =>
      [...items].sort((a, b) => figmaRank(a.name) - figmaRank(b.name) || a.name.localeCompare(b.name)),
  });
}

export function useOccurrences() {
  return useQuery({
    queryKey: ["occurrences"],
    queryFn: () => api<PublicOccurrence[]>("/occurrences", { auth: false }),
  });
}

export function useOccurrence(id: string) {
  return useQuery({
    queryKey: ["occurrences", id],
    queryFn: () => api<PublicOccurrence>(`/occurrences/${id}`, { auth: false }),
    enabled: Boolean(id),
  });
}
