import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, imageFormData } from "../lib/api";
import type { AuthUser, MyOccurrencesPage, MyProfile } from "../lib/types";
import { useAuthStore } from "../store/auth";

/** O perfil já traz as 10 mais recentes (Figma); "Ver mais" pagina a partir daí. */
export const PROFILE_RECENT_LIMIT = 10;
const PAGE_SIZE = 20;

export const profileKey = ["profile"] as const;

/** Perfil + indicadores + últimas ocorrências em uma chamada (`GET /me/profile`, D-025). */
export function useMyProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => api<MyProfile>("/me/profile"),
  });
}

/** Ocorrências além das 10 do perfil, carregadas só quando o usuário pede ("Ver mais"). */
export function useMoreMyOccurrences(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...profileKey, "occurrences"],
    enabled,
    initialPageParam: PROFILE_RECENT_LIMIT,
    queryFn: ({ pageParam }) =>
      api<MyOccurrencesPage>(`/me/occurrences?skip=${pageParam}&take=${PAGE_SIZE}`),
    getNextPageParam: (last, pages) => {
      const loaded = PROFILE_RECENT_LIMIT + pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
}

/**
 * Salva o perfil: primeiro a foto (troca ou remoção), depois nome/CEP. Cada passo devolve o
 * usuário atualizado pela API, que vira o novo `user` do store; no fim o perfil é recarregado.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (input: {
      fields?: { name?: string; cep?: string };
      avatar?: { uri: string; type: string } | "remove";
    }) => {
      let user: AuthUser | null = null;
      if (input.avatar === "remove") {
        user = await api<AuthUser>("/me/avatar", { method: "DELETE" });
      } else if (input.avatar) {
        user = await api<AuthUser>("/me/avatar", {
          method: "PUT",
          body: await imageFormData({ uri: input.avatar.uri, name: "avatar.jpg", type: input.avatar.type }),
        });
      }
      if (user) {
        setUser(user);
      }
      if (input.fields && Object.keys(input.fields).length > 0) {
        user = await api<AuthUser>("/me", { method: "PATCH", body: input.fields });
        setUser(user);
      }
      return user;
    },
    // Mesmo com falha parcial (ex.: foto salva, CEP recusado), recarrega o que está no banco.
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}
