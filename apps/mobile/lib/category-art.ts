import type { ImageSourcePropType } from "react-native";

/**
 * Ilustrações 3D das categorias (Figma, D-019). O recorte (%) reproduz o do Figma: a imagem
 * 16:9 é maior que o círculo e é deslocada dentro dele.
 * - `source`: original (1920px), usada no formulário (círculo de 74px).
 * - `small`: 256px, usada nos pins do mapa e na lista (muitas instâncias na tela).
 */
export type CategoryArt = {
  source: ImageSourcePropType;
  small: ImageSourcePropType;
  crop: { width: `${number}%`; height: `${number}%`; left: `${number}%`; top: `${number}%` };
};

const ART: Record<string, CategoryArt> = {
  infraestrutura: {
    source: require("../assets/figma/category-infraestrutura.png"),
    small: require("../assets/figma/category-infraestrutura-sm.png"),
    crop: { width: "151.3%", height: "84.31%", left: "-24.39%", top: "4.59%" },
  },
  limpeza: {
    source: require("../assets/figma/category-limpeza.png"),
    small: require("../assets/figma/category-limpeza-sm.png"),
    crop: { width: "155.77%", height: "84.59%", left: "-28.53%", top: "5.8%" },
  },
  seguranca: {
    source: require("../assets/figma/category-seguranca.png"),
    small: require("../assets/figma/category-seguranca-sm.png"),
    crop: { width: "166.32%", height: "93.14%", left: "-33.16%", top: "4.11%" },
  },
  transito: {
    source: require("../assets/figma/category-transito.png"),
    small: require("../assets/figma/category-transito-sm.png"),
    crop: { width: "158.69%", height: "90.88%", left: "-30.66%", top: "4.53%" },
  },
  outros: {
    source: require("../assets/figma/category-outros.png"),
    small: require("../assets/figma/category-outros-sm.png"),
    crop: { width: "133.31%", height: "73.82%", left: "-17.26%", top: "12.49%" },
  },
};

function artKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Ilustração da categoria, ou `null` se a categoria não tiver uma (o chamador usa a inicial). */
export function getCategoryArt(name: string): CategoryArt | null {
  return ART[artKey(name)] ?? null;
}
