---
status: implementado
tema: interface / identidade visual / Figma
atualizado: 2026-11-14
figma: https://www.figma.com/design/tsKpm9laEonyEZD5hLYVZS/APP-CIDADE-?node-id=1-1407
---

# Interface do app fiel ao Figma

## Objetivo

Aproximar o app (Expo/React Native) do design "APP CIDADE+" no Figma, preservando mapa, criação de ocorrências, API e navegação.

## Auditoria do Figma (acesso via MCP confirmado em 2026-11-14)

Página **"FInal"** (`1:1407`): 20 telas (402×874, iPhone 16 Pro) + seção **"Instâncias"** (componentes).

### Tokens
| Token | Valor | Onde |
|---|---|---|
| Verde primário | `#0B701A` | botões, links, categoria selecionada, status Resolvido, progresso |
| Texto | `#0D0D0D` | títulos, corpo, chip ativo (fundo) |
| Fundo | `#FAFAFA` | todas as telas; chips inativos |
| Degradê de fundo | `#FAFAFA` (60%) → `#E3FCE4` | Home, Mapa (na base) |
| Texto secundário | `#757575` | subtítulos, rótulos inativos |
| Borda de campo | `#D9D9D9` (1px, raio 8) | inputs; divisórias de lista |
| Borda de área | `#757575` (1px, raio 5, sombra interna) | Descrição / Foto (Nova Ocorrência) |
| Status Em análise | `#F97216` / pílula `#F2DBCC` | |
| Status Em andamento | `#0D3A9F` / pílula `#CBD4E8` | |
| Status Resolvido | `#0B701A` / pílula `#DFF2C9` | |
| Status Negado | `#AC0C0C` / pílula `#D39F9F` | |
| Popup de sucesso | vidro `rgba(29,29,29,0.3)`, raio 40; título `#73D303` | Pop - Ocorrência |
| Tipografia | SF Pro (Large Title 34/41 bold, +0.4; Body 17/22; 14 medium; 12) + Inter em textos pequenos | |
| Botão | pílula 52px, raio total, `#0B701A`, texto 17 `#FAFAFA`, sombra 0 8 40 rgba(0,0,0,.12) | Entrar, Enviar Ocorrência, Finalizar Cadastro |
| Chip de categoria | 22px de altura, raio total; ativo: fundo `#0D0D0D` e texto `#FAFAFA`; inativo: fundo `#FAFAFA`, borda 1 `#0D0D0D`; 14 medium | Menu Categorias |
| Navbar | 5 ícones de traço 60×60 (home, mapa, +, sino, perfil), barra de vidro 300×60 `rgba(217,217,217,.2)` raio 20, sem estado ativo desenhado | NAVBAR |

### Telas × app
| Figma | App | Situação |
|---|---|---|
| Login (`67:1309`, `263:2122` com logo) | `(auth)/login.tsx` | Implementar visual |
| Cadastro (`87:1327`) | `(auth)/register.tsx` | Implementar visual. O Figma tem **Celular** e **Repetir senha**; a API não tem celular e exige **CEP** → manter CEP, não criar celular; "repetir senha" só validado no app |
| Home + filtros (`1:3066`, `171:*`) | `(tabs)/index.tsx` | Grade **3 colunas** com bolinha de status; título "Santos" + bairro; chips; avatar |
| Mapa (`1:3164`) | `(tabs)/map.tsx` | Busca flutuante, chips, degradês. O Figma não tem cards: mantenho uma faixa compacta (necessária para abrir o detalhe) |
| Nova Ocorrência (`107:1468`, `158:*`) | `(tabs)/create.tsx` | Barra de etapas, grade de categorias ilustradas, Descrição, Foto, botão. O Figma **não tem Título nem Local**, mas são exigidos pela API e pelo usuário (D-018): mantidos no mesmo estilo de seção |
| Pop - Ocorrência (`159:3160`) | (não existia) | Popup de sucesso ao enviar |
| Minha Conta (`1:3343`) | `(tabs)/account.tsx` | Cabeçalho (avatar, nome, "Membro desde"). **Estatísticas e "Minhas ocorrências" exigem endpoints inexistentes** → fora do escopo visual |
| Notificações (`1:3285`) | placeholder | Funcionalidade não existe → só o cabeçalho no padrão; lista fora do escopo |
| Loading (`41:2628`), Check (`1:3012`), Logo (`263:2158`) | — | Splash/loader: fora do escopo |
| (não há no Figma) | `occurrence/[id].tsx` | Só tokens (cores, tipografia, status) |

