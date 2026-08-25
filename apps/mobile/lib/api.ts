import { getApiUrl } from "./config";
import { clearToken, getToken } from "./session";

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
};

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
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

  if (response.status === 401 && options.auth !== false) {
    await clearToken();
    onUnauthorized?.();
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : "Não foi possível concluir a solicitação.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function apiUploadImage(file: { uri: string; name: string; type: string }) {
  const body = new FormData();
  body.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob,
  );

  return api<{ url: string; thumbnailUrl: string; publicId: string }>("/uploads/image", {
    method: "POST",
    body,
  });
}
