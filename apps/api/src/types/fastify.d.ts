import type { Role } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: string;
      role: Role;
    };
  }
}

export {};
