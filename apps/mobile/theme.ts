import { Platform, type TextStyle } from "react-native";
import type { OccurrenceStatus } from "./lib/types";

/**
 * Tokens do Figma "APP CIDADE+" (página FInal). Ver plans/interface-figma.md.
 * Os nomes antigos foram mantidos para não quebrar telas existentes; os valores seguem o Figma.
 */
export const colors = {
  primary: "#0B701A", // verde: botões, links, seleção, progresso
  text: "#0D0D0D",
  muted: "#757575", // subtítulos, rótulos inativos
  subtitle: "#757575",
  placeholder: "#D9D9D9",
  background: "#FAFAFA",
  backgroundTint: "#E3FCE4", // fim do degradê de fundo
  border: "#757575", // áreas de texto/foto (Nova Ocorrência)
  inputBorder: "#D9D9D9", // campos e divisórias
  chipBorder: "#0D0D0D",
  grid: "#D9D9D9",
  divider: "#D9D9D9",
  progressIdle: "#D9D9D9",
  onPrimary: "#FAFAFA",
  error: "#AC0C0C",
  success: "#73D303", // título do popup de sucesso
  tagGrey: "#E5E7EB",
  tagYellow: "#F2DBCC",
  mapGreen: "#0B701A",
  locationBlue: "#0D3A9F",
  avatar: "#E3FCE4",
};

/** Os 4 estados visuais do Figma (componentes "Bullet - Status" e "Status Ocorrência"). */
export type StatusVisual = "analise" | "andamento" | "resolvido" | "negado";

export const statusVisualColors: Record<StatusVisual, { dot: string; pill: string; text: string }> = {
  analise: { dot: "#F97216", pill: "#F2DBCC", text: "#F97216" },
  andamento: { dot: "#0D3A9F", pill: "#CBD4E8", text: "#0D3A9F" },
  resolvido: { dot: "#0B701A", pill: "#DFF2C9", text: "#0B701A" },
  negado: { dot: "#AC0C0C", pill: "#D39F9F", text: "#AC0C0C" },
};

/** 7 status do backend → 4 estados visuais do Figma (só cor; o rótulo continua o real). */
export const statusVisual: Record<OccurrenceStatus, StatusVisual> = {
  REPORTADA: "analise",
  RECEBIDA: "analise",
  EM_ANALISE: "analise",
  EM_ATENDIMENTO: "andamento",
  RESOLVIDA: "resolvido",
  ARQUIVADA: "negado",
  INVALIDA: "negado",
};

/** Cor da bolinha/pin por status (usada no mapa e no feed). */
export const statusColors = Object.fromEntries(
  Object.entries(statusVisual).map(([status, visual]) => [status, statusVisualColors[visual].dot]),
) as Record<OccurrenceStatus, string>;

/** Degradê de fundo do Figma: #FAFAFA até 60%, depois #E3FCE4. */
export const backgroundGradient = {
  colors: [colors.background, colors.background, colors.backgroundTint] as const,
  locations: [0, 0.6, 1] as const,
};

/**
 * Tipografia. O Figma usa SF Pro (fonte do sistema no iOS); no Android cai na fonte do
 * sistema (Roboto), que é o equivalente nativo. Os tamanhos e pesos seguem o Figma.
 */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.4, color: colors.text },
  title: { fontSize: 20, lineHeight: 24, fontWeight: "600", color: colors.text },
  section: { fontSize: 16, lineHeight: 19, fontWeight: "600", color: colors.text },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43, color: colors.text },
  input: { fontSize: 16, color: colors.text },
  subtitleMedium: { fontSize: 14, lineHeight: 17, fontWeight: "500", color: colors.muted },
  small: { fontSize: 12, lineHeight: 14, fontWeight: "400", color: colors.text },
  caption: { fontSize: 10, lineHeight: 12, fontWeight: "400", color: "rgba(13,13,13,0.75)" },
} satisfies Record<string, TextStyle>;

/** Sombra suave dos botões e elementos flutuantes (Figma: 0 8 40 rgba(0,0,0,.12)). */
export const softShadow = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  default: { elevation: 6 },
});

/** Sombra da busca do mapa (Figma: 0 0 20 rgba(0,0,0,.25)). */
export const floatingShadow = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  default: { elevation: 8 },
});
