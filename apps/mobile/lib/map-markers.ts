/**
 * Marcadores do mapa por zoom (plano ocorrencias-criacao-e-mapa, 2026-11-14; D-027).
 * TUDO o que é ajustável (limite ícone/bolinha, histerese, tamanhos) fica aqui. Lógica pura,
 * sem React Native: testada em `map-markers.test.ts`.
 *
 * Dois formatos só — e SEM agrupamento (cada ocorrência tem sempre o seu marcador):
 *   - "pin": ícone da categoria (ilustração + anel do status), diminui aos poucos ao afastar;
 *   - "dot": bolinha na cor do status, só com o mapa bem afastado.
 *
 * Zoom no padrão Web Mercator (o mesmo do Google Maps). Referências medidas no app (Santos):
 * abertura do mapa (longitudeDelta 0,05) ≈ 13,3–13,5; foco de rua (0,01) ≈ 15,6–15,8;
 * z 12 ≈ 35 m por dp — Santos e São Vicente inteiros na tela.
 */

export type MarkerLevel = "dot" | "pin";

/** Abaixo deste zoom (com a folga), os ícones viram bolinhas. */
export const ICON_MIN_ZOOM = 12;

/** Folga contra oscilação: vira bolinha abaixo de 11,7 e volta a ícone acima de 12,3. */
export const LEVEL_HYSTERESIS = 0.3;

/**
 * Tamanhos (dp) de cada formato, em degraus: o marcador cresce com o zoom entre `from` e `to`
 * e fica no mínimo/máximo fora disso. Cada tamanho tem um bitmap (scripts/generate-pins.ps1) —
 * ao mudar estes valores, rode o script de novo.
 */
export const MARKER_SIZES: Record<MarkerLevel, { sizes: readonly number[]; from: number; to: number }> = {
  dot: { sizes: [10, 12, 14], from: 10, to: ICON_MIN_ZOOM },
  pin: { sizes: [28, 32, 36, 40, 44, 48, 52], from: ICON_MIN_ZOOM, to: 17 },
};

/** O selecionado/em foco é sempre o pin neste tamanho (maior que qualquer normal), em qualquer zoom. */
export const SELECTED_PIN_SIZE = 58;

/**
 * Altura lógica (dp) do bitmap do pin de diâmetro `d`: folga de 3 em cima + círculo + cauda
 * proporcional (13/44 do diâmetro). A ponta da cauda é a base do bitmap. DEVE bater com
 * `New-Pin` em scripts/generate-pins.ps1 (usada no `centerOffset` do iOS).
 */
export function pinHeight(d: number) {
  return d + 3 + Math.round((d * 13) / 44);
}

const TILE = 256;

/** Zoom (Web Mercator) a partir da região visível e da largura do mapa em dp. */
export function zoomFromRegion(longitudeDelta: number, mapWidthDp: number) {
  if (!(longitudeDelta > 0) || !(mapWidthDp > 0)) {
    return ICON_MIN_ZOOM + 1;
  }
  return Math.log2((360 * mapWidthDp) / (TILE * longitudeDelta));
}

export type MarkerScale = { level: MarkerLevel; step: number };

function rawStep(level: MarkerLevel, zoom: number) {
  const { sizes, from, to } = MARKER_SIZES[level];
  if (sizes.length === 1 || zoom <= from) return 0;
  if (zoom >= to) return sizes.length - 1;
  const t = (zoom - from) / (to - from);
  return Math.min(sizes.length - 1, Math.floor(t * sizes.length));
}

/**
 * Formato e degrau de tamanho para o zoom, com histerese: perto de um limite (de formato ou
 * de degrau), mantém o anterior até o zoom passar a folga. Pinça lenta no limite não pisca.
 */
export function nextMarkerScale(zoom: number, previous?: MarkerScale | null): MarkerScale {
  let level: MarkerLevel;
  if (previous?.level === "pin") {
    level = zoom < ICON_MIN_ZOOM - LEVEL_HYSTERESIS ? "dot" : "pin";
  } else if (previous?.level === "dot") {
    level = zoom >= ICON_MIN_ZOOM + LEVEL_HYSTERESIS ? "pin" : "dot";
  } else {
    level = zoom < ICON_MIN_ZOOM ? "dot" : "pin";
  }

  let step = rawStep(level, zoom);
  if (previous && previous.level === level && previous.step !== step) {
    const { from, to, sizes } = MARKER_SIZES[level];
    const stepWidth = (to - from) / sizes.length;
    const margin = Math.min(LEVEL_HYSTERESIS, stepWidth / 3);
    const shifted = rawStep(level, zoom + (step > previous.step ? -margin : margin));
    if (shifted === previous.step) step = previous.step;
  }
  return { level, step };
}

export function markerSize(scale: MarkerScale) {
  const { sizes } = MARKER_SIZES[scale.level];
  return sizes[Math.min(scale.step, sizes.length - 1)]!;
}
