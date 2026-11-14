---
tipo: modelo-de-prompt
atualizado: 2026-11-13
---

# Modelo de prompt para tarefas do Cidade+

> Copie, preencha e apague o que não se aplicar. Tarefas pequenas podem usar só 2, 3, 4 e 9. O agente segue o ciclo do `AGENTS.md` mesmo quando o prompt não traz todas as seções.

```markdown
# <Título curto da tarefa>

## 1. Papel
Atue como <ex.: engenheiro sênior em React Native/Expo, Fastify, Prisma/PostGIS>.

## 2. Contexto e problema
- O que acontece hoje:
- O que deveria acontecer:
- O que motivou o pedido:
- Mudanças anteriores relevantes (se souber: plano, D-0xx, P-0xx):

## 3. Objetivo
<resultado verificável, não "melhore a tela">

## 4. Regras principais
- Não quebrar o que já funciona.
- Não inventar endpoints/propriedades; reutilizar padrões e componentes existentes.
- <regras específicas>

## 5. Auditoria (antes de mexer)
Investigar código, documentação no Obsidian, planos, dependências e impactos. Registrar em `plans/<tema>.md`.

## 6. Planejamento
O que muda, como, quais arquivos e como preservar o comportamento atual. Atualizar o plano **antes** do código.

## 7. Implementação
Seguir o plano; se a estratégia mudar, atualizar o plano primeiro.

## 8. Validação
Funcionamento esperado, casos extremos, nulos/incompletos, regressões e integrações afetadas.

## 9. Restrições
<o que NÃO pode ser alterado>

## 10. Relatório final
Investigado · implementado · arquivos · decisões · testes/resultados · docs atualizadas · pendências.
```
