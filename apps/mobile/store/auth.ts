import { create } from "zustand";
import { api, ApiError, setUnauthorizedHandler } from "../lib/api";
import { clearToken, loadToken, setToken } from "../lib/session";
import type { AuthResponse, AuthUser } from "../lib/types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  applySession: (session: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrating: true,
  hydrate: async () => {
    setUnauthorizedHandler(() => {
      void get().logout();
    });

    const token = await loadToken();
    if (!token) {
      set({ token: null, user: null, hydrating: false });
      return;
    }

    try {
      const user = await api<AuthUser>("/me", { token });
      set({ token, user, hydrating: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearToken();
        set({ token: null, user: null, hydrating: false });
        return;
      }
      set({ token, hydrating: false });
    }
  },
  applySession: async (session) => {
    await setToken(session.accessToken);
    set({ token: session.accessToken, user: session.user });
  },
  logout: async () => {
    await clearToken();
    set({ token: null, user: null });
  },
}));
