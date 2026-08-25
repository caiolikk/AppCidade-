export type Role = "CITIZEN" | "MANAGER" | "ADMIN";

export type OccurrenceStatus =
  | "REPORTADA"
  | "RECEBIDA"
  | "EM_ANALISE"
  | "EM_ATENDIMENTO"
  | "RESOLVIDA"
  | "ARQUIVADA"
  | "INVALIDA";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  role: Role;
  reputationScore: number;
  cep: string;
  neighborhood: string;
  santosNeighborhoodId: string | null;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
};

export type Category = {
  id: string;
  name: string;
};

export type PublicOccurrence = {
  id: string;
  title: string;
  description?: string;
  status: OccurrenceStatus;
  category: Category;
  latitude: string | number;
  longitude: string | number;
  thumbnailUrl: string | null;
  votes: {
    UTIL: number;
    PERSISTE: number;
    INCORRETA: number;
    total: number;
  };
  createdAt: string;
};

export type EvaluationType = "UTIL" | "PERSISTE" | "INCORRETA";

export type StoredImage = {
  url: string;
  thumbnailUrl: string;
  publicId: string;
};
