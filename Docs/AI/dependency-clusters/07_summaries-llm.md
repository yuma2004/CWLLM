# クラスター07: サマリー・LLM

## 目的/範囲
- メッセージからサマリー下書き生成
- サマリー保存・一覧取得
- サマリー本文からタスク候補抽出

## 依存関係
- LLM（OpenAI API または Mock）
- BullMQ/Redis（サマリー下書きジョブ）
- Prisma（SummaryDraft, Summary, Message, Company）

## バックエンド構成
- `backend/src/routes/summaries.ts`
- `backend/src/routes/summaries.handlers.ts`
- `backend/src/routes/summaries.schemas.ts`
- `backend/src/services/summaryGenerator.ts`
- `backend/src/services/llm.ts`
- `backend/src/services/jobQueue.ts`
- `backend/src/utils/prisma.ts`
- `backend/src/utils/cacheKeys.ts`

## フロントエンド構成
- `frontend/src/pages/Home.tsx`（latestSummaries 表示）

## データフロー
- 下書き: `POST /api/companies/:id/summaries/draft` → Job → `generateSummaryDraft`。
- 生成: `summaryGenerator` → Message抽出 → LLM summarize → `summaryDraft` upsert。
- 保存: `POST /api/companies/:id/summaries` → Summary 作成。
- 一覧: `GET /api/companies/:id/summaries`。
- タスク候補: `GET /api/summaries/:id/tasks/candidates` → Markdown解析。

## 関連テスト
- `backend/src/routes/summaries.test.ts`
- `backend/src/services/llm.test.ts`

## 他クラスターとの接点
- Job基盤クラスターで非同期実行。
- メッセージクラスターの Message が入力データ。
- ダッシュボードで最新サマリー表示。
