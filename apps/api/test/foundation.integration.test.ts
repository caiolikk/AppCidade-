import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const createdUserIds: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;

async function request(
  method: "GET" | "POST" | "PATCH",
  url: string,
  options: { token?: string; body?: unknown; payload?: Buffer; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

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

  return { status: response.statusCode, body: json as Record<string, unknown> };
}

function uniqueCpf() {
  return String(Math.floor(10000000000 + Math.random() * 89999999999)).slice(0, 11);
}

function multipartPng() {
  const boundary = "----CidadePlusTest";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    PNG_1X1,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return {
    payload,
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

describe("fundação Cidade+", () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.occurrence.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it("GET /health responde ok", async () => {
    const result = await request("GET", "/health");
    expect(result.status).toBe(200);
    expect(result.body.status).toBe("ok");
  });

  it("recusa CEP fora de Santos", async () => {
    const result = await request("POST", "/auth/register", {
      body: {
        name: "Fora da cidade",
        email: `fora-${uniqueCpf()}@cidade.plus`,
        password: "senha1234",
        cpf: uniqueCpf(),
        cep: "01310100",
      },
    });

    expect(result.status).toBe(400);
    expect(String(result.body.message)).toMatch(/Santos/i);
  });

  it("cadastra cidadão com CEP de Santos e aplica geofencing", async () => {
    const cpf = uniqueCpf();
    const register = await request("POST", "/auth/register", {
      body: {
        name: "Cidadão Teste",
        email: `cidadao-${cpf}@cidade.plus`,
        password: "senha1234",
        cpf,
        cep: "11030000",
      },
    });

    expect(register.status).toBe(200);
    const user = register.body.user as { id: string; neighborhood: string; cpf?: string };
    createdUserIds.push(user.id);
    expect(user.neighborhood.toLowerCase()).toContain("ponta");
    const token = String(register.body.accessToken);

    const inside = await request("POST", "/occurrences/geofence-check", {
      token,
      body: { latitude: -23.989, longitude: -46.3075 },
    });
    expect(inside.status).toBe(200);

    const outside = await request("POST", "/occurrences/geofence-check", {
      token,
      body: { latitude: -23.967, longitude: -46.335 },
    });
    expect(outside.status).toBe(403);
    expect(String(outside.body.message)).toMatch(/bairro residencial/i);

    const categories = await request("GET", "/categories");
    const list = categories.body as unknown as Array<{ id: string; name: string }>;
    const buraco = list.find((item) => item.name === "Buraco");
    expect(buraco).toBeTruthy();

    const noPhoto = await request("POST", "/occurrences", {
      token,
      body: {
        title: "Buraco teste",
        description: "Sem foto",
        latitude: -23.989,
        longitude: -46.3075,
        categoryId: buraco!.id,
        media: [],
      },
    });
    expect(noPhoto.status).toBe(400);

    const file = multipartPng();
    const upload = await request("POST", "/uploads/image", {
      token,
      payload: file.payload,
      headers: file.headers,
    });
    expect(upload.status).toBe(200);
    expect(String(upload.body.url)).toMatch(/^https?:\/\//);
    expect(upload.body.thumbnailUrl).toBeTruthy();

    const created = await request("POST", "/occurrences", {
      token,
      body: {
        title: "Buraco na calçada",
        description: "Ocorrência criada pelo teste automatizado.",
        latitude: -23.989,
        longitude: -46.3075,
        categoryId: buraco!.id,
        media: [
          {
            url: upload.body.url,
            thumbnailUrl: upload.body.thumbnailUrl,
            publicId: upload.body.publicId,
          },
        ],
      },
    });
    expect(created.status).toBe(200);
    const occurrenceId = String(created.body.id);

    const publicItem = await request("GET", `/occurrences/${occurrenceId}`);
    expect(publicItem.status).toBe(200);
    expect(publicItem.body.cpf).toBeUndefined();
    expect(publicItem.body.author).toBeUndefined();
    expect(publicItem.body.media).toBeUndefined();
    expect(publicItem.body.thumbnailUrl).toBeTruthy();
    expect(publicItem.body.description).toBeTruthy();

    const firstVote = await request("POST", `/occurrences/${occurrenceId}/evaluations`, {
      token,
      body: { type: "UTIL" },
    });
    expect(firstVote.status).toBe(200);

    const secondVote = await request("POST", `/occurrences/${occurrenceId}/evaluations`, {
      token,
      body: { type: "PERSISTE" },
    });
    expect(secondVote.status).toBe(409);
  });

  it("protege upload e rotas de gestor", async () => {
    const upload = await request("POST", "/uploads/image");
    expect(upload.status).toBe(401);

    const login = await request("POST", "/auth/login", {
      body: { email: "admin@cidade.plus", password: "admin1234" },
    });
    expect(login.status).toBe(200);

    const adminHealth = await request("GET", "/admin/health", {
      token: String(login.body.accessToken),
    });
    expect(adminHealth.status).toBe(200);

    const citizenCpf = uniqueCpf();
    const citizen = await request("POST", "/auth/register", {
      body: {
        name: "Cidadão Comum",
        email: `comum-${citizenCpf}@cidade.plus`,
        password: "senha1234",
        cpf: citizenCpf,
        cep: "11030000",
      },
    });
    const citizenUser = citizen.body.user as { id: string };
    createdUserIds.push(citizenUser.id);

    const forbidden = await request("GET", "/admin/health", {
      token: String(citizen.body.accessToken),
    });
    expect(forbidden.status).toBe(403);
  });
});
