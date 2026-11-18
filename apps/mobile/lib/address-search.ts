/**
 * Busca de endereço do mapa (D-030): monta a consulta para o geocodificador nativo
 * (expo-location `geocodeAsync`, Android/iOS) e o rótulo do resultado. Lógica pura, sem
 * React Native: testada em `address-search.test.ts`.
 *
 * O app é de Santos: consulta sem cidade ganha ", Santos - SP, Brasil" (senão "Rua XV de
 * Novembro" cai em qualquer cidade do país). Se o usuário citar Santos, outra cidade da
 * Baixada/São Paulo ou uma UF, a consulta é respeitada como foi digitada.
 */

export const SANTOS_SUFFIX = ", Santos - SP, Brasil";

/** Cidades que o usuário pode citar de propósito (sem acento, minúsculas). */
const OTHER_PLACES = [
  "santos",
  "sao vicente",
  "guaruja",
  "praia grande",
  "cubatao",
  "bertioga",
  "mongagua",
  "itanhaem",
  "peruibe",
  "sao paulo",
  "brasil",
];

const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "),
);

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Consulta para o geocodificador, ou `null` se o texto for curto demais para buscar.
 * - CEP (8 dígitos, com ou sem hífen) → "11060-001, Brasil".
 * - Cita cidade conhecida ou UF ("- SP", ", RJ") → como foi digitado.
 * - Caso contrário → acrescenta ", Santos - SP, Brasil".
 */
export function buildSearchQuery(raw: string): string | null {
  const query = raw.trim().replace(/\s+/g, " ");
  if (query.length < 3) {
    return null;
  }

  const cep = query.match(/^(\d{5})-?(\d{3})$/);
  if (cep) {
    return `${cep[1]}-${cep[2]}, Brasil`;
  }

  const plain = normalize(query);
  const mentionsPlace = OTHER_PLACES.some((place) => new RegExp(`\\b${place}\\b`).test(plain));
  // UF: sigla em MAIÚSCULAS, isolada no fim ou depois de " - " (só as 27 reais). Minúsculas
  // não contam, para "12 ap" (apartamento) não virar Amapá.
  const ufAtEnd = query.match(/(?:^|[\s,-])([A-Z]{2})$/)?.[1];
  const ufAfterDash = query.match(/\s-\s?([A-Z]{2})\b/)?.[1];
  const mentionsState = [ufAtEnd, ufAfterDash].some((uf) => uf !== undefined && UFS.has(uf));
  if (mentionsPlace || mentionsState) {
    return query;
  }

  return `${query}${SANTOS_SUFFIX}`;
}

/** Campos usados de `LocationGeocodedAddress` (expo-location). */
export type GeocodedAddress = {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  district?: string | null;
  city?: string | null;
  subregion?: string | null;
};

/**
 * Rótulo curto do ponto encontrado: "Avenida Ana Costa, 300 · Gonzaga, Santos".
 * Sem endereço reverso, usa o que o usuário digitou.
 */
export function formatAddressLabel(address: GeocodedAddress | null | undefined, typed: string): string {
  if (!address) {
    return typed.trim();
  }
  const street = [address.street, address.streetNumber].filter(Boolean).join(", ") || address.name || "";
  const city = address.city ?? address.subregion ?? null;
  const area = [address.district, city].filter(Boolean).join(", ");
  const label = [street, area].filter(Boolean).join(" · ");
  return label || typed.trim();
}
