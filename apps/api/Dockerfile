# API do Cidade+ em produção (plano hospedagem-e-deploy).
# O contexto do build é a RAIZ do monorepo (o Prisma fica em /prisma, D-003):
#   docker build -f apps/api/Dockerfile -t cidade-plus-api .
# Portável: o mesmo container roda no Railway, Fly, AWS ECS/Lightsail ou numa VPS.
# Migrations NÃO rodam aqui: são o "pre-deploy" da plataforma (npx prisma migrate deploy).

FROM node:20-bookworm-slim AS base
# OpenSSL: exigido pelos engines do Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
# Manifests primeiro (cache das dependências). O package.json do mobile entra só para o
# npm validar o lockfile do workspace; as dependências do Expo NÃO são instaladas.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
# O postinstall da raiz roda "prisma generate": o schema precisa existir antes do npm ci.
COPY prisma ./prisma
RUN npm ci --workspace @cidade-plus/api --include-workspace-root --no-audit --no-fund
COPY apps/api ./apps/api
RUN npm run build -w @cidade-plus/api

FROM base AS runtime
ENV NODE_ENV=production
# Inclui o CLI do Prisma e o tsx (dependências da raiz) para o pre-deploy
# (prisma migrate deploy) e para rodar o seed uma vez pelo shell da plataforma.
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3333
CMD ["node", "apps/api/dist/server.js"]
