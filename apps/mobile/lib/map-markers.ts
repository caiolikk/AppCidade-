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
  // 11 degraus de 3 dp (antes 7 de 4 dp até z 17): saltos menores e crescimento até z 18 (D-031).
  pin: { sizes: [24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54], from: ICON_MIN_ZOOM, to: 18 },
};

/**
 * Selecionado/em foco no nível "pin": o pin neste tamanho (maior que qualquer normal). No nível
 * "dot" ele vira bolinha, como todos (D-031: antes ficava pin grande em qualquer zoom).
 */
export const SELECTED_PIN_SIZE = 60;

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

// ---------------------------------------------------------------------------------------
// Leque visual para ícones sobrepostos (D-031). NÃO é agrupamento: cada ocorrência continua
// com seu marcador; só o desenho é afastado na tela, ligado ao ponto real por uma linha.
// ---------------------------------------------------------------------------------------

/** Recalcular o leque só quando o zoom muda deste tanto (o pan nunca recalcula). */
export const ZOOM_QUANTUM = 0.25;

/** Dois ícones "se sobrepõem" quando os centros estão a menos desta fração do tamanho. */
export const OVERLAP_FACTOR = 0.8;

/** Distância entre ícones abertos em leque, em frações do tamanho. */
export const SPREAD_SPACING = 0.95;

export function quantizeZoom(zoom: number) {
  return Math.round(zoom / ZOOM_QUANTUM) * ZOOM_QUANTUM;
}

/** Pixels de mundo (Web Mercator) no zoom: a distância entre dois pontos = distância em dp na tela. */
export function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/** Inverso de `project`. */
export function unproject(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return {
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    longitude: (x / scale) * 360 - 180,
  };
}

export type SpreadPoint = { id: string; latitude: number; longitude: number; order: number };
export type SpreadOffset = { dx: number; dy: number };

/**
 * Deslocamento visual (dp de tela, +x = direita, +y = baixo) de cada ícone que se sobrepõe a
 * outro no `zoom` com ícones de `size` dp. Grupos são formados por encadeamento (A perto de
 * B, B perto de C → um grupo). Grupo de 2–3: em linha horizontal; 4+: em círculo; centrado no
 * centroide, na ordem estável (`order`, depois `id`). Quem não se sobrepõe não aparece no
 * resultado (deslocamento zero). Nenhum ponto é descartado nem trocado de lugar no dado.
 */
export function spreadOffsets(
  points: readonly SpreadPoint[],
  zoom: number,
  size: number,
): Map<string, SpreadOffset> {
  const result = new Map<string, SpreadOffset>();
  if (points.length < 2 || !(size > 0)) return result;

  const sorted = [...points].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  const xy = sorted.map((p) => project(p.latitude, p.longitude, zoom));
  const limit = size * OVERLAP_FACTOR;

  // União-busca sobre uma grade espacial (só compara vizinhos de célula): O(n) na prática.
  const parent = sorted.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const grid = new Map<string, number[]>();
  xy.forEach((p, i) => {
    const cx = Math.floor(p.x / limit);
    const cy = Math.floor(p.y / limit);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (Math.hypot(xy[j]!.x - p.x, xy[j]!.y - p.y) < limit) {
            parent[find(i)] = find(j);
          }
        }
      }
    }
    const key = `${cx}:${cy}`;
    grid.set(key, [...(grid.get(key) ?? []), i]);
  });

  const groups = new Map<number, number[]>();
  sorted.forEach((_, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  });

  const spacing = size * SPREAD_SPACING;
  for (const members of groups.values()) {
    const n = members.length;
    if (n < 2) continue;
    const cx = members.reduce((sum, i) => sum + xy[i]!.x, 0) / n;
    const cy = members.reduce((sum, i) => sum + xy[i]!.y, 0) / n;
    members.forEach((i, k) => {
      let tx: number;
      let ty: number;
      if (n <= 3) {
        tx = cx + (k - (n - 1) / 2) * spacing;
        ty = cy;
      } else {
        // Círculo: a corda entre vizinhos é ≥ spacing.
        const radius = spacing / (2 * Math.sin(Math.PI / n));
        const angle = -Math.PI / 2 + (2 * Math.PI * k) / n;
        tx = cx + radius * Math.cos(angle);
        ty = cy + radius * Math.sin(angle);
      }
      result.set(sorted[i]!.id, { dx: tx - xy[i]!.x, dy: ty - xy[i]!.y });
    });
  }
  return result;
}
