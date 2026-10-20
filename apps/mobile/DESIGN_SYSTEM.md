# Design System — Cidade+ (`apps/mobile`)

Este documento formaliza as diretrizes visuais e tokens do aplicativo **Cidade+**, em conformidade direta com o design oficial do **Figma**.

---

## Regra de Ouro da Interface

> **SEM VALORES VISUAIS HARDCODED NAS TELAS**  
> Toda e qualquer cor, tipografia, raio de borda (`borderRadius`), espaçamento (`spacing`) e sombra deve ser consumida do módulo `apps/mobile/theme.ts` e dos componentes compartilhados.

---

## 1. Tokens de Tema (`apps/mobile/theme.ts`)

### 1.1 Cores (`theme.colors`)
- **Marca Principal (`brand.primary`):** `#0E7A24` (Verde florestal)
  - Botão Primário ("Entrar", "Finalizar Cadastro", "Enviar Ocorrência")
  - Anel de seleção ativa em Categorias
  - Métrica de Reputação no Perfil
- **Marca Secundária (`brand.logoNavy`):** `#162D46` / `#2B5887` (Azul escuro do logo)
- **Fundo Principal (`background.main`):** `#FFFFFF`
- **Fundo da Tab Bar (`background.tabBar`):** `#EDF6EE` (Verde menta suave)
- **Texto Principal (`text.primary`):** `#111827`
- **Texto Secundário (`text.secondary`):** `#6B7280`
- **Borda de Inputs (`border.subtle`):** `#E5E7EB` (1px sutil)
- **Chips de Filtro:**
  - Ativo: Fundo `#111827` (Preto sólido), Texto `#FFFFFF`
  - Inativo: Fundo `#FFFFFF`, Borda `#E5E7EB`, Texto `#111827`

### 1.2 Status das Ocorrências (`STATUS_CONFIG`)
1. **`REPORTADA`:** Dot `#F59E0B` (Laranja) | Badge `#FEF3C7` / `#92400E`
2. **`RECEBIDA`:** Dot `#3B82F6` (Azul) | Badge `#DBEAFE` / `#1E40AF`
3. **`EM_ANALISE`:** Dot `#F59E0B` (Âmbar) | Badge `#FEEBC8` / `#C05621`
4. **`EM_ATENDIMENTO`:** Dot `#3B82F6` (Azul suave) | Badge `#EBF5FB` / `#2B6CB0`
5. **`RESOLVIDA`:** Dot `#22C55E` (Verde) | Badge `#E6FFFA` / `#234E52`
6. **`ARQUIVADA`:** Dot `#9CA3AF` (Cinza) | Badge `#F3F4F6` / `#4B5563`
7. **`INVALIDA`:** Dot `#EF4444` (Vermelho) | Badge `#FEE2E2` / `#991B1B`

---

## 2. Componentes Oficiais

1. **`AppLogo`:** Logo oficial vetorizado (`CidadeMais_Horizontal.svg`, 200 × 52 px).
2. **`PrimaryButton`:** Botão em formato de pílula (`height: 52`, `borderRadius: 26`) em verde `#0E7A24`.
3. **`AuthTextField`:** Campo de texto com borda suave de 1px `#E5E7EB`, cantos `12dp` e foco verde `#0E7A24`.
4. **`FilterChips`:** Chips de categoria horizontais com pílula preta quando ativa.
5. **`AppTabBar`:** Barra de navegação com 5 abas em linha única sobre fundo `#EDF6EE`.
6. **`OccurrencePhotoGridItem`:** Card quadrado de 3 colunas para o feed, com foto em `borderRadius: 12` e dot de status circular no canto inferior direito.
7. **`CategorySelectGrid`:** Grade 3x2 das 5 categorias principais com anel verde e rótulo dinâmico.
8. **`StatusDot`:** Indicador circular com as cores oficiais de cada um dos 7 status.
9. **`StatusBadge`:** Chip estilizado com fundo translúcido e texto colorido para listas de ocorrências.

---

## 3. Diretriz de Privacidade (LGPD)

O feed público e o mapa **nunca** exibem o nome, foto de perfil, CPF ou qualquer dado pessoal do cidadão que reportou a ocorrência. Os dados pessoais aparecem exclusivamente na tela de **Minha Conta** para o próprio usuário logado.
