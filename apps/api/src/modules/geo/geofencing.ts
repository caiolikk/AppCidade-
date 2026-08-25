import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../utils/http-error.js";

const OUT_OF_NEIGHBORHOOD_MESSAGE =
  "Você só pode registrar ocorrências dentro do seu bairro residencial.";

export async function assertPointInUserNeighborhood(input: {
  userId: string;
  latitude: number;
  longitude: number;
}) {
  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new HttpError(400, "Coordenadas inválidas.");
  }

  const rows = await prisma.$queryRaw<Array<{ inside: boolean | null }>>(
    Prisma.sql`
      SELECT ST_Contains(
        n.geom,
        ST_SetSRID(
          ST_MakePoint(${input.longitude}::double precision, ${input.latitude}::double precision),
          4326
        )
      ) AS inside
      FROM users u
      INNER JOIN santos_neighborhoods n ON n.id = u."santosNeighborhoodId"
      WHERE u.id = ${input.userId}
      LIMIT 1
    `,
  );

  if (rows.length === 0) {
    throw new HttpError(
      422,
      "Seu bairro residencial ainda não está associado a um polígono oficial.",
    );
  }

  if (rows[0]?.inside !== true) {
    throw new HttpError(403, OUT_OF_NEIGHBORHOOD_MESSAGE);
  }
}
