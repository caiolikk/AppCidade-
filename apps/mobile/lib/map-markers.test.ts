// Rodar na raiz do repositório: npx vitest run apps/mobile/lib
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ICON_MIN_ZOOM,
  LEVEL_HYSTERESIS,
  MARKER_SIZES,
  SELECTED_PIN_SIZE,
  OVERLAP_FACTOR,
  markerSize,
  nextMarkerScale,
  pinHeight,
  project,
  spreadOffsets,
  zoomFromRegion,
  type MarkerScale,
  type SpreadPoint,
} from "./map-markers";

const WIDTH = 402; // largura do frame do Figma (dp)
const MOBILE = join(__dirname, "..");
const read = (path: string) => readFileSync(join(MOBILE, path), "utf8");

/** Percorre os zooms em sequência (como uma pinça), carregando o estado anterior. */
function walk(zooms: number[]) {
  let scale: MarkerScale | null = null;
  return zooms.map((zoom) => {
    scale = nextMarkerScale(zoom, scale);
    return scale;
  });
}

describe("zoom a partir da região", () => {
  it("bate com as referências do app (abertura ~13,3–13,5; rua ~15,6–15,8)", () => {
    expect(zoomFromRegion(0.05, 360)).toBeCloseTo(13.31, 1);
    expect(zoomFromRegion(0.05, 411)).toBeCloseTo(13.5, 1);
    expect(zoomFromRegion(0.01, WIDTH)).toBeCloseTo(15.8, 1);
  });
});

describe("formato por zoom: ícone na maior parte, bolinha só bem afastado", () => {
  it("abertura do mapa e foco de rua mostram o ÍCONE da categoria", () => {
    for (const width of [360, 411]) {
      expect(nextMarkerScale(zoomFromRegion(0.05, width)).level).toBe("pin");
      expect(nextMarkerScale(zoomFromRegion(0.01, width)).level).toBe("pin");
    }
    // Afastar bastante a partir da abertura (4x a área visível) ainda é ícone.
    expect(nextMarkerScale(zoomFromRegion(0.1, WIDTH)).level).toBe("pin");
  });

  it("vira bolinha só abaixo do limite (cidade inteira na tela)", () => {
    expect(nextMarkerScale(ICON_MIN_ZOOM + 0.01).level).toBe("pin");
    expect(nextMarkerScale(ICON_MIN_ZOOM - 0.01).level).toBe("dot");
    expect(nextMarkerScale(9).level).toBe("dot");
  });

  it("histerese: pinça em volta do limite não fica alternando", () => {
    const h = LEVEL_HYSTERESIS;
    const z = ICON_MIN_ZOOM;
    // Afastando: só vira bolinha depois de passar a folga.
    expect(walk([z + 1, z - h / 2]).at(-1)!.level).toBe("pin");
    expect(walk([z + 1, z - h - 0.01]).at(-1)!.level).toBe("dot");
    // Aproximando: só volta a ícone depois da folga.
    expect(walk([z - 1, z + h / 2]).at(-1)!.level).toBe("dot");
    expect(walk([z - 1, z + h + 0.01]).at(-1)!.level).toBe("pin");
    // Oscilação de ±0,1 no limite: uma troca só, no máximo.
    const jitter = walk([z + 1, z + 0.1, z - 0.1, z + 0.1, z - 0.1, z + 0.1, z - 0.1]);
    const changes = jitter.filter((s, i) => i > 0 && s.level !== jitter[i - 1]!.level).length;
    expect(changes).toBe(0);
  });
});

