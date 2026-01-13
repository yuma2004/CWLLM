# 技術スタック

## 構成
- Backend: Node.js 18, TypeScript, Fastify, Prisma, Postgres, BullMQ/Redis, Vitest, ESLint
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Vitest, Playwright, ESLint
- Infra: Docker Compose (Postgres)

## セットアップ
- npm --prefix backend ci
- npm --prefix frontend ci

## Lint
- npm --prefix backend run lint
- npm --prefix frontend run lint

## Typecheck
- npm --prefix frontend run typecheck
- Backend は build で型チェックを含む: npm --prefix backend run build

## Test
- npm --prefix backend run test -- --run (watch無効)
- npm --prefix frontend run test -- --run (watch無効)
- npm --prefix frontend run test:e2e (CHATWORK_API_* が必要)

## Build
- npm --prefix backend run build
- npm --prefix frontend run build

## Dev / Local
- npm run dev
- npm --prefix backend run dev
- npm --prefix frontend run dev
- docker compose -f infra/docker-compose.yml up -d

## 既定の検証順
- docker compose -f infra/docker-compose.yml up -d (ローカルDB起動)
- npm --prefix frontend run typecheck (PASS)
- npm --prefix backend run lint (PASS)
- npm --prefix backend run test -- --run (PASS)
- npm --prefix frontend run test -- --run (PASS)
