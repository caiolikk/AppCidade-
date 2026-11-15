import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { computeReputation } from "../src/modules/users/reputation.js";
import { deleteStoredImage } from "../src/services/upload.js";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const createdUserIds: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;

type Res = { status: number; body: Record<string, any> };

async function request(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  url: string,
  options: { token?: string; body?: unknown; payload?: Buffer; headers?: Record<string, string> } = {},
): Promise<Res> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await app.inject({
    method,
    url,
    headers,
    payload: options.payload ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  let json: unknown = null;
  try {
    json = response.json();
  } catch {
    json = response.body;
  }
  return { status: response.statusCode, body: json as Record<string, any> };
}

function multipartPng() {
  const boundary = "----CidadePlusProfile";
  return {
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      PNG_1X1,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

function uniqueCpf() {
  return String(Math.floor(10000000000 + Math.random() * 89999999999)).slice(0, 11);
}

async function register(name: string) {
  const cpf = uniqueCpf();
  const res = await request("POST", "/auth/register", {
    body: { name, email: `perfil-${cpf}@cidade.plus`, password: "senha1234", cpf, cep: "11030000" },
  });
  expect(res.status).toBe(200);
  createdUserIds.push(res.body.user.id);
  return { id: String(res.body.user.id), token: String(res.body.accessToken) };
}

let outrosCategoryId = "";

async function createOccurrence(token: string, title: string) {
  const file = multipartPng();
  const upload = await request("POST", "/uploads/image", { token, payload: file.payload, headers: file.headers });
  const res = await request("POST", "/occurrences", {
    token,
    body: {
      title,
      description: "Criada pelo teste de perfil.",
      latitude: -23.989,
      longitude: -46.3075,
      categoryId: outrosCategoryId, // "Outros" não exige subcategoria (D-022)
      media: [{ url: upload.body.url, thumbnailUrl: upload.body.thumbnailUrl, publicId: upload.body.publicId }],
    },
  });
  expect(res.status).toBe(200);
  return String(res.body.id);
}

async function vote(token: string, occurrenceId: string, type: "UTIL" | "PERSISTE" | "INCORRETA") {
  const res = await request("POST", `/occurrences/${occurrenceId}/evaluations`, { token, body: { type } });
  expect(res.status).toBe(200);
}

describe("perfil do usuário (D-024/D-025)", () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const categories = (await request("GET", "/categories")).body as unknown as Array<{ id: string; name: string }>;
    outrosCategoryId = categories.find((item) => item.name === "Outros")!.id;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: createdUserIds } } });
      await Promise.all(users.map((user) => deleteStoredImage(user.avatarPublicId)));
      await prisma.evaluation.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.occurrence.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("regra de reputação: 5 × positivas ÷ recebidas, 1 casa, null sem avaliações", () => {
    expect(computeReputation({})).toMatchObject({ score: null, received: 0 });
    expect(computeReputation({ UTIL: 0 })).toMatchObject({ score: null });
    expect(computeReputation({ UTIL: 3, INCORRETA: 1 }).score).toBe(3.8); // 3,75 → 3,8
    expect(computeReputation({ UTIL: 2, PERSISTE: 2 }).score).toBe(5);
    expect(computeReputation({ INCORRETA: 2 }).score).toBe(0);
    expect(computeReputation({ UTIL: 1, PERSISTE: 1, INCORRETA: 1 })).toMatchObject({
      score: 3.3,
      positive: 2,
      received: 3,
    });
  });

  it("indicadores, reputação e últimas ocorrências vêm dos dados reais de cada usuário", async () => {
    const autora = await register("Autora Perfil");
    const vizinho = await register("Vizinho Avaliador");
    const terceira = await register("Terceira Avaliadora");

    const o1 = await createOccurrence(autora.token, "Primeira da autora");
    const o2 = await createOccurrence(autora.token, "Segunda da autora");
    const o3 = await createOccurrence(autora.token, "Terceira da autora");
    const doVizinho = await createOccurrence(vizinho.token, "Do vizinho");

    // Recebidas pela autora (de outras pessoas): UTIL, INCORRETA, PERSISTE, UTIL → 3 de 4 positivas.
    await vote(vizinho.token, o1, "UTIL");
    await vote(vizinho.token, o2, "INCORRETA");
    await vote(vizinho.token, o3, "PERSISTE");
    await vote(terceira.token, o2, "UTIL");
    // Voto da autora na própria ocorrência: conta como "realizada", NÃO entra na reputação.
    await vote(autora.token, o1, "INCORRETA");
    // Voto da autora na ocorrência do vizinho: "realizada" por ela, "recebida" por ele.
    await vote(autora.token, doVizinho, "UTIL");

    const perfil = await request("GET", "/me/profile", { token: autora.token });
    expect(perfil.status).toBe(200);
    expect(perfil.body.user).toMatchObject({ id: autora.id, name: "Autora Perfil", avatarUrl: null });
    expect(perfil.body.stats).toEqual({
      occurrences: 3,
      evaluationsGiven: 2,
      evaluationsReceived: 4,
      reputation: { score: 3.8, scale: 5, positive: 3, received: 4 },
    });
    // Mais recentes primeiro, só da autora, com status real e sem dados pessoais.
    const recent = perfil.body.recentOccurrences as Array<Record<string, any>>;
    expect(recent.map((item) => item.id)).toEqual([o3, o2, o1]);
    expect(recent[0]).toMatchObject({ status: "REPORTADA", category: { name: "Outros" } });
    expect(recent[0]!.author).toBeUndefined();

    const vizinhoPerfil = await request("GET", "/me/profile", { token: vizinho.token });
    expect(vizinhoPerfil.body.stats).toEqual({
      occurrences: 1,
      evaluationsGiven: 3,
      evaluationsReceived: 1,
      reputation: { score: 5, scale: 5, positive: 1, received: 1 },
    });
    expect(vizinhoPerfil.body.recentOccurrences.map((item: { id: string }) => item.id)).toEqual([doVizinho]);

    // Sem ocorrências e sem avaliações recebidas → zeros e reputação null ("Sem avaliações").
    const terceiraPerfil = await request("GET", "/me/profile", { token: terceira.token });
    expect(terceiraPerfil.body.stats).toEqual({
      occurrences: 0,
      evaluationsGiven: 1,
      evaluationsReceived: 0,
      reputation: { score: null, scale: 5, positive: 0, received: 0 },
    });
    expect(terceiraPerfil.body.recentOccurrences).toEqual([]);

    // Paginação de "minhas ocorrências".
    const page1 = await request("GET", "/me/occurrences?skip=0&take=2", { token: autora.token });
    expect(page1.body.total).toBe(3);
    expect(page1.body.items.map((item: { id: string }) => item.id)).toEqual([o3, o2]);
    const page2 = await request("GET", "/me/occurrences?skip=2&take=2", { token: autora.token });
    expect(page2.body.items.map((item: { id: string }) => item.id)).toEqual([o1]);
    expect((await request("GET", "/me/occurrences?take=500", { token: autora.token })).status).toBe(400);

    // Sem token → 401.
    expect((await request("GET", "/me/profile")).status).toBe(401);
    expect((await request("GET", "/me/occurrences")).status).toBe(401);
  });

  it("edita nome, CEP (bairro) e foto do próprio perfil, sem tocar em outros usuários", async () => {
    const eu = await register("Nome Antigo");
    const outro = await register("Outra Pessoa");

    const nome = await request("PATCH", "/me", { token: eu.token, body: { name: "  Nome Novo  " } });
    expect(nome.status).toBe(200);
    expect(nome.body.name).toBe("Nome Novo");

    // CEP de Santos → bairro resolvido pelo backend (11060-001 = Gonzaga).
    const cep = await request("PATCH", "/me", { token: eu.token, body: { cep: "11060-001" } });
    expect(cep.status).toBe(200);
    expect(cep.body).toMatchObject({ cep: "11060001", neighborhood: "Gonzaga" });
    const stored = await prisma.user.findUnique({ where: { id: eu.id } });
    expect(stored).toMatchObject({ name: "Nome Novo", cep: "11060001", neighborhood: "Gonzaga" });

    // Inválidos → 400 e nada muda.
    expect((await request("PATCH", "/me", { token: eu.token, body: { cep: "01310100" } })).status).toBe(400);
    expect((await request("PATCH", "/me", { token: eu.token, body: { name: "A" } })).status).toBe(400);
    expect((await request("PATCH", "/me", { token: eu.token, body: {} })).status).toBe(400);
    // Tentar mirar outro usuário pelo corpo: campo recusado (strict) e o outro fica intacto.
    const alvo = await request("PATCH", "/me", { token: eu.token, body: { id: outro.id, name: "Invasor" } });
    expect(alvo.status).toBe(400);
    expect((await request("PATCH", "/me", { token: eu.token, body: { email: "x@y.z" } })).status).toBe(400);
    expect(await prisma.user.findUnique({ where: { id: outro.id } })).toMatchObject({ name: "Outra Pessoa" });
    expect(await prisma.user.findUnique({ where: { id: eu.id } })).toMatchObject({ cep: "11060001" });
    expect((await request("PATCH", "/me", { body: { name: "Sem token" } })).status).toBe(401);

    // Foto: upload → persiste (aparece no /me, como depois de reabrir o app) → troca → remove.
    const file = multipartPng();
    const avatar = await request("PUT", "/me/avatar", { token: eu.token, payload: file.payload, headers: file.headers });
    expect(avatar.status).toBe(200);
    expect(String(avatar.body.avatarUrl)).toMatch(/^https?:\/\//);
    const me = await request("GET", "/me", { token: eu.token });
    expect(me.body.avatarUrl).toBe(avatar.body.avatarUrl);

    const file2 = multipartPng();
    const avatar2 = await request("PUT", "/me/avatar", { token: eu.token, payload: file2.payload, headers: file2.headers });
    expect(avatar2.body.avatarUrl).not.toBe(avatar.body.avatarUrl);

    const notImage = await request("PUT", "/me/avatar", {
      token: eu.token,
      payload: Buffer.from("--b\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.txt\"\r\nContent-Type: text/plain\r\n\r\nola\r\n--b--\r\n"),
      headers: { "content-type": "multipart/form-data; boundary=b" },
    });
    expect(notImage.status).toBe(400);
    expect((await request("PUT", "/me/avatar", { payload: file.payload, headers: file.headers })).status).toBe(401);

    const removed = await request("DELETE", "/me/avatar", { token: eu.token });
    expect(removed.status).toBe(200);
    expect(removed.body.avatarUrl).toBeNull();
    expect((await prisma.user.findUnique({ where: { id: eu.id } }))!.avatarPublicId).toBeNull();
    expect((await prisma.user.findUnique({ where: { id: outro.id } }))!.avatarUrl).toBeNull();
  });
});