describe("tamanho acompanha o zoom", () => {
  it("nunca diminui ao aproximar e respeita mínimo e máximo do ícone", () => {
    const zooms = Array.from({ length: 121 }, (_, i) => ICON_MIN_ZOOM + i * 0.075); // 12 → 21
    const sizes = walk(zooms).map(markerSize);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]!).toBeGreaterThanOrEqual(sizes[i - 1]!);
    expect(Math.min(...sizes)).toBe(24);
    expect(Math.max(...sizes)).toBe(54);
    expect(markerSize(nextMarkerScale(21))).toBe(54);
    // Degraus pequenos (≤ 3 dp) e espalhados até z 18: sem saltos grandes.
    const distinct = [...new Set(sizes)];
    for (let i = 1; i < distinct.length; i++) expect(distinct[i]! - distinct[i - 1]!).toBeLessThanOrEqual(3);
    // O máximo só chega perto de z 17,5 (antes: z 16,3).
    expect(markerSize(nextMarkerScale(17.3))).toBeLessThan(54);
  });

  it("diminui ao afastar (rua > abertura > cidade) e o ícone mínimo continua reconhecível", () => {
    const street = markerSize(nextMarkerScale(zoomFromRegion(0.01, WIDTH)));
    const opening = markerSize(nextMarkerScale(zoomFromRegion(0.05, WIDTH)));
    const city = markerSize(nextMarkerScale(ICON_MIN_ZOOM + 0.05));
    expect(street).toBeGreaterThan(opening);
    expect(opening).toBeGreaterThan(city);
    expect(city).toBeGreaterThanOrEqual(24);
  });

  it("bolinhas pequenas e discretas (sempre menores que o menor ícone)", () => {
    const dots = MARKER_SIZES.dot.sizes;
    expect(Math.max(...dots)).toBeLessThan(Math.min(...MARKER_SIZES.pin.sizes));
    expect(markerSize(nextMarkerScale(5))).toBe(Math.min(...dots));
  });

  it("selecionado é maior que qualquer ícone normal", () => {
    expect(SELECTED_PIN_SIZE).toBeGreaterThan(Math.max(...MARKER_SIZES.pin.sizes));
  });

  it("altura do pin: cauda proporcional, 44 → 60 (o desenho validado antes)", () => {
    expect(pinHeight(44)).toBe(60);
    expect(pinHeight(28)).toBe(39);
  });
});

describe("bitmaps e cores", () => {
  const images = read("lib/pin-images.ts");
  const script = read("scripts/generate-pins.ps1");
  const theme = read("theme.ts");
  const visuals = ["analise", "andamento", "resolvido", "negado"];
  // Categorias do seed (prisma/seed.ts), no slug usado pelo MapCanvas.
  const categories = ["infraestrutura", "limpeza", "seguranca", "transito", "outros"];

  it("existe bitmap para toda categoria × status × tamanho (e o selecionado)", () => {
    for (const visual of visuals) {
      for (const d of MARKER_SIZES.dot.sizes) expect(images).toContain(`"dot/${visual}/${d}"`);
      for (const cat of categories) {
        for (const d of MARKER_SIZES.pin.sizes) expect(images).toContain(`"pin/${cat}/${visual}/${d}"`);
        expect(images).toContain(`"pin/${cat}/${visual}/sel"`);
      }
    }
  });

  it("as bolinhas usam as cores de status do tema (nenhuma preta)", () => {
    for (const visual of visuals) {
      const themeHex = new RegExp(`${visual}: \\{ dot: "(#[0-9A-F]{6})"`).exec(theme)?.[1];
      const scriptHex = new RegExp(`"${visual}"\\s*=\\s*"(#[0-9A-F]{6})"`).exec(script)?.[1];
      expect(themeHex).toBeDefined();
      expect(scriptHex).toBe(themeHex);
      expect(scriptHex).not.toBe("#000000");
      expect(scriptHex).not.toBe("#0D0D0D");
    }
  });

  it("nenhum vestígio de agrupamento", () => {
    expect(images).not.toContain("cluster/");
    expect(read("components/MapCanvas.tsx")).not.toMatch(/cluster/i);
  });
});

