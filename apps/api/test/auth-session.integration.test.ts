import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

// Sessão longa do app com refresh token rotativo (D-033).

const createdUserIds: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;

type Res = { status: number; body: Record<string, any> };

async function request(method: "GET" | "POST", url: string, options: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await app.inject({
    method,
    url,
    headers,
    payload: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let json: unknown = null;
  try {
    json = response.json();
  } catch {
    json = response.body;
  }
  return { status: response.statusCode, body: json as Record<string, any> } as Res;
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const refresh = (refreshToken: string) => request("POST", "/auth/refresh", { body: { refreshToken } });

async function register() {
  const cpf = String(Math.floor(10000000000 + Math.random() * 89999999999)).slice(0, 11);
  const email = `sessao-${cpf}@cidade.plus`;
  const res = await request("POST", "/auth/register", {
    body: { name: "Sessão Teste", email, password: "senha1234", cpf, cep: "11030000" },
  });
  expect(res.status).toBe(200);
  createdUserIds.push(res.body.user.id);
  return { email, body: res.body };
}

describe("sessão do app (D-033)", () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }); // cascata nos tokens
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("cadastro e login devolvem refresh token; só o hash fica no banco", async () => {
    const { email, body } = await register();
    expect(typeof body.refreshToken).toBe("string");
    expect(body.refreshToken.length).toBeGreaterThanOrEqual(40);
    expect(body.expiresIn).toBe("15m");

    const login = await request("POST", "/auth/login", { body: { email, password: "senha1234" } });
    expect(login.status).toBe(200);
    expect(login.body.refreshToken).not.toBe(body.refreshToken);

    const rows = await prisma.refreshToken.findMany({ where: { userId: body.user.id } });
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.tokenHash === body.refreshToken)).toBe(false);
    expect(rows.some((row) => row.tokenHash === hash(body.refreshToken))).toBe(true);
    // Validade de ~60 dias.
    const days = (rows[0]!.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(59);
    expect(days).toBeLessThanOrEqual(60);
  });

  it("renova: novo par, o access token novo funciona e o refresh antigo é revogado", async () => {
    const { body } = await register();
    const renewed = await refresh(body.refreshToken);
    expect(renewed.status).toBe(200);
    expect(renewed.body.refreshToken).not.toBe(body.refreshToken);
    expect(renewed.body.user.id).toBe(body.user.id);

    const me = await request("GET", "/me", { token: renewed.body.accessToken });
    expect(me.status).toBe(200);

    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(body.refreshToken) } });
    expect(old?.revokedAt).toBeInstanceOf(Date);

    // A cadeia continua: o novo também renova.
    expect((await refresh(renewed.body.refreshToken)).status).toBe(200);
  });

  it("tolerância de rotação: o anterior ainda vale por 60 s, depois não", async () => {
    const { body } = await register();
    expect((await refresh(body.refreshToken)).status).toBe(200);
    // Resposta "perdida": o app tenta de novo com o anterior logo em seguida.
    expect((await refresh(body.refreshToken)).status).toBe(200);

    // Passada a tolerância, reusar um token rotacionado (ex.: roubado) é recusado.
    await prisma.refreshToken.update({
      where: { tokenHash: hash(body.refreshToken) },
      data: { revokedAt: new Date(Date.now() - 120_000) },
    });
    const reused = await refresh(body.refreshToken);
    expect(reused.status).toBe(401);
    expect(reused.body.message).toMatch(/Sessão expirada/);
  });

  it("vencido, inexistente ou mal formado → 401/400", async () => {
    const { body } = await register();
    await prisma.refreshToken.update({
      where: { tokenHash: hash(body.refreshToken) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await refresh(body.refreshToken)).status).toBe(401);
    expect((await refresh("x".repeat(43))).status).toBe(401);
    expect((await request("POST", "/auth/refresh", { body: {} })).status).toBe(400);
  });

  it("logout revoga no servidor e é idempotente", async () => {
    const { body } = await register();
    const out = await request("POST", "/auth/logout", { body: { refreshToken: body.refreshToken } });
    expect(out.status).toBe(204);
    expect((await refresh(body.refreshToken)).status).toBe(401); // nem dentro da tolerância
    expect((await request("POST", "/auth/logout", { body: { refreshToken: body.refreshToken } })).status).toBe(204);
    expect((await request("POST", "/auth/logout", { body: { refreshToken: "y".repeat(43) } })).status).toBe(204);
  });
});
