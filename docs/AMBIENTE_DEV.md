---
tipo: guia
atualizado: 2026-11-13
plano: "[[ambiente-e-builds]]"
---

# Guia do ambiente de desenvolvimento — Cidade+

> Como configurar o projeto do zero, desenvolver no dia a dia e gerar builds. Os comandos foram testados no Windows 11 + PowerShell em 2026-11-13. Rode todos a partir de `AppCidade-/`, salvo indicação.

## 1. Como as peças se encaixam

```text
 Celular (app Cidade+ dev build)                     Seu computador
 ┌──────────────────────────┐   JS/Fast Refresh    ┌─────────────────────────────┐
 │ runtime nativo SDK 54    │◀──── :8081 ──────────│ Metro (npm run dev:mobile)   │
 │ (câmera, GPS, mapa...)   │                      │                             │
 │ seu código JS/TS         │──── HTTP :3333 ─────▶│ API Fastify (npm run dev:api)│
 └──────────────────────────┘                      │        │ :5432              │
                                                   │        ▼                    │
                                                   │ Docker ▸ container Postgres │
                                                   │          16 + PostGIS       │
                                                   └─────────────────────────────┘
```

- **O app nunca fala com o Docker nem com o banco.** Ele chama só a API (porta 3333). A API fala com o banco.
- **O Docker roda apenas o banco** (PostgreSQL 16 + PostGIS, imagem `postgis/postgis:16-3.4`). A API e o Metro rodam direto no Node do Windows.
- O Docker existe para que todos usem o mesmo Postgres com PostGIS (necessário para o geofencing `ST_Contains`), sem instalar o PostgreSQL no Windows.

### Docker: o que é cada coisa
| Termo | O que é aqui |
|---|---|
| **Docker Desktop** | O programa do Windows. Precisa estar **aberto** para os containers rodarem |
| **Docker Engine** | O serviço que o Desktop inicia (em uma VM WSL2) e que executa os containers |
| **Container** | `cidade-plus-postgres`: o processo do Postgres rodando |
| **Volume** | `cidade_plus_pgdata`: onde os dados do banco ficam salvos. Sobrevive a `down` e a reinícios |
| **Docker Compose** | Lê o `docker-compose.yml` e cria/inicia/para o container com um comando (`npm run db:up`) |

### Quando o Docker precisa estar ligado
| Situação | Docker necessário? |
|---|---|
| Rodar a API / usar o app com dados reais | **Sim** |
| `npm test` (testes da API) | **Sim** |
| `prisma migrate`, `db:seed`, `db:studio` | **Sim** |
| Mexer só em telas, usando dados já carregados | Não para o Metro, mas o app mostra erro ao chamar a API sem banco |
| `npm run typecheck`, editar código, docs | Não |
| **Gerar build (EAS)** | **Não**: o build roda na nuvem da Expo e não usa o banco |

O container tem `restart: unless-stopped`: com o Docker Desktop aberto, ele volta sozinho depois de reiniciar o PC, a menos que você o pare com `db:down`.

## 2. Primeira configuração (uma vez por computador)

### 2.1 Programas
| Programa | Versão | Para quê |
|---|---|---|
| Node.js | 20 ou 22 LTS (testado: 22.13) | API, Metro, CLIs |
| npm | ≥ 10 (vem com o Node) | Gerenciador do monorepo (workspaces). **Não use yarn/pnpm** |
| Git | qualquer recente | |
| Docker Desktop | recente (testado: Engine 29.9) | Banco |
| EAS CLI | `npm i -g eas-cli` | Gerar builds na nuvem |
| Conta Expo | gratuita, em expo.dev | Builds EAS |
| **Não precisa** | Android Studio, JDK, Xcode, Mac | O build é feito no EAS |

### 2.2 Projeto
```powershell
git clone https://github.com/caiolikk/AppCidade-.git
cd AppCidade-
copy .env.example .env              # variáveis da API e do banco (valores de dev já servem)
copy apps\mobile\.env.example apps\mobile\.env   # opcional: variáveis do app
npm install                          # instala tudo e roda prisma generate
npm run db:up                        # Docker Desktop precisa estar aberto
npx prisma migrate deploy            # cria as tabelas + PostGIS
npm run db:seed                      # categorias, bairros de teste, contas admin/gestor
npm test                             # deve dar 6/6
```

### 2.3 Variáveis de ambiente
| Arquivo | Lido por | Variáveis |
|---|---|---|
| `.env` (raiz) | API, Prisma, Docker Compose | `POSTGRES_*`, `DATABASE_URL`, `API_HOST`, `API_PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLOUDINARY_*` (opcional), `SEED_*` |
| `apps/mobile/.env` | Expo/Metro e `app.config.js` | `EXPO_PUBLIC_API_URL` (opcional), `GOOGLE_MAPS_ANDROID_API_KEY` (build local) |
| Variáveis do EAS (`eas env:create`) | Builds na nuvem | `GOOGLE_MAPS_ANDROID_API_KEY`, `EXPO_PUBLIC_API_URL` (preview/produção) |

