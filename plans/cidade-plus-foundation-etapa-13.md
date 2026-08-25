# Cidade+ — Relatório da ETAPA 13 (fundação)

**Data:** 2026-08-24  
**Repositório:** `AppCidade-`

## Escopo encerrado neste corte

| Etapa | Entrega |
|---|---|
| 0–8, 12 | API Fastify, Prisma/PostGIS, auth, ViaCEP, geofence, ocorrências, avaliações |
| 9–11 | Expo Router, login/cadastro, SecureStore, feed e mapa públicos |
| 8 (upload) | `POST /uploads/image` — Cloudinary se houver chaves; disco local caso contrário |
| 12 (app) | Tela de ocorrência com voto `UTIL` / `PERSISTE` / `INCORRETA` |
| 13 | Testes automatizados da API + onboarding no README |

## Regras cobertas pelos testes (`npm test`)

- `GET /health`
- CEP fora de Santos recusado
- Cadastro com CEP `11030000` associa bairro (Ponta da Praia via ViaCEP)
- Geofence: ponto no bairro 200; fora 403 com mensagem amigável
- Ocorrência sem foto 400
- Upload autenticado de imagem
- DTO público sem CPF, autor ou URL original
- Segundo voto 409
- Upload sem token 401; cidadão em rota admin 403

## O que ficou de fora (evolução)

- Polígonos oficiais da Prefeitura (seed usa bboxes aproximados)
- Refresh token completo (JWT ~15 min)
- Painel web de gestão
- Push, IA, Gov.br, Cloudinary em produção (precisa das chaves)
- Suíte E2E no Expo Go

## Como validar no celular

1. Docker + `npm run dev:api` + `npm run dev:mobile`
2. Login seed ou cadastro com CEP de Santos
3. Home/mapa com ocorrências públicas
4. `+` → foto + GPS; só registra dentro do bairro
5. Abrir uma ocorrência e votar
