---
tipo: modelo-de-prompt
atualizado: 2026-11-17
---

# Modelo de prompt para tarefas do Cidade+

> Usado pela skill `melhorar-prompt` (D-029). Toda mensagem de **tarefa** do usuário é reescrita neste formato antes de ser executada. Exemplo completo, da mensagem informal ao prompt final: [[exemplo-hospedagem]].
>
> Use as seções na proporção da tarefa. Um ajuste pequeno pode ficar com 1, 2, 3, uma seção de pedido, 6, 7 e 8. Nunca invente fatos para preencher uma seção: o que não se sabe vira pergunta da auditoria ou "pendente de investigação".

## Modelo detalhado

```markdown
# <Título que nomeia a entrega: tema + tipo de trabalho — Cidade+>

## 1. Papel e objetivo
Atue como <papéis com experiência relevante: ex. engenheiro de software / DevOps, product designer, arquiteto…>.

<O que o usuário quer, em 2 ou 3 frases, na voz dele.>

<Modo, explícito e em negrito: **Neste momento quero apenas auditoria, pesquisa e planejamento. Não quero implementar nada agora.**
— ou — **Quero implementar <X>, seguindo o ciclo do AGENTS.md.**>

O objetivo é terminar esta etapa sabendo / tendo:
- <cada dúvida ou resultado que o usuário mencionou, um por linha — nenhuma pode sumir>

## 2. Contexto e cenário
<Situação atual, motivação, prazos, restrições de custo, opções que o usuário citou.>
<Se ele sugeriu uma solução: "Avalie <opção>, mas não a considere automaticamente a melhor; compare com alternativas.">
<Estratégia em etapas, se houver: agora × futuro.>

## 3. Auditoria do estado atual (antes de propor ou mexer)
Consulte o Obsidian (`docs/PROJECT_CONTEXT.md`, `docs/DECISIONS.md`, `docs/PROBLEMS.md`), os planos em `plans/` e o código-fonte. O código é a fonte da verdade.

Identifique, por camada (só as que a tarefa toca):
### 3.1. <Mobile / Frontend> — <perguntas concretas>
### 3.2. <API / Backend> — <perguntas concretas>
### 3.3. <Banco de dados> — <perguntas concretas>
### 3.4. <Infra / outra área> — <perguntas concretas>

Não presuma que estruturas, campos, endpoints ou serviços existem sem verificar.
<Se ajudar: "Ao final, apresente um diagrama (Mermaid) do estado atual.">

## 4…N. <Uma seção por frente do pedido>
<Transforme cada dúvida em perguntas numeradas e específicas.>
<Quando houver escolha: critérios de comparação em tabela (preço, complexidade, riscos…).>
<Peça cenários alternativos e quando cada um faz sentido.>
<Regras de honestidade quando houver pesquisa:
- use fontes oficiais e inclua os links;
- não invente valores, comandos nem funcionalidades;
- diferencie confirmado × hipótese; promocional × renovação.>
<Peça recomendação final justificada, sem escolher "porque é comum" ou "porque é mais barato".>

## <N+1>. Planejamento / passo a passo
<Etapas em ordem cronológica. Para cada uma: o que fazer, por quê, onde, ferramentas, configurações, como verificar, cuidados.>
<Comandos só quando verificados nos scripts e arquivos reais do projeto.>

## <N+2>. Entregável
Crie ou atualize `plans/<tema>.md` (antes, procure planos do mesmo tema; um plano por tema, nova seção datada).
O documento deve conter:
1. <seção>
2. <seção>
…
Inclua diagramas Mermaid quando ajudarem. Diferencie claramente:
- o que foi identificado no código atual;
- o que foi pesquisado externamente;
- o que é recomendação;
- o que depende de decisão do time.

## <N+3>. Restrições obrigatórias
<Modo só planejamento: **ESTA ETAPA É EXCLUSIVAMENTE DE AUDITORIA, PESQUISA E PLANEJAMENTO.** Não modificar código, configuração, Docker, workflows, variáveis, dependências, banco, migrations, contas ou deploy. A única alteração permitida é a documentação em `plans/`.>
<Modo implementação: plano escrito antes do código; não alterar schema/migrations nem comportamento existente sem necessidade registrada; não adicionar dependências desnecessárias; não mexer no que está fora do escopo; testar e registrar os resultados.>
<Sempre: nunca ler nem copiar `.env`, senhas, tokens ou chaves para a documentação.>

## <N+4>. Validação (modo implementação)
<Funcionamento esperado, casos extremos, regressões, integrações afetadas, como testar.>

## <N+5>. Relatório final
Ao concluir, apresente:
- <uma linha para cada pergunta do usuário, respondida de forma objetiva>
- o que foi investigado · implementado · arquivos · decisões · testes e resultados (inclusive falhas) · documentação atualizada · pendências
- onde o plano foi criado ou atualizado
- <modo planejamento: confirmação explícita de que nada foi implementado>

**Resultado esperado:** <uma frase com o estado em que o usuário quer terminar.>
```

## Modelo curto (tarefas pequenas)

```markdown
# <Título>
## 1. Papel e objetivo — <papel> · <resultado verificável> · <modo>
## 2. Contexto — hoje acontece / deveria acontecer / motivo
## 3. Auditoria — arquivos e docs a conferir antes
## 4. O que fazer — itens concretos
## 5. Restrições — o que não pode mudar
## 6. Validação — como provar que funcionou
## 7. Relatório final — investigado · feito · arquivos · testes · docs · pendências
```
