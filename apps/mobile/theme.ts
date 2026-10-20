export const theme = {
  colors: {
    brand: {
      primary: "#0E7A24", // Verde oficial dos botões e destaques do Figma
      primaryDark: "#0A5C1B",
      primaryLight: "#E8F5E9",
      disabled: "#9CA3AF",
      disabledBg: "#6B7280",
      logoNavy: "#162D46",
      logoNavyLight: "#2B5887",
      logoCyan: "#20C3AA",
    },
    background: {
      main: "#FFFFFF",
      subtle: "#F9FAFB",
      tabBar: "#EDF6EE", // Fundo menta suave da Tab Bar
      input: "#FFFFFF",
      inputDisabled: "#F3F4F6",
    },
    text: {
      primary: "#111827",
      secondary: "#6B7280",
      muted: "#9CA3AF",
      inverse: "#FFFFFF",
      link: "#0E7A24",
      error: "#DC2626",
    },
    border: {
      subtle: "#E5E7EB", // Borda sutil dos campos de texto (1px)
      medium: "#D1D5DB",
      focus: "#0E7A24",
    },
    chip: {
      activeBg: "#111827", // Preto sólido para chip selecionado
      activeText: "#FFFFFF",
      idleBg: "#FFFFFF",
      idleBorder: "#E5E7EB",
      idleText: "#111827",
    },
  },
  typography: {
    size: {
      display: 28,
      title: 22,
      subtitle: 16,
      body: 15,
      label: 13,
      badge: 12,
      caption: 11,
    },
    lineHeight: {
      display: 34,
      title: 28,
      subtitle: 22,
      body: 20,
      label: 18,
      badge: 16,
      caption: 14,
    },
    weight: {
      regular: "400" as const,
      medium: "500" as const,
      semiBold: "600" as const,
      bold: "700" as const,
      extraBold: "800" as const,
    },
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
    button: 26, // Formato pílula dos botões de 52dp
    input: 12,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    screenPadding: 20,
  },
  shadows: {
    card: {
      shadowColor: "#000000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    floating: {
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
  },
};

// Mapeamento compatível para código legado durante a migração
export const colors = {
  primary: theme.colors.brand.primary,
  text: theme.colors.text.primary,
  muted: theme.colors.text.secondary,
  subtitle: theme.colors.text.secondary,
  background: theme.colors.background.main,
  border: theme.colors.border.subtle,
  chipBorder: theme.colors.chip.idleBorder,
  grid: "#C8C8C8",
  tagGrey: "#E5E7EB",
  tagYellow: "#F3E08A",
  mapGreen: "#1F6B4A",
  locationBlue: "#2F6FED",
  avatar: "#D9D6F2",
  tabBarBg: theme.colors.background.tabBar,
};

export type OccurrenceStatusType =
  | "REPORTADA"
  | "RECEBIDA"
  | "EM_ANALISE"
  | "EM_ATENDIMENTO"
  | "RESOLVIDA"
  | "ARQUIVADA"
  | "INVALIDA";

export const STATUS_CONFIG: Record<
  OccurrenceStatusType,
  { label: string; dotColor: string; bg: string; textColor: string }
> = {
  REPORTADA: {
    label: "Reportada",
    dotColor: "#F59E0B",
    bg: "#FEF3C7",
    textColor: "#92400E",
  },
  RECEBIDA: {
    label: "Recebida",
    dotColor: "#3B82F6",
    bg: "#DBEAFE",
    textColor: "#1E40AF",
  },
  EM_ANALISE: {
    label: "Em análise",
    dotColor: "#F59E0B",
    bg: "#FEEBC8",
    textColor: "#C05621",
  },
  EM_ATENDIMENTO: {
    label: "Em atendimento",
    dotColor: "#3B82F6",
    bg: "#EBF5FB",
    textColor: "#2B6CB0",
  },
  RESOLVIDA: {
    label: "Resolvida",
    dotColor: "#22C55E",
    bg: "#E6FFFA",
    textColor: "#234E52",
  },
  ARQUIVADA: {
    label: "Arquivada",
    dotColor: "#9CA3AF",
    bg: "#F3F4F6",
    textColor: "#4B5563",
  },
  INVALIDA: {
    label: "Inválida",
    dotColor: "#EF4444",
    bg: "#FEE2E2",
    textColor: "#991B1B",
  },
};

export const statusColors: Record<OccurrenceStatusType, string> = {
  REPORTADA: STATUS_CONFIG.REPORTADA.dotColor,
  RECEBIDA: STATUS_CONFIG.RECEBIDA.dotColor,
  EM_ANALISE: STATUS_CONFIG.EM_ANALISE.dotColor,
  EM_ATENDIMENTO: STATUS_CONFIG.EM_ATENDIMENTO.dotColor,
  RESOLVIDA: STATUS_CONFIG.RESOLVIDA.dotColor,
  ARQUIVADA: STATUS_CONFIG.ARQUIVADA.dotColor,
  INVALIDA: STATUS_CONFIG.INVALIDA.dotColor,
};

export const CATEGORY_PASTEL_BG: Record<string, string> = {
  Infraestrutura: "#FDF2E9",
  Limpeza: "#EBF5FB",
  Segurança: "#EAEDED",
  Trânsito: "#FBEEE6",
  Outros: "#E8F8F5",
};
