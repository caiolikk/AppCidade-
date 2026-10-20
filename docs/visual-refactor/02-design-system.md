# Proposta de Design System — Cidade+ (`apps/mobile`)

**Data:** 19 de Outubro de 2026  
**Status:** Aprovado para Implementação  
**Escopo:** `apps/mobile` (React Native + Expo Router + StyleSheet)

---

## 1. Módulo de Tema e Design Tokens (`apps/mobile/theme.ts`)

Centralização estrita de todos os valores visuais em tokens tipados:

```typescript
export const theme = {
  colors: {
    brand: {
      primary: "#0E7A24",        // Verde florestal dos botões principais e reputação
      primaryDark: "#0A5C1B",    // Estado hover / pressed
      primaryLight: "#E8F5E9",   // Fundo suave de destaque
      disabled: "#9CA3AF",       // Botão desabilitado
      logoNavy: "#162D46",       // Azul escuro do logo Cidade
      logoNavyLight: "#2B5887",  // Gradiente do logo
      logoCyan: "#20C3AA",       // Ciano do ícone do logo
    },
    background: {
      main: "#FFFFFF",           // Fundo das telas principais
      subtle: "#F9FAFB",         // Fundo de cards suaves
      tabBar: "#EDF6EE",         // Fundo verde menta sutil da barra inferior
      input: "#FFFFFF",          // Fundo dos inputs
      inputDisabled: "#F3F4F6",  // Fundo de campo desabilitado
    },
    text: {
      primary: "#111827",        // Títulos e textos de alto contraste
      secondary: "#6B7280",      // Subtítulos e informações de apoio
      muted: "#9CA3AF",          // Placeholders e textos desabilitados
      inverse: "#FFFFFF",        // Texto sobre botão primário ou chip preto
      link: "#0E7A24",           // Links acentuados
      error: "#DC2626",          // Mensagens de erro
    },
    border: {
      subtle: "#E5E7EB",         // Borda padrão de inputs e divisores
      medium: "#D1D5DB",         // Borda de cards selecionados
      focus: "#0E7A24",          // Borda de input ou categoria ativa
    },
    chip: {
      activeBg: "#111827",       // Fundo preto do chip selecionado
      activeText: "#FFFFFF",     // Texto branco do chip selecionado
      idleBg: "#FFFFFF",         // Fundo branco do chip inativo
      idleBorder: "#E5E7EB",     // Borda sutil do chip inativo
      idleText: "#111827",       // Texto preto do chip inativo
    },
  },
  typography: {
    fontFamily: {
      regular: "System",
      medium: "System",
      semiBold: "System",
      bold: "System",
    },
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
    button: 26,                  // Pílula para botão de 52dp
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
```

---

## 2. Mapeamento de Domínio como Tokens

### 2.1 Status da Ocorrência (7 Status Oficiais)
```typescript
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
```

### 2.2 Avaliação Comunitária (3 Tipos)
```typescript
export const EVALUATION_CONFIG = {
  UTIL: { label: "Útil", icon: "thumbs-up" },
  PERSISTE: { label: "Problema persiste", icon: "alert-circle" },
  INCORRETA: { label: "Informação incorreta", icon: "close-circle" },
};
```

### 2.3 Categorias e Fundos Pastel
```typescript
export const CATEGORY_STYLES: Record<string, { pastelBg: string }> = {
  Infraestrutura: { pastelBg: "#FDF2E9" },
  Limpeza: { pastelBg: "#EBF5FB" },
  Segurança: { pastelBg: "#EAEDED" },
  Trânsito: { pastelBg: "#FBEEE6" },
  Outros: { pastelBg: "#E8F8F5" },
};
```

---

## 3. Componentes a Criar ou Ajustar

1. **`AppLogo`:** Componente de renderização do logo `CidadeMais_Horizontal.svg` mantendo a proporção `200 x 52`.
2. **`PrimaryButton`:** Pílula (`borderRadius: 26`, `height: 52`), verde florestal (`#0E7A24`), desabilitado cinza (`#9CA3AF`).
3. **`AuthTextField`:** Borda sutil de 1px (`#E5E7EB`), cantos `12dp`, placeholders integrados com tipografia regular `15dp`.
4. **`AppTabBar`:** 5 ícones alinhados horizontalmente (Home, Mapa, +, Notificações, Perfil) com fundo translúcido `#EDF6EE`.
5. **`FilterChips`:** Chip ativo preto sólido (`#111827`), inativo com borda clara (`#E5E7EB`).
6. **`OccurrencePhotoGridItem`:** Card quadrado de foto no grid (3 colunas, `borderRadius: 12`) com ponto circular de status no canto.
7. **`CategorySelectGrid`:** Grade 3x2 dos 5 ícones ilustrados com anel circular de seleção verde.
8. **`StatusDot` e `StatusBadge`:** Indicadores circulares e pílulas textuais para status.
9. **`UserStatsHeader`:** Header da tela de perfil com métricas do usuário (ocorrências, avaliações, reputação).
10. **`NotificationItem`:** Item da lista de notificações com ícone em caixa pastel e status dot.
