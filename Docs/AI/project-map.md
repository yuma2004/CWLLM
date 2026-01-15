# プロジェクトマップ

```
CWLLM_Ver1/
  backend/
    src/
      index.ts
      worker.ts
      config/
      middleware/
      routes/
      services/
      types/
      utils/
      test/
    prisma/
      schema.prisma
      seed.ts
      migrations/
    docker/entrypoint.sh
    dist/
    package.json
    vitest.config.ts
  frontend/
    src/
      main.tsx
      App.tsx
      pages/
      components/
      hooks/
      contexts/
      lib/
      types/
      utils/
      test/
    e2e/
    dist/
    package.json
    playwright.config.ts
    vite.config.ts
  infra/
    docker-compose.yml
    scripts/
      backup.ps1
      restore.ps1
  scripts/
    dev.mjs
    create-ai-review-zip.ps1
  Docs/
    要件定義書.md
    ChatWork_API仕様.md
    refactor/frontend/plan.md
    refactor/frontend/todo.md
  docker-compose.prod.yml
  render.yaml
  package.json
  README.md
  .env
  .env.example
```

- バックエンド: Fastify + Prisma + BullMQ。エントリは`backend/src/index.ts`、ワーカーは`backend/src/worker.ts`、APIルートは`backend/src/routes`。
- フロントエンド: React + Vite + Tailwind。エントリは`frontend/src/main.tsx`、ページは`frontend/src/pages`。
- テスト: バックエンドはVitest、フロントエンドはVitest + Playwright（`frontend/e2e`）。
- インフラ/デプロイ: `infra/docker-compose.yml`, `docker-compose.prod.yml`, `render.yaml`。
