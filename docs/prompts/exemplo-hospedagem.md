---
tipo: exemplo-de-prompt
atualizado: 2026-11-17
---

# Exemplo de referência: mensagem informal → prompt melhorado

> Usado pela skill `melhorar-prompt` (D-029) como padrão de qualidade. Ao melhorar uma mensagem, mire neste nível de detalhe, ajustando o tamanho à tarefa. Modelo genérico: [[PROMPT_TEMPLATE]].

## O que observar neste exemplo
- **Nenhuma dúvida do usuário sumiu.** Cada pergunta da mensagem virou uma seção ou uma pergunta numerada:
  - onde hospedar barato;
  - o Bem-vindo.net;
  - a AWS depois;
  - monorepo × repositórios separados;
  - hospedar junto muda algo?;
  - CI/CD na `main`;
  - "só plano e dúvidas".
- **O modo virou regra explícita.** "Nesse primeiro momento quero apenas traçar um plano" virou "**Não quero implementar nada agora**" e a seção de restrições obrigatórias.
- **A opção sugerida pelo usuário não foi tratada como resposta.** "Não considere essa opção automaticamente a melhor".
- **Auditoria antes de recomendar**, por camada.
- **Regras de honestidade:**
  - fontes oficiais;
  - "não invente valores/comandos";
  - promocional × renovação;
  - confirmado × hipótese.
- **Exceção a uma regra do projeto:** o prompt pede `plano.md`. Pelo `AGENTS.md`, isso vira `plans/<tema>.md`, e foi assim que ele foi atendido (`plans/hospedagem-e-deploy.md`).
- **Entregável e relatório final enumerados**, e um "resultado esperado" de uma frase.

## Mensagem original do usuário

> ok então faça um plano de hospedagem com passo a passo e me recomende algum lugar para hospedalo nossa ideia nesse primeiro momento é hospedar em algum lugar mais barato e simples como o https://www.bem-vindo.net/ e apos a apresentação e melhorarmos o app talvez hospedar em uma aws, queria tambem tirar uma duvida sobre a api, ja trabalhei em projetos que o front e o backend(api) eram em repositorios separados, esse projeto cidade+ a api e front foram criados na mesma pasta, queria entender a diferença de fazer separado e juntos e pontos positivos e negativo e queria saber tambem se na hora de hospedar muda alguma coisa hospedar tudo junto como isso funciona, e queria saber tambem como fazer uma pipeline de deploy pra quando alguma mudança for feita na main ja mudar automatica no projeto que esta rodando hospedado (ci/cd) nesse primeiro momento quero apenas traçar um plano com passo a passo e tirar duvidas

## Prompt melhorado

# Planejamento de hospedagem, arquitetura de repositórios e CI/CD do Cidade+

## 1. Papel e objetivo

Atue como um Engenheiro de Software / DevOps com experiência em infraestrutura, hospedagem de aplicações, arquitetura de sistemas, Docker, pipelines CI/CD e deploy de aplicações mobile e web.

Quero começar a planejar a hospedagem do Cidade+, entender melhor como nossa arquitetura atual funciona e definir um processo de deploy automatizado para o projeto.

Neste primeiro momento, quero apenas uma auditoria técnica, pesquisa de alternativas, explicações e um planejamento detalhado com passo a passo.

**Não quero implementar nada agora.**

O objetivo é terminar esta etapa sabendo:

- Onde podemos hospedar o Cidade+ inicialmente gastando pouco.
- Como publicar o frontend, a API e o banco de dados.
- Como funciona a estrutura atual, na qual frontend e backend estão no mesmo repositório.
- Quais seriam as vantagens e desvantagens de separar frontend e backend em repositórios diferentes.
- Se a estrutura atual interfere na hospedagem.
- Como configurar futuramente uma pipeline CI/CD para atualizar automaticamente a aplicação hospedada sempre que houver alterações na branch `main`.
- Como migrar futuramente para uma infraestrutura mais robusta, como AWS, sem precisar reconstruir todo o projeto.

