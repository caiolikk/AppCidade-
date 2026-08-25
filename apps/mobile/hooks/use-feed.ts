import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Category, PublicOccurrence } from "../lib/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories", { auth: false }),
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