- O Expo **só lê o `.env` de `apps/mobile`**. Variáveis `EXPO_PUBLIC_*` na raiz não chegam ao app.
- Nada com `EXPO_PUBLIC_` pode ser secreto: o valor fica embutido no app.
- Os dois `.env` são ignorados pelo Git. Só os `.env.example` são versionados.

### 2.4 Primeiro development build
O development build é o "Expo Go do Cidade+": um app instalado com os módulos nativos exatos deste projeto (SDK 54).

```powershell
npm i -g eas-cli
eas login
cd apps\mobile
eas init          # cria/vincula o projeto na sua conta Expo (projectId)
```

Se o `eas init` avisar que não consegue gravar em configuração dinâmica, copie o `projectId` que ele mostrar para o `app.json`, dentro de `"expo"`:
`"extra": { "eas": { "projectId": "<id>" } }`. O `app.config.js` já repassa esse valor.

**Chave do Google Maps (Android):** fora do Expo Go, o mapa no Android exige uma chave própria. Sem ela, a aba Mapa não carrega e pode fechar o app.
1. No Google Cloud Console: crie um projeto, ative o **Maps SDK for Android** e crie uma API key. É preciso vincular uma conta de faturamento, mas o SDK mobile de mapas tem uso gratuito.
2. Restrinja a chave ao pacote `com.cidadeplus.app` e ao SHA-1 que aparece em `eas credentials` (Android).
3. Cadastre a chave no EAS (não no Git). O caminho mais simples é pelo site: expo.dev → projeto → **Environment variables** → `GOOGLE_MAPS_ANDROID_API_KEY`, marcando development, preview e production, com visibilidade *Sensitive*. Pela CLI: `eas env:create` (ela pergunta nome, valor e ambientes).

**Gerar e instalar (Android):**
```powershell
npm run build:dev:android     # na raiz; roda "eas build --profile development --platform android"
```
No fim, o EAS mostra um link/QR. Abra-o no celular, baixe o APK e instale (permita "instalar apps desconhecidos"). No plano gratuito, a fila pode levar de minutos a mais de 1 hora.

**iPhone:** exige uma conta **Apple Developer paga (US$ 99/ano)**. É uma exigência da Apple para instalar qualquer build fora da loja, mesmo pelo EAS. Com a conta:
```powershell
cd apps\mobile
eas device:create              # registra o iPhone (abre um link no aparelho)
npm run build:dev:ios          # na raiz
```
Instale pelo link do EAS e ative o **Modo de Desenvolvedor** no iPhone (Ajustes → Privacidade e Segurança). Sem a conta paga e sem Mac, a única opção para o iPhone é o Expo Go (ver §5).

## 3. Desenvolvimento diário

```powershell
# 1. Abra o Docker Desktop (ou deixe-o iniciar com o Windows)
npm run db:up            # 2. banco (se já estiver rodando, não faz nada)
npm run dev:api          # 3. terminal A: API em http://<seu-ip>:3333 (deixe aberto)
npm run dev:mobile       # 4. terminal B: Metro em modo development build (deixe aberto)
```
5. No celular (mesmo Wi-Fi), abra o app **Cidade+** (o dev build, não o Expo Go). Ele lista os servidores Metro da rede; toque no seu, ou escaneie o QR do terminal B.
6. Edite o código: o Fast Refresh aplica a mudança na hora. `r` no terminal B recarrega; `m` abre o menu de dev.

**O que precisa ficar aberto:** Docker Desktop + terminal da API + terminal do Metro. O resto pode ser fechado.

**Encerrar:**
```powershell
Ctrl+C nos terminais A e B
npm run db:down          # para o container. Os dados ficam no volume
```

**Celular não conecta?** O Windows Firewall precisa liberar as portas **3333** (API) e **8081** (Metro) na rede privada; confira se o Wi-Fi está marcado como "Privada". Alternativa para o Metro: `npm run dev:mobile:tunnel`. A API continua precisando da rede local, ou defina `EXPO_PUBLIC_API_URL` em `apps/mobile/.env`.

### Comandos do Docker/banco
| Ação | Comando |
|---|---|
| Iniciar o banco | `npm run db:up` |
| Ver containers ativos | `npm run db:ps` (ou `docker ps`) |
| Logs do banco | `npm run db:logs` (Ctrl+C sai) |
| Reiniciar o banco | `docker compose restart postgres` |
| Parar o banco (mantém dados) | `npm run db:down` |
| Aplicar migrations | `npx prisma migrate deploy` (nova migration em dev: `npm run db:migrate`) |
| Ver os dados | `npm run db:studio` → http://localhost:5555 |
| ⚠ Apagar **todos** os dados | `docker compose down -v` + migrate + seed. Só com intenção |
| Reconstruir imagens | Não se aplica: o projeto usa a imagem pronta `postgis/postgis:16-3.4`. Para atualizá-la: `docker compose pull` |

## 4. Quando preciso gerar um novo build?

Regra: **se mudou JavaScript/TypeScript, não precisa. Se mudou algo nativo, precisa.**

