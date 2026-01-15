# クラスター05: メッセージ・ラベル・全文検索

## 目的/範囲
- メッセージ一覧/検索/未割当の確認
- ラベル付与/削除/集計
- 横断検索（companies/projects/wholesales/tasks/contacts）

## 依存関係
- Prisma（Message ほか）
- PostgreSQL全文検索（to_tsvector / plainto_tsquery）
- TTLキャッシュ `utils/ttlCache.ts` とキー定義 `utils/cacheKeys.ts`
- Chatwork同期（データ供給元）

## バックエンド構成
- `backend/src/routes/messages.ts`
- `backend/src/routes/messages.handlers.ts`
- `backend/src/routes/messages.schemas.ts`
- `backend/src/routes/search.ts`
- `backend/src/routes/search.handlers.ts`
- `backend/src/routes/search.schemas.ts`
- `backend/src/utils/pagination.ts`
- `backend/src/utils/validation.ts`
- `backend/src/utils/ttlCache.ts`
- `backend/src/utils/cacheKeys.ts`
- `backend/src/utils/prisma.ts`
- `backend/src/utils/normalize.ts`（/search の company 正規化）

## フロントエンド構成
- `frontend/src/pages/CompanyDetail.tsx`（メッセージ一覧/ラベル操作）
- `frontend/src/components/SearchSelect.tsx`
- `frontend/src/hooks/useDebouncedValue.ts`
- `frontend/src/hooks/useUrlSync.ts`
- `frontend/src/types/entities.ts`

## データフロー
- 企業メッセージ: `GET /api/companies/:id/messages` → Prisma list。
- 全文検索: `GET /api/messages/search` → raw SQL + pagination。
- ラベル: `/api/messages/:id/labels` / `/api/messages/labels` → TTL cache。
- 横断検索: `GET /api/search` → Company/Project/Wholesale/Task/Contact を並列取得。

## 関連テスト
- `backend/src/routes/messages.test.ts`
- `frontend/src/components/SearchSelect.test.tsx`

## 他クラスターとの接点
- Chatwork同期が `messages` の主なデータ供給源。
- サマリー生成は `messages` を入力として使用。
