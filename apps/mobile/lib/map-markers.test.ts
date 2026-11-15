// Rodar na raiz do repositório: npx vitest run apps/mobile/lib
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ICON_MIN_ZOOM,
  LEVEL_HYSTERESIS,
  MARKER_SIZES,
  SELECTED_PIN_SIZE,
  markerSize,
  nextMarkerScale,
  pinHeight,
  zoomFromRegion,
  type MarkerScale,
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
    expect(Math.min(...sizes)).toBe(28);
    expect(Math.max(...sizes)).toBe(52);
    expect(markerSize(nextMarkerScale(21))).toBe(52);
  });

  it("diminui ao afastar (rua > abertura > cidade) e o ícone mínimo continua reconhecível", () => {
    const street = markerSize(nextMarkerScale(zoomFromRegion(0.01, WIDTH)));
    const opening = markerSize(nextMarkerScale(zoomFromRegion(0.05, WIDTH)));
    const city = markerSize(nextMarkerScale(ICON_MIN_ZOOM + 0.05));
    expect(street).toBeGreaterThan(opening);
    expect(opening).toBeGreaterThan(city);
    expect(city).toBeGreaterThanOrEqual(28);
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
