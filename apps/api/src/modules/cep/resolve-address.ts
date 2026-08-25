import { prisma } from "../../lib/prisma.js";
import { lookupSantosCep } from "../../services/viacep.js";

export async function resolveResidentialAddress(cep: string) {
  const address = await lookupSantosCep(cep);

  const neighborhood = await prisma.santosNeighborhood.findUnique({
    where: { normalizedName: address.normalizedNeighborhood },
    select: { id: true, name: true },
  });

  return {
    cep: address.cep,
    neighborhoodName: neighborhood?.name ?? address.neighborhood,
    santosNeighborhoodId: neighborhood?.id ?? null,
  };
}
