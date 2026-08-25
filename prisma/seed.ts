import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const GONZAGA_ID = "11111111-1111-1111-1111-111111111111";
const PONTA_DA_PRAIA_ID = "22222222-2222-2222-2222-222222222222";

const GONZAGA_WKT =
  "POLYGON((-46.345 -23.975, -46.325 -23.975, -46.325 -23.960, -46.345 -23.960, -46.345 -23.975))";
const PONTA_DA_PRAIA_WKT =
  "POLYGON((-46.320 -24.000, -46.295 -24.000, -46.295 -23.978, -46.320 -23.978, -46.320 -24.000))";

async function upsertNeighborhood(input: {
  id: string;
  name: string;
  normalizedName: string;
  wkt: string;
}) {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO santos_neighborhoods (id, name, "normalizedName", geom, "createdAt", "updatedAt")
      VALUES (
        ${input.id},
        ${input.name},
        ${input.normalizedName},
        ST_SetSRID(ST_GeomFromText(${input.wkt}), 4326),
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        "normalizedName" = EXCLUDED."normalizedName",
        geom = EXCLUDED.geom,
        "updatedAt" = NOW()
    `,
  );
}

async function upsertStaff(input: {
  email: string;
  name: string;
  cpf: string;
  role: "MANAGER" | "ADMIN";
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  await prisma.user.upsert({
    where: { email: input.email },
    update: {
      role: input.role,
      passwordHash,
      santosNeighborhoodId: GONZAGA_ID,
      neighborhood: "Gonzaga",
      cep: "11030000",
    },
    create: {
      email: input.email,
      name: input.name,
      cpf: input.cpf,
      role: input.role,
      passwordHash,
      cep: "11030000",
      neighborhood: "Gonzaga",
      santosNeighborhoodId: GONZAGA_ID,
    },
  });
}

async function main() {
  await upsertNeighborhood({
    id: GONZAGA_ID,
    name: "Gonzaga",
    normalizedName: "gonzaga",
    wkt: GONZAGA_WKT,
  });

  await upsertNeighborhood({
    id: PONTA_DA_PRAIA_ID,
    name: "Ponta da Praia",
    normalizedName: "ponta da praia",
    wkt: PONTA_DA_PRAIA_WKT,
  });

  const categories = [
    "Buraco",
    "Calçada",
    "Iluminação",
    "Sinalização",
    "Lixo",
    "Árvore",
    "Outros",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await upsertStaff({
    email: "admin@cidade.plus",
    name: "Admin Cidade+",
    cpf: "00000000001",
    role: "ADMIN",
    password: process.env.SEED_ADMIN_PASSWORD ?? "admin1234",
  });

  await upsertStaff({
    email: "gestor@cidade.plus",
    name: "Gestor Cidade+",
    cpf: "00000000002",
    role: "MANAGER",
    password: process.env.SEED_MANAGER_PASSWORD ?? "gestor1234",
  });

  await seedDemoOccurrences();
}

async function seedDemoOccurrences() {
  const existing = await prisma.occurrence.count();
  if (existing > 0) {
    return;
  }

  const admin = await prisma.user.findUnique({
    where: { email: "admin@cidade.plus" },
  });

  if (!admin) {
    return;
  }

  const categories = await prisma.category.findMany();
  const byName = Object.fromEntries(categories.map((item) => [item.name, item.id]));

  const demos = [
    {
      title: "Buraco na calçada",
      description: "Calçada irregular próxima à praça, dificultando a passagem.",
      category: "Buraco",
      latitude: -23.967,
      longitude: -46.335,
      status: "EM_ATENDIMENTO" as const,
      photoId: "1015",
    },
    {
      title: "Poste apagado",
      description: "Iluminação pública fora do ar no trecho da avenida.",
      category: "Iluminação",
      latitude: -23.968,
      longitude: -46.333,
      status: "RECEBIDA" as const,
      photoId: "1016",
    },
    {
      title: "Calçada irregular",
      description: "Desnível na calçada com risco de queda.",
      category: "Calçada",
      latitude: -23.966,
      longitude: -46.337,
      status: "EM_ANALISE" as const,
      photoId: "1018",
    },
    {
      title: "Sinalização apagada",
      description: "Faixa e placas pouco visíveis no cruzamento.",
      category: "Sinalização",
      latitude: -23.965,
      longitude: -46.334,
      status: "REPORTADA" as const,
      photoId: "1019",
    },
    {
      title: "Acúmulo de lixo",
      description: "Resíduos acumulados na esquina há alguns dias.",
      category: "Lixo",
      latitude: -23.969,
      longitude: -46.336,
      status: "RESOLVIDA" as const,
      photoId: "1020",
    },
    {
      title: "Árvore com galho caído",
      description: "Galho obstruindo parte da calçada após chuva.",
      category: "Árvore",
      latitude: -23.964,
      longitude: -46.332,
      status: "REPORTADA" as const,
      photoId: "1022",
    },
  ];

  for (const demo of demos) {
    const categoryId = byName[demo.category];
    if (!categoryId) {
      continue;
    }

    await prisma.occurrence.create({
      data: {
        title: demo.title,
        description: demo.description,
        latitude: demo.latitude,
        longitude: demo.longitude,
        status: demo.status,
        categoryId,
        userId: admin.id,
        media: {
          create: {
            url: `https://picsum.photos/id/${demo.photoId}/800/600`,
            thumbnailUrl: `https://picsum.photos/id/${demo.photoId}/200/200`,
            publicId: `seed-${demo.photoId}`,
          },
        },
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: demo.status,
            changedById: admin.id,
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
