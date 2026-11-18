// Rodar na raiz do repositório: npx vitest run apps/mobile/lib
// Renovação automática da sessão no cliente (D-033), com fetch e armazenamento simulados.
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-constants", () => ({ default: {} }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void store.set(key, value),
  deleteItemAsync: async (key: string) => void store.delete(key),
}));

process.env.EXPO_PUBLIC_API_URL = "http://api.test";

const { api, setUnauthorizedHandler } = await import("./api");
const session = await import("./session");

type Call = { url: string; auth: string | null; body: unknown };
let calls: Call[] = [];
/** Servidor falso: o access "novo-*" vale; "velho" dá 401; o refresh depende do cenário. */
let refreshBehavior: "ok" | "invalid" | "offline" = "ok";
let refreshCount = 0;

function json(status: number, body: unknown) {
  return new Response(body === undefined ? "" : JSON.stringify(body), { status });
}

beforeEach(async () => {
  calls = [];
  refreshCount = 0;
  refreshBehavior = "ok";
  store.clear();
  await session.setSessionTokens("velho", "refresh-1");
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, auth: headers.get("Authorization"), body });
    if (url.endsWith("/auth/refresh")) {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (refreshBehavior === "offline") throw new TypeError("Network request failed");
      if (refreshBehavior === "invalid") return json(401, { message: "Sessão expirada." });
      return json(200, { accessToken: `novo-${refreshCount}`, refreshToken: `refresh-${refreshCount + 1}` });
    }
    if (url.endsWith("/auth/login")) return json(401, { message: "E-mail ou senha inválidos." });
    return headers.get("Authorization")?.startsWith("Bearer novo-")
      ? json(200, { ok: true })
      : json(401, { message: "Token de acesso inválido ou expirado." });
  });
});

describe("renovação da sessão no cliente (D-033)", () => {
  it("access vencido: renova uma vez, grava o novo par e repete a requisição", async () => {
    const logout = vi.fn();
    setUnauthorizedHandler(logout);
    await expect(api("/me")).resolves.toEqual({ ok: true });
    expect(refreshCount).toBe(1);
    expect(calls.map((c) => c.url.replace("http://api.test", ""))).toEqual(["/me", "/auth/refresh", "/me"]);
    expect(calls[1]!.body).toEqual({ refreshToken: "refresh-1" });
    expect(calls[2]!.auth).toBe("Bearer novo-1");
    expect(session.getRefreshToken()).toBe("refresh-2");
    expect(store.get("cidade-plus.refreshToken")).toBe("refresh-2");
    expect(logout).not.toHaveBeenCalled();
  });

  it("várias requisições ao mesmo tempo: uma renovação só", async () => {
    const results = await Promise.all([api("/a"), api("/b"), api("/c")]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCount).toBe(1);
  });

  it("refresh inválido (vencido/revogado): desloga", async () => {
    refreshBehavior = "invalid";
    const logout = vi.fn();
    setUnauthorizedHandler(logout);
    await expect(api("/me")).rejects.toMatchObject({ status: 401 });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(session.getToken()).toBeNull();
    expect(session.getRefreshToken()).toBeNull();
  });

  it("sem rede na renovação: NÃO desloga (erro de conexão)", async () => {
    refreshBehavior = "offline";
    const logout = vi.fn();
    setUnauthorizedHandler(logout);
    await expect(api("/me")).rejects.toMatchObject({ status: 0 });
    expect(logout).not.toHaveBeenCalled();
    expect(session.getRefreshToken()).toBe("refresh-1");
  });

  it("senha errada no login não tenta renovar nem desloga", async () => {
    const logout = vi.fn();
    setUnauthorizedHandler(logout);
    await expect(api("/auth/login", { body: { email: "a", password: "b" }, auth: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(refreshCount).toBe(0);
    expect(logout).not.toHaveBeenCalled();
  });
});
