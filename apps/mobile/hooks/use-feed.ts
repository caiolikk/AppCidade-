import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Category, PublicOccurrence } from "../lib/types";
import { useAuthStore } from "../store/auth";

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

/**
 * Detalhe com o token: a resposta traz `viewer` (autor? pode editar?, D-032). O id do usuário
 * entra na chave para o cache de uma conta nunca valer para outra.
 */
export function useOccurrence(id: string) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  return useQuery({
    queryKey: ["occurrences", id, userId],
    queryFn: () => api<PublicOccurrence>(`/occurrences/${id}`),
    enabled: Boolean(id),
  });
}
