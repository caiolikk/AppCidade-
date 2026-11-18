import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { deleteStoredImage } from "../src/services/upload.js";

// Edição e remoção pelo autor, só enquanto "em análise" (D-032).

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const createdUserIds: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;

type Res = { status: number; body: Record<string, any> };

async function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

async function upload(token: string) {
  const boundary = "----CidadePlusAutor";
  const res = await request("POST", "/uploads/image", {
    token,
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      PNG_1X1,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  });
  expect(res.status).toBe(200);
  return { url: res.body.url, thumbnailUrl: res.body.thumbnailUrl, publicId: res.body.publicId as string };
}

function uniqueCpf() {
  return String(Math.floor(10000000000 + Math.random() * 89999999999)).slice(0, 11);
}

async function register(name: string) {
  const cpf = uniqueCpf();
  const res = await request("POST", "/auth/register", {
    body: { name, email: `autor-${cpf}@cidade.plus`, password: "senha1234", cpf, cep: "11030000" },
  });
  expect(res.status).toBe(200);
  createdUserIds.push(res.body.user.id);
  return { id: String(res.body.user.id), token: String(res.body.accessToken) };
}

type CategoryDto = { id: string; name: string; subcategories: Array<{ id: string; name: string }> };
let outros: CategoryDto;
let comOpcoes: CategoryDto;

async function createOccurrence(token: string, title: string) {
  const res = await request("POST", "/occurrences", {
    token,
    body: {
      title,
      description: "Criada pelo teste de autor.",
      latitude: -23.989,
      longitude: -46.3075,
      categoryId: outros.id,
      media: [await upload(token)],
    },
  });
  expect(res.status).toBe(200);
  return String(res.body.id);
}

