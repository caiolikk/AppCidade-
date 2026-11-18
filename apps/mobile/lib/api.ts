import { Platform } from "react-native";
import { getApiUrl } from "./config";
import { clearToken, getRefreshToken, getToken, setSessionTokens } from "./session";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  /** Interno: já é a repetição depois de renovar a sessão (não renova de novo). */
  retried?: boolean;
};

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RefreshResult = "ok" | "invalid" | "offline";
let refreshing: Promise<RefreshResult> | null = null;

/**
 * Renova a sessão com o refresh token (D-033). Uma única renovação em voo: várias
 * requisições que recebem 401 ao mesmo tempo esperam a mesma. "offline" (sem rede ou API
 * fora) NÃO desloga — só "invalid" (refresh vencido/revogado) desloga.
 */
function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) {
    refreshing = (async (): Promise<RefreshResult> => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return "invalid";
      let response: Response;
      try {
        response = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        return "offline";
      }
      if (response.status === 401 || response.status === 400) return "invalid";
      if (!response.ok) return "offline";
      try {
        const session = (await response.json()) as { accessToken: string; refreshToken: string };
        await setSessionTokens(session.accessToken, session.refreshToken);
        return "ok";
      } catch {
        return "offline";
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const form = isFormData(options.body);
  if (options.body !== undefined && !form) {
    headers.set("Content-Type", "application/json");
  }

  const token = options.token === undefined ? getToken() : options.token;
  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (form) {
    body = options.body as FormData;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar à API. Confira se ela está no ar.");
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  // Access token vencido (15 min): renova a sessão e repete uma vez, sem o usuário perceber.
  // Rotas /auth/* (login, cadastro) devolvem 401 por senha errada: essas não renovam.
  if (
    response.status === 401 &&
    options.auth !== false &&
    !options.retried &&
    !path.startsWith("/auth/") &&
    token
  ) {
    // Outra requisição já renovou enquanto esta estava em voo: só repete com o token novo.
    const result = getToken() !== token ? "ok" : await refreshSession();
    if (result === "ok") {
      return api<T>(path, { ...options, token: undefined, retried: true });
    }
    if (result === "offline") {
      throw new ApiError(0, "Não foi possível conectar à API. Confira se ela está no ar.");
    }
  }

  if (response.status === 401 && options.auth !== false && !path.startsWith("/auth/")) {
    await clearToken();
    onUnauthorized?.();
  }

  if (!response.ok) {
    const baseMessage =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível concluir a solicitação.";
    // Erros de validação (Zod) trazem o detalhe em `issues`; mostra o primeiro ao usuário.
    const firstIssue =
      typeof data === "object" && data && "issues" in data && Array.isArray(data.issues)
        ? (data.issues[0] as { message?: unknown } | undefined)?.message
        : undefined;
    const message =
      typeof firstIssue === "string" && firstIssue ? `${baseMessage} ${firstIssue}` : baseMessage;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function apiUploadImage(file: { uri: string; name: string; type: string }) {
  return api<{ url: string; thumbnailUrl: string; publicId: string }>("/uploads/image", {
    method: "POST",
    body: await imageFormData(file),
  });
}

/**
 * Multipart com a imagem no campo "file" (fotos de ocorrência e foto de perfil). No
 * Android/iOS o FormData aceita { uri, name, type }; no navegador isso vira "[object Object]",
 * então lá a imagem (blob:/data: URI do seletor) é lida como Blob.
 */
export async function imageFormData(file: { uri: string; name: string; type: string }) {
  const body = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    body.append("file", blob, file.name);
    return body;
  }
  body.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob,
  );
  return body;
}
