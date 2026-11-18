---
name: melhorar-prompt
description: Reescreve toda mensagem de TAREFA do usuário do Cidade+ num prompt estruturado e detalhado (papel e objetivo, contexto, auditoria, seções do pedido, entregável, restrições, relatório, resultado esperado) ANTES de executá-la. Use a cada pedido de código, plano, pesquisa, documentação, configuração, deploy ou decisão técnica do Cidade+, mesmo quando a mensagem for curta e informal. Não use para perguntas rápidas, confirmações ("ok", "pronto"), "e agora?" ou escolhas entre opções já apresentadas.
---

# Melhorar o prompt antes de executar (D-029)

O usuário pediu: **toda mensagem de tarefa é primeiro transformada num prompt melhorado, e só esse prompt é executado.** Padrão de qualidade: `docs/prompts/exemplo-hospedagem.md` (a mensagem informal e o prompt final). Modelo genérico: `docs/PROMPT_TEMPLATE.md`. Caminhos relativos a `AppCidade-/`.

## 1. Classificar a mensagem
- **Tarefa:** pede para criar, mudar, investigar, planejar, pesquisar, documentar, configurar, publicar ou decidir algo → **melhorar**.
- **Conversa:** pergunta rápida que se responde com o que já se sabe, confirmação, "e agora?", escolha entre opções já dadas, pedido de link ou status → **não melhorar**; responda direto.
- **Já estruturada** (segue o modelo): só complete o que faltar (auditoria, restrições, relatório).
- **Na dúvida**, trate como tarefa se ela levar a mudar arquivos ou produzir um entregável.

## 2. Reescrever
1. **Releia a mensagem inteira e liste cada pedido, dúvida e restrição.** Nenhum pode sumir: cada um vira uma seção ou uma pergunta numerada. Repasse a lista no final.
2. **Defina o modo pelas palavras do usuário:**
   - "só um plano", "tirar dúvidas", "não implementar", "estudo" → **só planejamento**, com a seção de restrições obrigatórias do modelo;
   - "faça", "implemente", "corrija", "pode seguir" → **implementação**, seguindo o ciclo do `AGENTS.md`.
3. **Escolha o papel** pela natureza do trabalho (DevOps, mobile, product designer, arquiteto…).
4. **Contexto:** o que existe hoje, a motivação, o prazo (entrega em 26/nov/2026), custos e as opções citadas. Opção sugerida pelo usuário = "avaliar, não assumir que é a melhor".
5. **Auditoria primeiro**, por camada (mobile, API, banco, infra), com perguntas concretas e "não presuma".
6. **Uma seção por frente do pedido:**
   - perguntas específicas numeradas;
   - critérios em tabela quando houver comparação;
   - cenários alternativos;
   - recomendação justificada.
7. **Se houver pesquisa externa:**
   - fontes oficiais e links;
   - "não invente valores ou comandos";
   - confirmado × hipótese.
8. **Entregável:** `plans/<tema>.md`. Procurar plano existente; um por tema, com nova seção datada. Se o usuário disser "plano.md", vale o plano do tema. Enumere as seções. Peça para diferenciar código × pesquisa × recomendação × decisão pendente.
9. **Restrições** conforme o modo, sempre com as do `AGENTS.md`: nada de `.env`, segredos ou chaves na documentação; plano antes do código; schema só com necessidade registrada.
10. **Relatório final** com uma linha por dúvida do usuário + os itens fixos do `AGENTS.md`. Feche com "**Resultado esperado:** …" numa frase.
11. **Proporção:** tarefa pequena → modelo curto. Tarefa grande ou com várias dúvidas → modelo detalhado, no nível do exemplo.
12. **Não acrescente escopo** que o usuário não pediu. Sugestões viram "considere/avalie", nunca obrigação. Fatos desconhecidos viram perguntas da auditoria, não suposições.

## 3. Registrar e executar
1. Salve o **prompt melhorado completo** no plano do tema, numa seção `### Pedido (prompt estruturado)` dentro da seção datada do pedido, **antes** de qualquer outra ação. É o "registrar as seções implícitas no plano" do `AGENTS.md`.
2. No chat, mostre **só um resumo curto**, de 4 a 8 linhas:
   - título;
   - modo (planejamento × implementação);
   - o que será entregue;
   - restrições principais;
   - onde o prompt completo foi salvo.
3. **Execute o prompt melhorado no mesmo turno.** Não espere aprovação, salvo dúvida que mude o resultado (ex.: não dá para saber se é para planejar ou implementar). Nesse caso, pergunte antes, de forma objetiva.
4. O relatório final responde ao prompt melhorado, cobrindo todas as dúvidas originais.

## Checagem rápida antes de executar
- [ ] Todas as dúvidas e pedidos da mensagem original estão no prompt?
- [ ] O modo está explícito e as restrições batem com ele?
- [ ] A auditoria vem antes de qualquer recomendação ou mudança?
- [ ] Há entregável, relatório final e resultado esperado?
- [ ] Nada foi acrescentado além do que o usuário pediu?
