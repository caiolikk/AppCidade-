import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Token inválido");
  }

  const { sub, role } = decoded as { sub?: unknown; role?: unknown };

  if (typeof sub !== "string" || typeof role !== "string") {
    throw new Error("Token inválido");
  }

  return { sub, role: role as Role };
}