## 2. Contexto e cenário do projeto

O Cidade+ é um aplicativo de participação cidadã desenvolvido com frontend e backend na mesma estrutura de projeto.

Nossa intenção é disponibilizar uma primeira versão funcional para apresentação e testes.

Nesse primeiro momento, não queremos gastar muito com infraestrutura. Procuramos uma solução simples, econômica e que não exija uma configuração excessivamente complexa.

Uma das opções que queremos avaliar é:

- [Bem-vindo.net](https://www.bem-vindo.net/)

Entretanto, não quero que você considere essa opção automaticamente a melhor. Pesquise outras alternativas e compare o custo-benefício.

Nossa estratégia inicial é:

**Primeira etapa:**
- Hospedar o projeto em uma infraestrutura barata e simples.
- Disponibilizar a API e os serviços necessários.
- Garantir que o aplicativo consiga consumir a API pela internet.
- Ter um ambiente estável para apresentação e testes.

**Etapa futura:**
- Melhorar o aplicativo.
- Aumentar a quantidade de usuários.
- Evoluir a infraestrutura conforme a necessidade.
- Considerar uma migração para AWS ou outra solução mais robusta.

A infraestrutura inicial precisa ser simples, mas não deve criar dificuldades desnecessárias para uma futura migração.

## 3. Auditoria da arquitetura atual

Antes de recomendar qualquer hospedagem, analise a estrutura real do repositório.

Consulte o Obsidian, os documentos de arquitetura, os planejamentos existentes em `plans` e o código-fonte.

Identifique:

### 3.1. Frontend

- Qual tecnologia e framework são utilizados.
- Se é uma aplicação Expo / React Native.
- Como o frontend consome a API.
- Como são configuradas as URLs dos serviços.
- Como são gerenciadas as variáveis de ambiente.
- Se existe alguma necessidade de hospedagem web além da disponibilização do aplicativo mobile.
- Como funciona a comunicação com serviços externos.

### 3.2. Backend / API

- Qual tecnologia é utilizada.
- Qual framework ou servidor HTTP está sendo utilizado.
- Qual é o comando de inicialização.
- Qual é o comando de build, caso exista.
- Como funciona a configuração de ambiente.
- Como são tratados os arquivos enviados pelos usuários.
- Como a API se conecta ao banco de dados.
- Quais portas e serviços são utilizados.
- Se existem dependências de serviços externos.
- Se a aplicação já possui configuração adequada para produção.

### 3.3. Banco de dados

- Qual banco de dados é utilizado.
- Se existe Docker para executá-lo localmente.
- Como são executadas as migrations.
- Como os dados são persistidos.
- Se existem extensões ou recursos específicos, como PostGIS.
- Quais são os requisitos para disponibilizar o banco em produção.
- Como funcionariam backups e restauração.

### 3.4. Docker e infraestrutura local

Analise os arquivos de Docker e Docker Compose existentes.

Identifique:

- Quais serviços são executados em containers.
- Quais serviços dependem de outros.
- Quais portas precisam ser expostas.
- Como funcionam volumes, redes e variáveis de ambiente.
- Se a configuração atual pode ser reaproveitada em produção.
- O que precisaria ser alterado para executar o projeto em um servidor externo.

Não presuma que todos os serviços precisam ser hospedados no mesmo servidor.

Ao final, apresente um diagrama da arquitetura atual, indicando como frontend, API, banco de dados e demais serviços se comunicam.

## 4. Pesquisa e recomendação de hospedagem

Quero que você pesquise opções de hospedagem adequadas ao cenário inicial do Cidade+.

Comece avaliando a [Bem-vindo.net](https://www.bem-vindo.net/) e procure alternativas que ofereçam uma boa relação entre preço, simplicidade e capacidade técnica.

Considere soluções como:

- Hospedagem VPS.
- Servidores cloud.
- Plataformas de deploy de aplicações.
- Hospedagem gerenciada de banco de dados.
- Serviços que ofereçam Docker e Docker Compose.
- Serviços gratuitos ou com planos de entrada, caso sejam realmente adequados.

Você pode considerar provedores como Hostinger, Hetzner, DigitalOcean, Oracle Cloud, Render, Railway, Fly.io e outros que encontrar relevantes. Não se limite a essa lista.

### 4.1. Critérios de comparação

Compare as opções considerando:

| Critério | O que avaliar |
|---|---|
| Preço | Custo mensal e anual |
| Facilidade | Complexidade para configurar e administrar |
| Docker | Suporte a containers e Docker Compose |
| API | Possibilidade de hospedar nosso backend |
| Banco de dados | Suporte a PostgreSQL e PostGIS, se necessário |
| Armazenamento | Persistência de arquivos e volumes |
| SSL | Disponibilidade de HTTPS |
| Domínio | Facilidade para configurar domínio próprio |
| Backup | Recursos e custos de backup |
| Escalabilidade | Possibilidade de aumentar recursos |
| CI/CD | Facilidade de integração com GitHub |
| Limitações | Restrições de CPU, RAM, armazenamento, tráfego e execução |

Pesquise os preços atuais e utilize preferencialmente páginas oficiais dos provedores.

Não invente valores. Informe a moeda, periodicidade, recursos incluídos e eventuais condições promocionais.

Diferencie:

- Preço promocional.
- Preço de renovação.
- Custo de serviços adicionais.
- Custo de tráfego, armazenamento ou banco de dados, quando aplicável.

### 4.2. Recomendação final

Apresente pelo menos três opções:

1. **Mais econômica:** adequada para disponibilizar uma primeira versão do Cidade+.
2. **Melhor custo-benefício:** equilíbrio entre preço, recursos e facilidade.
3. **Mais preparada para crescer:** uma opção que facilite a evolução futura.

Ao final, escolha uma recomendação principal e justifique tecnicamente.

Não recomende uma hospedagem apenas porque possui o menor preço. Considere também a estabilidade, os recursos disponíveis e a compatibilidade com nossa arquitetura.

## 5. Como funcionaria a hospedagem do Cidade+

Depois de escolher a opção recomendada, explique como seria a arquitetura de produção.

Quero entender se seria possível hospedar todos os serviços em um único servidor ou se seria melhor separar alguns deles.

Considere cenários como:

### Cenário A — Tudo em um único servidor

- API.
- Banco de dados.
- Serviços auxiliares.
- Docker Compose para organizar os containers.

Explique as vantagens, desvantagens, limitações e riscos dessa abordagem.

### Cenário B — Serviços separados

- API em um servidor ou plataforma de hospedagem.
- Banco de dados em um serviço gerenciado.
- Arquivos e imagens em armazenamento externo.
- Frontend mobile consumindo a API pela internet.

Explique quando essa abordagem passa a fazer mais sentido e se o custo adicional é justificável neste momento.

### Cenário C — Outra arquitetura recomendada

Caso exista uma alternativa mais adequada ao projeto, apresente-a.

Para cada cenário, explique:

- Como os serviços se comunicariam.
- Onde ficariam os dados.
- Como seriam configuradas as URLs.
- Como funcionariam as variáveis de ambiente.
- Como seriam tratados os arquivos enviados pelos usuários.
- Quais seriam os pontos de atenção relacionados à segurança.
- Quanto custaria aproximadamente.

## 6. Entender a estrutura de repositórios: frontend e backend juntos ou separados

Tenho uma dúvida sobre a arquitetura atual do Cidade+.

Já trabalhei em projetos nos quais o frontend e o backend/API ficavam em repositórios Git separados.

No Cidade+, os dois foram criados dentro da mesma pasta e fazem parte do mesmo repositório.

Quero entender profundamente a diferença entre essas duas abordagens.

### 6.1. Monorepo

Explique o que é um monorepo e como ele funciona.

Analise a estrutura atual do Cidade+ e verifique se ela pode ser considerada um monorepo ou apenas um projeto com frontend e backend organizados em diretórios diferentes.

Explique:

- Como ficam os commits.
- Como funcionam as branches.
- Como são organizadas as dependências.
- Como são feitas alterações simultâneas no frontend e backend.
- Como funciona o versionamento.
- Como seria o processo de deploy.
- Quais são as vantagens e desvantagens.

### 6.2. Repositórios separados

Explique como funcionaria uma arquitetura com:

- Um repositório exclusivo para o frontend.
- Um repositório exclusivo para a API/backend.

Analise:

- Como seriam os commits e branches.
- Como seria o desenvolvimento simultâneo.
- Como frontend e backend manteriam compatibilidade.
- Como seriam compartilhados tipos, contratos e documentação.
- Como funcionaria o versionamento da API.
- Como seriam configurados os pipelines de deploy.

### 6.3. Comparação prática

Apresente uma comparação objetiva:

| Aspecto | Monorepo | Repositórios separados |
|---|---|---|
| Organização | | |
| Desenvolvimento | | |
| Commits | | |
| Versionamento | | |
| CI/CD | | |
| Deploy | | |
| Manutenção | | |
| Escalabilidade da equipe | | |
| Complexidade | | |

Quero entender principalmente:

1. Ter frontend e backend juntos dificulta a hospedagem?
2. É possível hospedar os dois separadamente mesmo estando no mesmo repositório?
3. É possível fazer deploy apenas da API quando ela muda, sem precisar publicar novamente o frontend?
4. É possível fazer deploy do frontend sem reconstruir a API?
5. Existe alguma vantagem real em separar os repositórios agora?
6. Qual abordagem você recomenda para o estágio atual do Cidade+?

**Não recomende separar os repositórios apenas por ser uma prática comum em outros projetos.** Avalie se existe uma necessidade técnica ou organizacional real.

## 7. Planejamento de CI/CD e deploy automático

Quero entender como criar uma pipeline para que as alterações realizadas na branch `main` sejam publicadas automaticamente no ambiente de produção.

A ideia é que o fluxo futuro seja:

1. Os desenvolvedores trabalham em branches próprias.
2. As alterações são enviadas para o GitHub.
3. É criado um Pull Request para a `main`.
4. O código passa por verificações e testes.
5. Após a aprovação e o merge na `main`, a pipeline é executada.
6. O sistema realiza o build da aplicação.
7. A nova versão é publicada na hospedagem.
8. O ambiente de produção passa a executar a versão atualizada.

Quero avaliar o uso do GitHub Actions, mas você pode recomendar outra ferramenta se houver uma vantagem relevante.

### 7.1. Pipeline da API

Explique como seria o processo de:

- Detectar alterações relevantes no backend.
- Instalar dependências.
- Executar lint e testes.
- Realizar o build, caso necessário.
- Executar migrations de maneira controlada.
- Publicar a nova versão.
- Reiniciar os serviços sem indisponibilidade desnecessária.
- Verificar se a API voltou a funcionar corretamente.

### 7.2. Pipeline do frontend

Analise como o deploy do frontend funcionaria considerando que o projeto utiliza Expo / React Native, caso isso seja confirmado na auditoria.

É importante diferenciar:

- Publicação de uma API.
- Atualização de uma aplicação web.
- Geração de um novo build Android.
- Geração de um novo build iOS.
- Distribuição de atualizações OTA, quando compatível.

Quero entender se uma alteração na branch `main` poderia atualizar automaticamente o aplicativo instalado no celular ou se seria necessário gerar e distribuir uma nova versão.

Explique as possibilidades com EAS Build, EAS Update ou outras ferramentas, caso sejam adequadas à estrutura real do projeto.

Não confunda deploy da API com publicação de uma nova versão do aplicativo mobile.

### 7.3. Pipeline no monorepo

Como frontend e backend estão no mesmo repositório, avalie uma pipeline inteligente que identifique quais partes foram modificadas.

Exemplo:

- Se apenas arquivos da API forem alterados, executar somente o pipeline de backend.
- Se apenas arquivos do frontend forem alterados, executar somente o pipeline correspondente.
- Se houver alterações compartilhadas, executar os processos necessários.

Explique como isso poderia ser implementado com GitHub Actions e filtros de caminhos.

Avalie também como tratar alterações em arquivos compartilhados, dependências, configurações e Docker Compose.

### 7.4. Segurança da pipeline

Explique como proteger:

- Credenciais da hospedagem.
- Chaves SSH.
- Tokens do GitHub.
- Senhas do banco de dados.
- Variáveis de ambiente de produção.
- Segredos utilizados pelo frontend e backend.

Considere o uso de GitHub Secrets e outras práticas necessárias.

Não exponha segredos no repositório ou nos logs da pipeline.

### 7.5. Segurança e confiabilidade do deploy

Avalie também:

- O que acontece se o build falhar.
- O que acontece se o deploy falhar.
- Como evitar publicar uma versão quebrada.
- Como voltar para a versão anterior.
- Como realizar migrations sem perder dados.
- Como verificar a saúde da aplicação após o deploy.
- Como evitar indisponibilidade durante a atualização.

Apresente um fluxo recomendado de CI/CD e um diagrama Mermaid.

## 8. Plano de implementação da hospedagem: passo a passo

Depois da auditoria e das comparações, quero um guia de implementação futuro, utilizando a hospedagem que você recomendar.

O guia deve ser suficientemente detalhado para que possamos executá-lo posteriormente.

Organize as etapas em ordem cronológica.

Exemplo de estrutura:

**Etapa 1 — Preparação do projeto**
- Verificar configurações de produção.
- Identificar variáveis de ambiente.
- Revisar Docker e Docker Compose.
- Conferir comandos de build e inicialização.
- Verificar migrations.

**Etapa 2 — Preparação da hospedagem**
- Criar a conta.
- Contratar ou configurar o servidor.
- Configurar acesso SSH.
- Preparar o ambiente.
- Instalar dependências necessárias.

**Etapa 3 — Publicação dos serviços**
- Configurar o backend.
- Configurar o banco de dados.
- Configurar armazenamento de arquivos.
- Configurar domínio e DNS.
- Configurar HTTPS.
- Publicar a API.

**Etapa 4 — Configuração do aplicativo**
- Configurar a URL de produção da API.
- Ajustar variáveis de ambiente.
- Garantir que o aplicativo consiga consumir a API publicada.
- Testar autenticação, ocorrências, imagens e demais funcionalidades importantes.

**Etapa 5 — Configuração de CI/CD**
- Criar workflow no GitHub Actions.
- Configurar secrets.
- Configurar execução de testes.
- Configurar deploy automático.
- Validar o fluxo com uma alteração controlada na `main`.

**Etapa 6 — Operação e manutenção**
- Configurar backups.
- Monitorar disponibilidade.
- Acompanhar logs.
- Atualizar dependências.
- Testar restauração do banco.
- Definir procedimento de rollback.

Para cada etapa, explique:

- O que precisa ser feito.
- Por que é necessário.
- Onde deve ser feito.
- Quais ferramentas serão utilizadas.
- Quais configurações serão necessárias.
- Como verificar se a etapa foi concluída corretamente.
- Quais cuidados devem ser tomados.

Inclua os comandos de terminal necessários quando já for possível defini-los com segurança a partir da estrutura real do projeto. Não invente comandos sem verificar os scripts e arquivos existentes.

## 9. Planejamento de evolução futura para AWS

Nossa ideia é começar com uma hospedagem econômica e, depois da apresentação e de novas melhorias no aplicativo, avaliar uma migração para AWS.

Quero entender como preparar o projeto desde o início para facilitar essa evolução.

Analise:

- Quais componentes poderiam ser migrados.
- Quais serviços AWS seriam adequados para cada necessidade.
- Se faria sentido utilizar EC2, ECS, ECR, RDS, S3, CloudFront ou outros serviços.
- Como funcionaria a migração do banco de dados.
- Como migrar os arquivos enviados pelos usuários.
- Como manter domínio, HTTPS e variáveis de ambiente.
- Como evitar dependência excessiva do provedor inicial.
- Quais custos e complexidades adicionais a AWS traria.

Não quero uma arquitetura AWS complexa agora. Quero apenas entender um possível caminho de evolução e quais decisões devemos tomar desde já para não dificultar a migração.

## 10. Entregável: plano.md

Crie ou atualize um documento `plano.md` na pasta `plans`.

Antes de criar um arquivo novo, consulte os planejamentos existentes e verifique se já existe algum documento sobre hospedagem, infraestrutura, Docker ou CI/CD. Evite duplicar planejamentos relacionados.

O documento deverá conter:

1. Diagnóstico da arquitetura atual.
2. Diagrama da infraestrutura atual.
3. Comparação entre opções de hospedagem.
4. Pesquisa de preços e limitações atuais.
5. Recomendação de hospedagem inicial.
6. Arquitetura de produção recomendada.
7. Explicação sobre monorepo e repositórios separados.
8. Recomendação sobre manter ou separar os repositórios.
9. Planejamento da pipeline CI/CD.
10. Estratégia de deploy independente para frontend e backend, se aplicável.
11. Segurança e gerenciamento de variáveis de ambiente.
12. Guia de hospedagem passo a passo.
13. Estratégia de backups, monitoramento e rollback.
14. Plano de evolução e possível migração para AWS.
15. Estimativa de custos.
16. Riscos, limitações e decisões pendentes.

Inclua diagramas Mermaid quando ajudarem a explicar a arquitetura, a comunicação entre serviços e os fluxos de deploy.

Inclua links das fontes oficiais consultadas, especialmente para preços, documentação de hospedagem, Docker, GitHub Actions e serviços de infraestrutura.

Diferencie claramente:
- O que foi identificado no código atual.
- O que foi pesquisado externamente.
- O que é uma recomendação.
- O que ainda depende de uma decisão nossa.

## 11. Restrições obrigatórias

**ESTA ETAPA É EXCLUSIVAMENTE DE AUDITORIA, PESQUISA, EXPLICAÇÃO E PLANEJAMENTO.**

Não quero nenhuma implementação neste momento.

Portanto:

- Não modificar código.
- Não alterar configurações do projeto.
- Não modificar Dockerfiles ou Docker Compose.
- Não criar workflows no GitHub Actions.
- Não criar ou alterar variáveis de ambiente.
- Não instalar dependências.
- Não criar contas em provedores.
- Não contratar serviços.
- Não realizar deploy.
- Não modificar banco de dados.
- Não executar migrations.
- Não alterar a estrutura dos repositórios.

A única alteração permitida é a criação ou atualização da documentação de planejamento na pasta `plans`.

Se identificar ajustes necessários para preparar o projeto para produção, apenas documente o que precisa ser feito e em qual etapa deverá ser realizado.

## 12. Relatório final

Ao concluir, apresente:

- Como funciona a arquitetura atual do Cidade+.
- Qual hospedagem você recomenda para começar e por quê.
- Quanto custaria aproximadamente por mês.
- Como frontend, API e banco de dados ficariam hospedados.
- Se devemos manter frontend e backend no mesmo repositório.
- Como funcionaria o deploy independente de cada parte.
- Como seria a pipeline automática após alterações na `main`.
- Quais seriam os passos para colocar o projeto no ar.
- Como poderíamos evoluir futuramente para AWS.
- Quais limitações ou pendências precisam ser resolvidas antes da publicação.
- Onde o `plano.md` foi criado ou atualizado.
- Confirmação explícita de que nenhuma implementação ou alteração de infraestrutura foi realizada.

**Resultado esperado:** quero terminar essa etapa entendendo como o Cidade+ poderá sair do ambiente local e funcionar na internet, com uma hospedagem inicial econômica, uma arquitetura organizada e um processo de deploy automatizado que permita atualizar o sistema com segurança sempre que novas alterações forem integradas à `main`.