### Status (7 do backend → 4 visuais do Figma)
`REPORTADA`, `RECEBIDA`, `EM_ANALISE` → **Em análise** (laranja) · `EM_ATENDIMENTO` → **Em andamento** (azul) · `RESOLVIDA` → **Resolvido** (verde) · `INVALIDA`, `ARQUIVADA` → **Negado** (vermelho). O texto mostrado continua o rótulo real do status (`STATUS_LABEL`); só a cor segue o Figma. Ver [[DECISIONS]] D-007.

## Auditoria do app (antes)

- Paleta **azul** (`primary #153A6B`), status com 7 cores próprias, texto `#111`.
- Ícones: Ionicons; tab bar branca com FAB azul.
- Home: grade de **4 colunas** + card de resumo fixo; tocar na foto só seleciona.
- Login/Cadastro: título "Cidade+", campos com rótulo; caixa de contas de seed visível.
- Sem SVG, sem degradê, sem blur (módulos nativos ausentes).
- Categorias do seed (7): Buraco, Iluminação, Calçada, Sinalização, Lixo, Árvore e outra, que não batem com as 5 do Figma.

## Decisões (aprovadas pelo usuário em 2026-11-14)

- **D-019:** adotar as **5 categorias do Figma** (Infraestrutura, Limpeza, Segurança, Trânsito, Outros) com as ilustrações 3D. O seed cria essas e remove as antigas **sem ocorrências** (o banco está vazio).
- **D-020:** adicionar `react-native-svg`, `expo-linear-gradient` e `expo-blur` (versões do SDK 54 via `expo install`) + `react-native-svg-transformer` (dev, Metro). **Exige 1 novo development build.**

## Etapas

- [x] 1. Dependências + Metro (SVG) + tipos `*.svg`
- [x] 2. Tokens em `theme.ts` (cores Figma, `statusVisual`, tipografia) e mapeamento de status em `lib/format.ts`
- [x] 3. Componentes: `PrimaryButton`, `AuthTextField` (estados: foco/erro), `FilterChips`, `AppTabBar` (navbar de vidro), `StatusPill`, `CategoryIcon`, `ScreenBackground` (degradê), `SuccessPopup`
- [x] 4. Login + Cadastro
- [x] 5. Home (grade 3 colunas)
- [x] 6. Mapa (busca flutuante, chips, degradês)
- [x] 7. Nova Ocorrência (etapas, categorias ilustradas, seções, popup)
- [x] 8. Minha Conta, Notificações (cabeçalho), Detalhe (tokens)
- [x] 9. Seed das 5 categorias
- [x] 10. Validação: typecheck, testes da API, bundle Android, comparação com os screenshots do Figma
- [x] 11. Docs

## Restrições

Não alterar endpoints, contratos ou regras; não remover funcionalidades (título, local, voto, logout, busca); não inventar dados (sem estatísticas falsas na conta).

## Descobertas durante a implementação

- **Assets invisíveis no Figma (P-011):** `ICON - USER` (avatar da Home e da Conta) e `Voltar` (Nova Ocorrência) estão com **opacidade 0** no design; os screenshots confirmam que não aparecem. Não foram exibidos. O detalhe usa a seta visível da busca do mapa como "voltar".
- **Botão desabilitado:** Login e Cadastro no Figma mostram o botão verde com campos vazios, e o comportamento anterior era o mesmo. Só a Nova Ocorrência usa cinza `#757575` desabilitado, como no frame inicial do Figma.
- **Legenda "Foto enviada apenas à Prefeitura (LGPD)"** do Figma **não foi usada**: seria falsa, porque a miniatura é pública no feed.
- **Microfone da busca** e **"Esqueci minha senha"** não foram implementados: as funcionalidades não existem (seriam elementos sem ação).
- Ordem das categorias: a API ordena por nome; o app aplica a ordem do Figma.

## Testes (2026-11-14)

