---
status: implementado
tema: processo / documentação / agentes
atualizado: 2026-11-13
---

# Segundo cérebro do Cidade+ (Obsidian + Cursor/Claude)

## Objetivo

Fazer o agente (Cursor e Claude Code) recuperar o contexto do Cidade+ a partir dos arquivos do cofre do Obsidian, sem depender do histórico longo do chat, e seguir sempre o ciclo "documentar → implementar → validar → registrar".

## Contexto e problema

- As conversas longas deixam cada prompt mais lento, e decisões importantes ficam espalhadas no histórico.
- O cofre do Obsidian é a pasta `C:\Users\vasto\Desktop\cidade+` (`%APPDATA%\obsidian\obsidian.json`). O conhecimento do projeto está em `AppCidade-/` (repositório Git): `README.md` (visão de produto) e `plans/` (auditoria da fundação, relatório da ETAPA 13).
- O Cursor abre a pasta `cidade+` como workspace (`~/.cursor/projects/c-Users-vasto-Desktop-cidade`). Não havia `.cursor/rules`, `AGENTS.md` nem `CLAUDE.md`.

## Auditoria

| Item | Resultado |
|---|---|
| Volume do cofre | ~111 arquivos; ~40 KB de Markdown útil (README 13 KB, audit 25 KB, etapa-13 1,5 KB) |
| Ferramentas do agente | Cursor e Claude Code já leem, buscam (grep/glob) e editam arquivos locais |
| Regras persistentes no Cursor | `.cursor/rules/*.mdc` (`alwaysApply`) e `AGENTS.md` |
| Regras persistentes no Claude Code | `CLAUDE.md` com imports `@arquivo`, carregado da pasta atual e das pastas acima dela |
| Divergência encontrada | `apps/api/src/app.ts` importa `modules/uploads/upload.routes.js`, mas a pasta está ignorada pelo `.gitignore` (`uploads/`) e não existe no clone. Registrado em [[PROBLEMS]] (P-001). |

## Decisão (ver [[DECISIONS]] D-013)

Usar **acesso direto aos arquivos Markdown** com busca textual. Sem MCP do Obsidian, sem RAG e sem banco vetorial.

- O volume é pequeno: grep encontra qualquer assunto em milissegundos.
- MCP do Obsidian depende do Obsidian aberto e do plugin Local REST API, e não traz nada que o grep não faça neste volume.
- Revisar a decisão se `docs/` + `plans/` passarem de ~1 MB ou ~200 documentos.

## Estrutura adotada

```text
cidade+/                         ← cofre Obsidian = workspace do Cursor
├── CLAUDE.md                    ← entrada do Claude Code (importa AppCidade-/AGENTS.md)
├── .cursor/rules/segundo-cerebro.mdc  ← entrada do Cursor (alwaysApply)
└── AppCidade-/                  ← repositório Git (fonte de conhecimento versionada)
    ├── AGENTS.md                ← regras canônicas (fonte única)
    ├── docs/
    │   ├── PROJECT_CONTEXT.md   ← Nível 1: contexto essencial + mapa de documentos
    │   ├── DECISIONS.md         ← registro de decisões técnicas
    │   ├── PROBLEMS.md          ← problemas, causas raiz e soluções
    │   └── PROMPT_TEMPLATE.md   ← modelo de prompt de tarefa
    └── plans/
        ├── _TEMPLATE.md         ← modelo de plano
        └── <tema>.md            ← um plano vivo por tema (frontmatter `status:`)
```

## Etapas

- [x] Auditar cofre, Cursor e código
- [x] Criar este plano
- [x] Criar `docs/PROJECT_CONTEXT.md` a partir do código atual (não só dos planos)
- [x] Criar `DECISIONS.md` e `PROBLEMS.md` com o que já estava nos planos existentes
- [x] Criar `AGENTS.md` + pontos de entrada para o Cursor e o Claude Code
- [x] Criar o modelo de plano e o modelo de prompt
- [x] Adicionar o frontmatter `status:` aos planos existentes, sem alterar o conteúdo
- [x] Testar a recuperação de contexto

## Restrições respeitadas

- Nenhum código-fonte alterado. O bug P-001 foi apenas registrado.
- Nenhum arquivo apagado; nenhum `.env` lido ou copiado.
- Nada foi commitado.

## Resultado dos testes

Ver a seção "Testes de recuperação" no fim deste arquivo.

## Pendências e limitações

- O segundo prompt do usuário ("Configurar regras permanentes…") chegou cortado na seção 5 ("Preserve…"). As regras da seção 5 foram completadas por inferência (preservar o histórico, não duplicar, status explícito). Confirmar com o usuário.
- As regras orientam o agente, mas não o obrigam. Elas não substituem a revisão humana.
- Os arquivos novos ainda não foram commitados. O time decide se `AGENTS.md`, `docs/` e `plans/` entram no repositório; recomenda-se que sim.

## Testes de recuperação

Executados em 2026-11-13 seguindo apenas o roteiro do `AGENTS.md` (PROJECT_CONTEXT → grep → doc específico → código).

| Pergunta | Arquivos consultados | Resposta encontrada | Correta? |
|---|---|---|---|
| Objetivo e problema do Cidade+ | PROJECT_CONTEXT | §1 | Sim |
| Tecnologias e motivo | PROJECT_CONTEXT, DECISIONS | §3 + D-001..D-005 | Sim |
| Como o bairro é identificado pelo CEP | PROJECT_CONTEXT §6 → `services/viacep.ts`, `cep/resolve-address.ts` | CEP → ViaCEP → UF/cidade → `normalizedName` → `santosNeighborhoodId` | Sim (conferido no código) |
| Geofencing / decisões de geolocalização | grep `geofenc` → DECISIONS D-008, `geo/geofencing.ts` | `ST_Contains` no backend; 403 fora / 422 sem polígono | Sim; o 422 só estava no código e foi adicionado ao contexto |
| Mapa | grep `mapa` → PROJECT_CONTEXT §5, `(tabs)/map.tsx` | `react-native-maps`; filtro só por categoria e no cliente | Sim |
| Implementado × só planejado | PROJECT_CONTEXT §5 | Tabela de estado | Sim |
| Problema já investigado (upload) | grep `upload` → PROBLEMS P-001 | Causa raiz no `.gitignore` | Sim |
| Por que Fastify | grep `D-001` → DECISIONS | Não havia código Express | Sim |
| Tema sem implementação (push) | grep `push` | "Não iniciado" (PROJECT_CONTEXT §5) | Sim; não inventou nada |

**Métricas:** cada busca grep levou ~0,03 s. Contexto fixo por conversa: `AGENTS.md` (~5,4 KB) + `PROJECT_CONTEXT.md` (~8 KB), cerca de 13 KB contra ~68 KB da base inteira. Uma pergunta típica consome o Nível 1 + 1 trecho de documento + 1 a 2 arquivos de código. A auditoria de 25 KB só precisa ser aberta por seção.
**Conferido no código:** lista pública sem `take` (sem paginação); o cadastro chama `resolveResidentialAddress` e força `CITIZEN`; feed e mapa filtram por categoria no cliente; o seed tem Gonzaga e Ponta da Praia.