| Mudança | Novo build? | O que fazer |
|---|---|---|
| Telas, componentes, navegação (Expo Router) | Não | Fast Refresh |
| Estilos, textos, cores | Não | Fast Refresh |
| Chamadas à API, hooks, stores | Não | Fast Refresh |
| Mudança na API/banco | Não | Reiniciar só a API (o `tsx watch` já faz isso) |
| Dependência **JS pura** (ex.: `date-fns`, `zod`) | Não | `npm install` + reiniciar o Metro |
| `EXPO_PUBLIC_*` em `apps/mobile/.env` | Não | Reiniciar o Metro (`npm run dev:mobile -- --clear`) |
| Dependência **com código nativo** (`expo-*` com módulo nativo, `react-native-*`) | **Sim** | `npx expo install <pkg>` em `apps/mobile` + novo build |
| Novo SVG/PNG em `apps/mobile/assets/figma/` | Não | Fast Refresh (o SVG vira componente JS) |
| Mudança no `metro.config.js` | Não | Reiniciar o Metro com `npm run dev:mobile -- --clear` |
| Permissões, plugins no `app.json`, ícone, splash, nome, `scheme`, `package` | **Sim** | Novo build |
| Chave do Google Maps | **Sim** | Novo build |
| Atualizar o Expo SDK | **Sim** (e atualizar o projeto) | Plano próprio; só quando necessário |

Dica: em caso de dúvida, rode `npx expo install --check` e `npx expo-doctor` em `apps/mobile`.

## 5. Comparação das alternativas

| Alternativa | Vantagens | Desvantagens | Dependência de versões |
|---|---|---|---|
| **Expo Go** | Zero build; instala da loja | Só os módulos nativos que vêm no Expo Go; não personaliza o app; o mapa usa a chave da Expo | **Alta**: cada versão da loja roda 1 SDK. Ao atualizar, o projeto quebra até migrar. No iOS não dá para fixar a versão |
| **Development Build** (`expo-dev-client`) | App próprio com os módulos nativos exatos do projeto; Fast Refresh igual ao Expo Go; não quebra com updates de loja | Precisa de 1 build inicial e de um novo build a cada mudança nativa; iPhone exige conta Apple paga | **Baixa**: o runtime fica fixo no SDK do projeto até você decidir atualizar |
| **EAS Build** (forma de compilar) | Compila Android e iOS na nuvem, sem Android Studio nem Mac; gerencia certificados | Fila lenta no plano gratuito; limite de 15 builds Android + 15 iOS no Free; o pago custa a partir de US$ 19/mês | Usa as versões do `package.json`/lockfile |
| **Build nativo local** (`expo run:android`) | Sem fila e sem custo | Exige Android Studio + JDK (não instalados aqui). **iOS exige Mac** | Igual ao dev build |

O Development Build é **o tipo de app**; o EAS Build é **onde ele é compilado**. A estratégia adotada usa os dois juntos.

**Expo Go como fallback:** `npm run dev:mobile:go` só funciona se o Expo Go do aparelho suportar o **SDK 54**.

## 6. Builds de teste e de produção

| Perfil (`apps/mobile/eas.json`) | Uso | Comando |
|---|---|---|
| `development` | Dev client + Metro (dia a dia) | `npm run build:dev:android` / `build:dev:ios` |
| `preview` | APK standalone para mostrar o app (sem Metro) | `npm run build:preview:android` |
| `production` | Lojas (AAB/IPA, versão autoincrementada) | `npm run build:prod -w @cidade-plus/mobile` |

**Limitação atual:** preview e produção não têm Metro para descobrir o IP da API. Defina `EXPO_PUBLIC_API_URL` no ambiente EAS correspondente. Como hoje a API só roda no seu computador e em HTTP, esses builds só funcionam na mesma rede e ainda precisariam de liberação de HTTP sem TLS. Na prática, eles só fazem sentido depois que a API for hospedada com HTTPS.

## 7. Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | O Docker Desktop está fechado. Abra-o e espere o "Engine running" |
| `Port 5432 is already in use` | Há um Postgres instalado no Windows. Pare-o ou mude `POSTGRES_PORT` e `DATABASE_URL` no `.env` |
| API: `Environment variable not found: DATABASE_URL` / Zod error | Falta o `.env` na raiz (`copy .env.example .env`) |
| API: `ERR_MODULE_NOT_FOUND ... upload.routes` | Clone antigo sem a correção P-001 ([[PROBLEMS]]) |
| Metro: `Port 8081 is being used` | Já há um `expo start` aberto. Use-o ou feche-o |
| App: "Network request failed" | API parada, celular em outra rede ou firewall bloqueando a porta 3333 |
| Expo Go: "Project is incompatible with this version of Expo Go" | Esperado quando a loja atualiza. Use o dev build |
| Build: duplicate native module | `npx expo-doctor`; ver [[PROBLEMS]] P-006 |
| App fecha ao abrir: `RNSVG...`, `ExpoLinearGradient` ou `ExpoBlur` não encontrado | Development build antigo (anterior à D-020). Instale o build novo |
| `npm install` falha com EPERM no `prisma generate` | API rodando segura a DLL do Prisma. Ver [[PROBLEMS]] P-010 |
| Comportamento estranho após trocar de branch | `npm install` e `npm run dev:mobile -- --clear` |