| Teste | Resultado |
|---|---|
| `npm run typecheck` (api + mobile) | OK |
| `npm test` (API) | **7/7** (teste ajustado: categoria "Buraco" → "Infraestrutura") |
| `npx expo-doctor` | **18/18** |
| Bundle JS Android (Metro limpo, com SVG transformer) | HTTP 200, ~7,4 MB; contém SVGs, `LinearGradient` e `BlurView` |
| Seed | banco com exatamente as 5 categorias; 7 antigas removidas (0 ocorrências) |
| **Comparação visual** (app web renderizado no Edge headless em 402×874 × screenshots do Figma) | Login, Cadastro, Home, Nova Ocorrência, Minha Conta e Mapa comparados; ajustes feitos depois da 1ª rodada: campos 40px, rótulos cinza 16, placeholders do cadastro, botão de login/cadastro sem estado desabilitado, grade de categorias 3 por linha, margem do seletor de local, remoção dos ícones invisíveis |
| Dados de teste | 2 ocorrências temporárias criadas para a Home/Mapa e **removidas** (banco: 0 ocorrências) |
| Novo development build Android (EAS) | **Iniciado**: https://expo.dev/accounts/cidadeplus/projects/cidade-plus/builds/45d480bb-3bf4-4096-ac30-9b793f287572 |
| Teste no celular (mapa real, câmera, GPS, teclado, popup) | **Pendente**: depende do build acima |

Limitação da comparação: o render web usa a fonte do Windows (Segoe UI) e um mapa ilustrativo (`MapCanvas.web`); no aparelho é SF Pro/Roboto e Google Maps/Apple Maps.

## Resultado da implementação

| Arquivo | Alteração |
|---|---|
| `apps/mobile/theme.ts` | Tokens do Figma; `statusVisual` (7→4); degradê; tipografia; sombras |
| `components/PrimaryButton.tsx` | Pílula verde 52px, sombra, estados pressionado/desabilitado/carregando, variante contorno |
| `components/AuthTextField.tsx` | Input do Figma (40px, borda #D9D9D9, raio 8), rótulo opcional, foco/erro, tom do placeholder |
| `components/FilterChips.tsx` | Chips 22px pretos/brancos |
| `components/AppTabBar.tsx` | Navbar de vidro (blur) flutuante com os 5 ícones SVG; `useTabBarSpace()` |
| `components/StatusPill.tsx` (novo) | Pílula e bolinha de status |
| `components/CategoryIcon.tsx` (novo) | Categoria ilustrada (anel + recorte do Figma) |
| `components/ScreenBackground.tsx`, `SuccessPopup.tsx`, `BackButton.tsx` (novos) | Degradê, "Ocorrência Enviada!", voltar |
| `components/OccurrenceSummaryCard.tsx` | Formato de linha do Figma (bolinha, título, categoria • tempo, status) |
| `app/(auth)/login.tsx`, `register.tsx` | Layout do Figma (logo, textos, links); "Repetir senha" validado no app |
| `app/(tabs)/index.tsx` | Grade de 3 colunas, bolinha de status, cabeçalho, esmaecimento; toque abre o detalhe |
| `app/(tabs)/map.tsx` | Busca flutuante, chips, degradês; cards no formato do Figma |
| `app/(tabs)/create.tsx` | Etapas, categorias ilustradas, seções, foto única, botão, popup (lógica preservada) |
| `app/(tabs)/account.tsx`, `notifications.tsx`, `components/PlaceholderScreen.tsx` | Cabeçalho/estilo do Figma, sem dados inventados |
| `app/occurrence/[id].tsx` | Tokens, pílula de status, voltar |
| `lib/format.ts`, `hooks/use-feed.ts` | "há 1 minuto/1 dia/1 semana"; "Membro desde"; ordem do Figma |
| `metro.config.js`, `svg.d.ts`, `package.json` | SVG transformer + 3 módulos nativos |
| `assets/figma/*` | Ícones, logo, anéis e ilustrações exportados do Figma |
| `prisma/seed.ts`, `apps/api/test/...` | 5 categorias (D-019) |

## Pendências e limitações

- **Instalar o novo development build** (link acima) antes de abrir o app: o build antigo fecha com erro de módulo nativo (RNSVG/ExpoLinearGradient). Reiniciar o Metro com `--clear` (mudou o `metro.config.js`).
- Validar no aparelho e passar este plano para `validado`.
- **Fora do escopo visual (precisam de API):** estatísticas e "Minhas ocorrências" (Minha Conta); lista de Notificações; "Esqueci minha senha"; busca de endereço funcional; microfone.
- **Telas do Figma não implementadas:** Loading (`41:2628`), Check (`1:3012`) e splash com logo (`263:2158`).
- O Figma não desenha estado ativo na navbar; os ícones inativos usam 55% de opacidade (adaptação de usabilidade).
- Fontes: SF Pro é a fonte do sistema no iOS; no Android usa-se Roboto (a SF Pro não pode ser embarcada no Android por licença). Os textos em Inter do Figma também usam a fonte do sistema.
- As ilustrações das categorias somam ~2,6 MB; dá para comprimi-las depois.
