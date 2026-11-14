# Regras do agente — Cidade+

> Fonte única das regras de trabalho para Cursor e Claude Code. Os pontos de entrada `../CLAUDE.md` e `../.cursor/rules/segundo-cerebro.mdc` apenas apontam para cá. Edite **só este arquivo**.

## Segundo cérebro (memória do projeto)

O cofre do Obsidian é a pasta `cidade+/`. O conhecimento versionado fica em `AppCidade-/`:

| Arquivo | Para quê |
|---|---|
| `docs/PROJECT_CONTEXT.md` | **Nível 1.** Produto, regras de negócio, stack, módulos, rotas, estado das funcionalidades, mapa de documentos |
| `docs/DECISIONS.md` | Decisões técnicas e seus motivos (`D-0xx`) |
| `docs/PROBLEMS.md` | Bugs investigados, causas raiz e soluções tentadas (`P-0xx`) |
| `plans/<tema>.md` | Um plano vivo por tema, com frontmatter `status:` |
| `plans/_TEMPLATE.md` · `docs/PROMPT_TEMPLATE.md` | Modelos de plano e de prompt |

Os caminhos deste arquivo são relativos a `AppCidade-/` (rode as buscas a partir dela). `[[Nome]]` é um link do Obsidian para `Nome.md` em `docs/` ou `plans/` (os nomes são únicos).

## Recuperação de contexto (não carregue o cofre inteiro)

1. **Nível 1:** leia `docs/PROJECT_CONTEXT.md` no início de qualquer tarefa que envolva código ou decisão. Perguntas triviais dispensam a leitura.
2. **Nível 2:** busque só o que a tarefa pede: `grep -rn -i "<termo>" docs plans` e `grep -rn "^status:" plans`. Abra apenas os documentos encontrados e, nos longos (ex.: `cidade-plus-foundation-audit.md`), só a seção relevante.
   - Mudança estrutural → leia `DECISIONS.md` antes de propor.
   - Bug → procure em `PROBLEMS.md` antes de investigar.
3. **Nível 3:** confirme no código os arquivos indicados pela documentação. **O código atual é a fonte da verdade** sobre o comportamento. Se divergir da doc, avise e corrija a doc.
- Não releia o histórico antigo do chat quando a informação estiver documentada. As mensagens recentes continuam valendo para a tarefa atual.
- Se a informação não existir na base, diga isso. **Não invente decisões anteriores.**

## Ciclo obrigatório para qualquer alteração de código

```text
Solicitação → PROJECT_CONTEXT → buscar planos/decisões/problemas → auditar o código
→ criar OU atualizar plans/<tema>.md (auditoria + estratégia + etapas)   ← ANTES de editar código
→ implementar → testar/validar → atualizar o plano com os resultados
→ registrar conhecimento durável (DECISIONS / PROBLEMS / PROJECT_CONTEXT) → relatório final
```

- **É proibido editar código antes de o plano estar escrito.** Tarefas pequenas pedem um plano curto (algumas linhas no plano do tema), não dispensam o plano.
- **Um plano por tema, não por prompt.** Antes de criar, rode `ls plans` e `grep -rli "<tema>" plans`. Se houver um plano do assunto, **acrescente** uma nova seção datada (`## YYYY-MM-DD — <pedido>`) e preserve o histórico. Nomes de arquivo em kebab-case por tema (ex.: `autenticacao.md`, `mapa-e-geolocalizacao.md`).
- Use as seções de `plans/_TEMPLATE.md` na proporção da tarefa. O que não estiver confirmado fica como **"pendente de investigação"**, nunca preenchido por suposição.
- Se a estratégia mudar durante a implementação, **atualize o plano antes** de seguir.
- Nada fora do escopo sem justificativa registrada no plano.

## Status dos planos (frontmatter `status:`)

`planejado` · `em-andamento` · `implementado` (código existe) · `validado` (testado/aprovado pelo usuário) · `bloqueado`.
Um plano só passa a `implementado` depois de conferido no código, e a `validado` só com teste ou aprovação explícita. **Um plano escrito não significa funcionalidade pronta.** Atualize também o campo `atualizado:`.

## Memória viva: o que registrar (e o que não)

Registre depois de tarefas relevantes, **atualizando os arquivos existentes antes de criar novos**:
- decisão técnica ou mudança de arquitetura → `DECISIONS.md` (nova `D-0xx`; uma decisão revertida vira "Substituída por");
- bug com causa raiz não óbvia, ou tentativa que falhou → `PROBLEMS.md`;
- funcionalidade nova, rota, módulo, regra de negócio ou estado alterado → atualize a tabela/seção de `PROJECT_CONTEXT.md` (mantenha-o enxuto, com no máximo ~200 linhas);
- resultados, testes e pendências → o próprio plano.

Não registre ajustes triviais (estilo, renomes, typos). Não duplique: faça um link com `[[Nome]]`.

## Formato dos prompts

Prompts de tarefa seguem `docs/PROMPT_TEMPLATE.md`: papel, contexto, objetivo, regras, auditoria, planejamento, implementação, validação, restrições e relatório. Se um prompt chegar sem essa estrutura, extraia as seções implícitas e registre-as no plano. Pergunte só o que for realmente ambíguo.

## Relatório final de cada tarefa

O que foi investigado · o que foi implementado · arquivos modificados · decisões · testes e resultados (inclusive falhas) · documentação atualizada · pendências.

## Segurança e preservação

- Nunca leia nem copie `.env`, senhas, tokens ou chaves para a documentação. Use `.env.example` só pelos nomes das variáveis.
- Não apague nem sobrescreva documentos ou planos existentes; acrescente.
- Código e documentação versionada vão para `AppCidade-/` (repositório Git). Não crie um repositório paralelo.
- Não altere o schema/migrations nem o comportamento existente sem necessidade registrada no plano.
