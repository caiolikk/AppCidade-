import type { User } from "@prisma/client";

export function toPrivateUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    role: user.role,
    reputationScore: user.reputationScore,
    cep: user.cep,
    neighborhood: user.neighborhood,
    santosNeighborhoodId: user.santosNeighborhoodId,
    createdAt: user.createdAt,
  };
}
