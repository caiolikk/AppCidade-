# Roteiro de apresentação — Cidade+

**Duração:** uns 6 a 8 minutos no total  
**Formato:** três pessoas. Cada uma fala o seu bloco e passa a vez.  
**Como usar:** o que está em *itálico* não se fala.

---

## Pessoa 1 — A ideia

*Na tela: nome do app, Santos, prazo.*

Boa noite. A gente é a equipe do **Cidade+**.

A ideia é simples: um aplicativo para o cidadão de **Santos** reportar problemas da cidade — buraco, calçada, iluminação, lixo — e acompanhar isso num mapa.

Hoje esses relatos ficam espalhados. Falta um canal único, e falta transparência no que acontece depois.

O Cidade+ é isso: o morador tira uma foto, marca o local, e a ocorrência aparece no mapa para a comunidade e, no futuro, para a gestão da cidade.

O prazo de entrega do projeto é **26 de novembro de 2026**.

Passo a palavra para falar do que o app faz e das tecnologias.

---

## Pessoa 2 — O que o app faz e as tecnologias

*Na tela: telas do app, se tiverem. Senão, só narrar.*

O fluxo é este.

A pessoa cria uma conta com o **CEP de Santos**. O sistema descobre o **bairro**.  
Ela faz login, vê ocorrências no feed e no **mapa**, e pode abrir uma nova: **foto obrigatória** e **GPS**.

A regra principal: só dá para registrar **dentro do próprio bairro**. Isso roda no servidor, não só no celular.  
No mapa público aparece o problema, **não quem reportou**.  
Outras pessoas podem votar se é útil, se o problema continua ou se a informação está errada.

**Por que essas tecnologias:**

- **Expo e React Native**, para ter Android e iOS com o mesmo código e testar no celular sem gerar instalador o tempo todo.
- **Fastify** na API, em Node, para as regras ficarem no servidor.
- **PostgreSQL com PostGIS**, porque a gente precisa saber se o ponto está **dentro do polígono do bairro**, não só “perto”.
- **Prisma** para organizar o banco.
- **JWT** para login e papéis: cidadão, gestor e admin.

Sobre o **Docker**: não era 100% necessário. Dava para instalar o banco direto no Windows. Usamos mesmo assim para **ganhar experiência** com container e para o ambiente ficar igual para todo o time.

Passo a palavra para o status do que já está pronto.

---

## Pessoa 3 — O que já está feito, o que falta e o futuro

*Na tela: o app aberto, se der. Senão, só o resumo.*

**O que já está feito.**  
A fundação do projeto está de pé. Tem cadastro e login, CEP só de Santos, ocorrência com foto, geofence no bairro, mapa, voto da comunidade, API e testes. O app já abre no celular pelo Expo.

**O que ainda falta.**  
Painel para o gestor mudar o status pela web, polígonos oficiais da Prefeitura — hoje são dois bairros de teste —, e o envio de foto em nuvem de produção. Notificação no app ainda é só placeholder.

**Planos para o futuro.**  
Painel da gestão, dados oficiais da cidade, e só depois coisas como inteligência artificial, Gov.br e integração com a Prefeitura.

Em uma frase: o cidadão já consegue reportar com foto, no próprio bairro, e a cidade vê o problema — não a pessoa.

Obrigado. Ficamos abertos a perguntas.

---

## Se perguntarem

- **Docker de novo:** foi para aprender e padronizar. Não era exigência do MVP.
- **iPhone não abre:** na rede da faculdade o Expo costuma dar timeout; no Android na mesma rede costuma ir.
- **Conta de teste:** `admin@cidade.plus` / `admin1234`