describe("leque visual para ícones sobrepostos (D-031, não é agrupamento)", () => {
  const SANTOS = { latitude: -23.9618, longitude: -46.3333 };
  /** Ponto a dx/dy metros do centro (aprox. local; suficiente para o teste). */
  const at = (id: string, dxM: number, dyM = 0, order = 0): SpreadPoint => ({
    id,
    latitude: SANTOS.latitude + dyM / 111_320,
    longitude: SANTOS.longitude + dxM / (111_320 * Math.cos((SANTOS.latitude * Math.PI) / 180)),
    order,
  });
  const screenAfter = (p: SpreadPoint, zoom: number, offsets: Map<string, { dx: number; dy: number }>) => {
    const xy = project(p.latitude, p.longitude, zoom);
    const o = offsets.get(p.id) ?? { dx: 0, dy: 0 };
    return { x: xy.x + o.dx, y: xy.y + o.dy };
  };

  it("as 2 ocorrências reais a ~7 m ficam lado a lado no zoom de rua", () => {
    const pts = [at("transito", 0, 0, 1), at("seguranca", 4, 5, 2)];
    const size = 45;
    const offsets = spreadOffsets(pts, 15.75, size);
    expect(offsets.size).toBe(2);
    const a = screenAfter(pts[0]!, 15.75, offsets);
    const b = screenAfter(pts[1]!, 15.75, offsets);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(size * 0.9);
    // Deslocamento pequeno: no máximo cerca de meio ícone para cada lado.
    for (const o of offsets.values()) expect(Math.hypot(o.dx, o.dy)).toBeLessThanOrEqual(size);
  });

  it("ao aproximar até não se sobreporem, voltam ao lugar exato", () => {
    const pts = [at("a", 0), at("b", 40)];
    expect(spreadOffsets(pts, 20, 54).size).toBe(0);
  });

  it("pontos distantes não são mexidos; nenhum é perdido num grupo grande", () => {
    const pts = [
      ...Array.from({ length: 6 }, (_, i) => at(`g${i}`, i * 2, 0, i)),
      at("longe", 3000, 0, 99),
    ];
    const zoom = 15;
    const size = 42;
    const offsets = spreadOffsets(pts, zoom, size);
    expect(offsets.has("longe")).toBe(false);
    const placed = pts.filter((p) => p.id !== "longe").map((p) => screenAfter(p, zoom, offsets));
    expect(placed).toHaveLength(6);
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++)
        expect(Math.hypot(placed[i]!.x - placed[j]!.x, placed[i]!.y - placed[j]!.y)).toBeGreaterThanOrEqual(size * 0.9);
  });

  it("é determinístico (mesma entrada → mesmos deslocamentos, independente da ordem do array)", () => {
    const pts = [at("x", 0, 0, 2), at("y", 3, 0, 1), at("z", 1, 2, 3)];
    const a = spreadOffsets(pts, 16, 45);
    const b = spreadOffsets([...pts].reverse(), 16, 45);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it("encadeia vizinhos (A perto de B, B perto de C → um só leque) e respeita o limite", () => {
    const size = 40;
    const zoom = 15;
    // Distância em dp ≈ metros / (m por dp). Em z15 em Santos, ~4,4 m/dp.
    const mPerDp = 156543.03392 * Math.cos((SANTOS.latitude * Math.PI) / 180) / 2 ** zoom;
    const step = size * OVERLAP_FACTOR * 0.9 * mPerDp; // vizinhos se sobrepõem, A e C não
    const pts = [at("A", 0, 0, 1), at("B", step, 0, 2), at("C", 2 * step, 0, 3)];
    expect(spreadOffsets(pts, zoom, size).size).toBe(3);
  });

  it("1000 ocorrências: recálculo rápido (só na troca de zoom)", () => {
    const pts = Array.from({ length: 1000 }, (_, i) => at(`p${i}`, (i % 40) * 30, Math.floor(i / 40) * 30, i));
    const started = performance.now();
    spreadOffsets(pts, 14, 33);
    expect(performance.now() - started).toBeLessThan(80);
  });
});

