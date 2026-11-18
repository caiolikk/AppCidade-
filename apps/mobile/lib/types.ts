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
  /** Foto de perfil (D-025); null = sem foto. */
  avatarUrl: string | null;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
  /** Sessão longa (D-033): troca-se em `POST /auth/refresh` quando o access token vence. */
  refreshToken: string;
};

/** Opção do menu da categoria (Figma), vinda do `GET /categories` (D-022). */
export type Subcategory = {
  id: string;
  name: string;
  description: string | null;
};

export type Category = {
  id: string;
  name: string;
  /** Vazio na categoria "Outros". Opcional só por segurança com uma API antiga. */
  subcategories?: Subcategory[];
};

/** Referência curta (id + nome) usada dentro de uma ocorrência. */
export type CategoryRef = {
  id: string;
  name: string;
};

export type PublicOccurrence = {
  id: string;
  title: string;
  description?: string;
  status: OccurrenceStatus;
  category: CategoryRef;
  /** null em ocorrências anteriores às subcategorias e na categoria "Outros". */
  subcategory?: CategoryRef | null;
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
  /**
   * Só no detalhe (`GET /occurrences/:id` com login, D-032): se quem vê é o autor e se ainda
   * pode editar/remover (enquanto "em análise"). O autor em si nunca vem no DTO público.
   */
  viewer?: { isAuthor: boolean; canEdit: boolean };
};

export type EvaluationType = "UTIL" | "PERSISTE" | "INCORRETA";

export type StoredImage = {
  url: string;
  thumbnailUrl: string;
  publicId: string;
};

/** Reputação provisória (D-024): 5 × positivas ÷ recebidas; score null = sem avaliações. */
export type Reputation = {
  score: number | null;
  scale: number;
  positive: number;
  received: number;
};

/** `GET /me/profile` — perfil do próprio usuário (D-025). */
export type MyProfile = {
  user: AuthUser;
  stats: {
    occurrences: number;
    evaluationsGiven: number;
    evaluationsReceived: number;
    reputation: Reputation;
  };
  recentOccurrences: PublicOccurrence[];
};

export type MyOccurrencesPage = {
  items: PublicOccurrence[];
  total: number;
};