describe("edição e remoção pelo autor (D-032)", () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const categories = (await request("GET", "/categories")).body as unknown as CategoryDto[];
    outros = categories.find((item) => item.name === "Outros")!;
    comOpcoes = categories.find((item) => item.subcategories.length > 0)!;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      const media = await prisma.occurrenceMedia.findMany({
        where: { occurrence: { userId: { in: createdUserIds } } },
      });
      await Promise.all(media.map((item) => deleteStoredImage(item.publicId)));
      await prisma.evaluation.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.occurrence.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("detalhe diz ao autor que ele pode editar; para os outros, não (sem expor o autor)", async () => {
    const autor = await register("Autor Detalhe");
    const outro = await register("Outro Detalhe");
    const id = await createOccurrence(autor.token, "Detalhe do autor");

    const doAutor = await request("GET", `/occurrences/${id}`, { token: autor.token });
    expect(doAutor.body.viewer).toEqual({ isAuthor: true, canEdit: true });

    const deOutro = await request("GET", `/occurrences/${id}`, { token: outro.token });
    expect(deOutro.body.viewer).toEqual({ isAuthor: false, canEdit: false });

    const anonimo = await request("GET", `/occurrences/${id}`);
    expect(anonimo.status).toBe(200);
    expect(anonimo.body.viewer).toEqual({ isAuthor: false, canEdit: false });
    expect(JSON.stringify(anonimo.body)).not.toContain(autor.id);

    // Token inválido não derruba a rota pública.
    const invalido = await request("GET", `/occurrences/${id}`, { token: "lixo" });
    expect(invalido.status).toBe(200);
  });

  it("autor edita texto, categoria/subcategoria, local e foto; a foto antiga é trocada", async () => {
    const autor = await register("Autor Edição");
    const id = await createOccurrence(autor.token, "Título original");
    const before = await prisma.occurrenceMedia.findMany({ where: { occurrenceId: id } });

    const sub = comOpcoes.subcategories[0]!;
    const novaFoto = await upload(autor.token);
    const res = await request("PATCH", `/occurrences/${id}`, {
      token: autor.token,
      body: {
        title: "Título corrigido",
        description: "Descrição corrigida.",
        categoryId: comOpcoes.id,
        subcategoryId: sub.id,
        latitude: -23.97,
        longitude: -46.33,
        media: [novaFoto],
      },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Título corrigido",
      description: "Descrição corrigida.",
      category: { id: comOpcoes.id },
      subcategory: { id: sub.id },
      latitude: -23.97,
      longitude: -46.33,
      thumbnailUrl: novaFoto.thumbnailUrl,
      viewer: { isAuthor: true, canEdit: true },
    });

    const after = await prisma.occurrenceMedia.findMany({ where: { occurrenceId: id } });
    expect(after.map((item) => item.publicId)).toEqual([novaFoto.publicId]);
    expect(before[0]!.publicId).not.toBe(novaFoto.publicId);

    // Só o título: o resto fica como estava.
    const parcial = await request("PATCH", `/occurrences/${id}`, {
      token: autor.token,
      body: { title: "Só o título" },
    });
    expect(parcial.status).toBe(200);
    expect(parcial.body).toMatchObject({ title: "Só o título", subcategory: { id: sub.id } });

    // Voltar para "Outros" limpa a subcategoria.
    const outrosRes = await request("PATCH", `/occurrences/${id}`, {
      token: autor.token,
      body: { categoryId: outros.id },
    });
    expect(outrosRes.status).toBe(200);
    expect(outrosRes.body.subcategory).toBeNull();
  });

  it("edição valida como a criação", async () => {
    const autor = await register("Autor Validação");
    const id = await createOccurrence(autor.token, "Para validar");
    const patch = (body: unknown) => request("PATCH", `/occurrences/${id}`, { token: autor.token, body });

    expect((await patch({})).status).toBe(400); // nada para alterar
    expect((await patch({ latitude: -23.9 })).status).toBe(400); // sem a longitude
    expect((await patch({ title: "a" })).status).toBe(400);
    expect((await patch({ categoryId: comOpcoes.id })).status).toBe(400); // falta a subcategoria
    expect((await patch({ categoryId: outros.id, subcategoryId: comOpcoes.subcategories[0]!.id })).status).toBe(
      400,
    ); // subcategoria de outra categoria
  });

  it("só o autor altera; fora de 'em análise' ninguém altera", async () => {
    const autor = await register("Autor Permissão");
    const outro = await register("Outro Permissão");
    const id = await createOccurrence(autor.token, "Permissão");

    expect((await request("PATCH", `/occurrences/${id}`, { token: outro.token, body: { title: "Invasão" } })).status).toBe(
      403,
    );
    expect((await request("DELETE", `/occurrences/${id}`, { token: outro.token })).status).toBe(403);
    expect((await request("DELETE", `/occurrences/${id}`)).status).toBe(401);

    // Ainda "em análise" (RECEBIDA e EM_ANALISE também contam).
    await prisma.occurrence.update({ where: { id }, data: { status: "EM_ANALISE" } });
    expect((await request("PATCH", `/occurrences/${id}`, { token: autor.token, body: { title: "Ainda pode" } })).status).toBe(
      200,
    );

    // O gestor moveu para atendimento: bloqueado, e o detalhe avisa.
    await prisma.occurrence.update({ where: { id }, data: { status: "EM_ATENDIMENTO" } });
    const bloqueada = await request("PATCH", `/occurrences/${id}`, { token: autor.token, body: { title: "Tarde" } });
    expect(bloqueada.status).toBe(409);
    expect((await request("DELETE", `/occurrences/${id}`, { token: autor.token })).status).toBe(409);
    const detalhe = await request("GET", `/occurrences/${id}`, { token: autor.token });
    expect(detalhe.body.viewer).toEqual({ isAuthor: true, canEdit: false });
  });

  it("remoção suave: some do app, mantém votos e histórico, apaga as fotos", async () => {
    const autor = await register("Autor Remoção");
    const vizinho = await register("Vizinho Remoção");
    const id = await createOccurrence(autor.token, "Vai ser removida");
    const fica = await createOccurrence(autor.token, "Continua");
    const vote = await request("POST", `/occurrences/${id}/evaluations`, {
      token: vizinho.token,
      body: { type: "INCORRETA" },
    });
    expect(vote.status).toBe(200);

    const removed = await request("DELETE", `/occurrences/${id}`, { token: autor.token });
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ removed: true });

    // Some da lista, do detalhe, do voto e do perfil.
    const list = (await request("GET", "/occurrences")).body as unknown as Array<{ id: string }>;
    expect(list.some((item) => item.id === id)).toBe(false);
    expect(list.some((item) => item.id === fica)).toBe(true);
    expect((await request("GET", `/occurrences/${id}`)).status).toBe(404);
    expect(
      (await request("POST", `/occurrences/${id}/evaluations`, { token: autor.token, body: { type: "UTIL" } })).status,
    ).toBe(404);
    expect((await request("PATCH", `/occurrences/${id}`, { token: autor.token, body: { title: "Volta" } })).status).toBe(
      404,
    );
    expect((await request("DELETE", `/occurrences/${id}`, { token: autor.token })).status).toBe(404);

    const profile = await request("GET", "/me/profile", { token: autor.token });
    expect(profile.body.stats.occurrences).toBe(1);
    expect(profile.body.recentOccurrences.map((item: { id: string }) => item.id)).toEqual([fica]);
    const page = await request("GET", "/me/occurrences?skip=0&take=10", { token: autor.token });
    expect(page.body.total).toBe(1);

    // Remover não limpa a avaliação negativa recebida (reputação continua contando).
    expect(profile.body.stats.reputation).toMatchObject({ received: 1, positive: 0 });

    // No banco: linha marcada, votos e histórico preservados, fotos apagadas.
    const row = await prisma.occurrence.findUnique({
      where: { id },
      include: { evaluations: true, statusHistory: true, media: true },
    });
    expect(row?.deletedAt).toBeInstanceOf(Date);
    expect(row?.evaluations).toHaveLength(1);
    expect(row?.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(row?.media).toHaveLength(0);
  });
});
