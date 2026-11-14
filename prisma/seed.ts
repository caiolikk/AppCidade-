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

  // D-019: as 5 categorias do Figma (cada uma tem ilustração no app).
  const categories = ["Infraestrutura", "Limpeza", "Segurança", "Trânsito", "Outros"];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Remove categorias antigas (antes da D-019) que não têm ocorrências. Nunca apaga uma
  // categoria em uso: se houver ocorrências, ela fica e é avisada no console.
  const obsolete = await prisma.category.findMany({
    where: { name: { notIn: categories } },
    select: { id: true, name: true, _count: { select: { occurrences: true } } },
  });
  for (const category of obsolete) {
    if (category._count.occurrences === 0) {
      await prisma.category.delete({ where: { id: category.id } });
    } else {
      console.warn(
        `Seed: categoria antiga "${category.name}" mantida (${category._count.occurrences} ocorrência(s)).`,
      );
    }
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

  await removeDemoOccurrences();
}

/**
 * Remove as ocorrências fictícias que versões antigas deste seed criavam (D-018 / plano
 * ocorrencias-criacao-e-mapa). Elas são identificadas pela mídia com publicId "seed-*",
 * marca exclusiva do seed: uploads reais geram "local-<uuid>" ou o id do Cloudinary.
 * Cascata do schema: apaga também mídia, avaliações e histórico de status.
 */
async function removeDemoOccurrences() {
  const removed = await prisma.occurrence.deleteMany({
    where: { media: { some: { publicId: { startsWith: "seed-" } } } },
  });

  if (removed.count > 0) {
    console.log(`Seed: ${removed.count} ocorrência(s) fictícia(s) removida(s).`);
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
