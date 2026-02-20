# CWLLMv

Chatwork連携を前提にした営業支援アプリケーションです。  
`frontend`（React + Vite）と `backend`（Fastify + Prisma）で構成されています。

## 構成

- `frontend/`: UI
- `backend/`: API / バッチ
- `infra/`: ローカル開発用の Docker Compose（PostgreSQL / Redis）
- `docs/ChatWork_API仕様.md`: Chatwork API 仕様メモ

## ローカル起動

1. 環境変数を作成

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

2. DB / Redis 起動

```bash
npm run dev:db
```

3. バックエンド起動

```bash
npm run dev:backend
```

4. フロントエンド起動

```bash
npm run dev:frontend
```

## テスト

```bash
npm --prefix backend test -- --run
npm --prefix frontend test -- --run
```

## 補足

- Chatwork API の詳細は `docs/ChatWork_API仕様.md` を参照してください。
