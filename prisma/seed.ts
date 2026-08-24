import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

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
    },
    create: {
      email: input.email,
      name: input.name,
      cpf: input.cpf,
      role: input.role,
      passwordHash,
      cep: "11030000",
      neighborhood: "Gonzaga",
    },
  });
}

async function main() {
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
