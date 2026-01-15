# クラスター05 詳細: メッセージ・ラベル・検索

## 目的/範囲
- メッセージ一覧と、ラベルフィルタ付きの全文検索。
- メッセージの企業紐付けとラベル管理。
- companies/projects/wholesales/tasks/contacts を横断した検索。

## データモデル（Prisma）
- Message: `roomId`, `messageId`, `sender`, `body`, `sentAt`, `labels[]`, `companyId/projectId/wholesaleId` は任意。
- ChatworkRoom リレーション（メッセージ供給元）。
- company への紐付けは割り当て済み/未割当ビューに利用。

## バックエンド構成
### メッセージルートと挙動
- `backend/src/routes/messages.ts`
- `backend/src/routes/messages.handlers.ts`
- `backend/src/routes/messages.schemas.ts`
  - GET `/api/companies/:id/messages`
    - フィルタ: `from`, `to`, `label`, ページネーション。
    - `parseDate` と `normalizeLabel` を使って Prisma `where` を構築。
  - GET `/api/messages/search`
    - `q` または `messageId` が必須の全文検索。
    - 任意フィルタ: `companyId`, `label`, `from`, `to`。
    - raw SQL + `to_tsvector`/`plainto_tsquery` を使用。
  - GET `/api/messages/unassigned`
    - `companyId IS NULL` を対象に全文検索。
  - PATCH `/api/messages/:id/assign-company`
    - 企業の存在を検証し、単一メッセージを更新。
  - PATCH `/api/messages/assign-company`
    - 企業検証後に `updateMany` でバルク割り当て。
  - POST `/api/messages/:id/labels`
    - `Set` で重複排除しつつラベル追加。
  - DELETE `/api/messages/:id/labels/:label`
    - 値でラベル削除。
  - POST `/api/messages/labels/bulk`
    - トランザクションでラベルを一括追加。
  - POST `/api/messages/labels/bulk/remove`
    - トランザクションでラベルを一括削除。
  - GET `/api/messages/labels`
    - `unnest(labels)` で件数集計し、30秒キャッシュ。

### 検索SQLヘルパー
- `buildMessageSearchWhere` は `Prisma.sql` の WHERE を組み立てる:
  - `to_tsvector('simple', "body") @@ plainto_tsquery('simple', query)` で全文検索。
  - ラベル配列: `"labels" @> ARRAY[label]::text[]`。
  - `sentAt` の日付範囲フィルタ。
  - `companyId` の完全一致、または `IS NULL`（未割当）。

### ラベルのバリデーションとキャッシュ
- `normalizeLabel` は以下を保証:
  - 前後トリム済みの非空文字列。
  - 長さ <= 30。
  - 制御文字なし。
- `backend/src/utils/ttlCache.ts` がラベル集計結果を30秒保持。
- `backend/src/utils/cacheKeys.ts`

### 横断検索
- `backend/src/routes/search.ts`
- `backend/src/routes/search.handlers.ts`
- `backend/src/routes/search.schemas.ts`
  - `q` と `limit` を受ける GET `/api/search`。
  - `normalizeCompanyName` で `companies.normalizedName` を照合。
  - `companies`, `projects`, `wholesales`, `tasks`, `contacts` を並列で返す。
- `backend/src/utils/normalize.ts`
  - 企業名を NFKC 正規化、小文字化、記号除去で正規化。

## フロントエンド構成
### 企業タイムラインとラベル操作
- `frontend/src/pages/CompanyDetail.tsx`
  - `from`, `to`, `label`, `q` で `messagesUrl` を構築。
  - `q` があれば `/api/messages/search`（`companyId` フィルタ付き）。
  - それ以外は `/api/companies/:id/messages`。
  - `groupMessagesByDate` が `formatDateGroup` で日別にグループ化。
  - `highlightText` が本文の一致箇所を強調。
  - `handleAddLabel` が入力値を読み取り `/api/messages/:id/labels` へ POST。
  - `handleRemoveLabel` が `/api/messages/:id/labels/:label` を DELETE。
  - ラベル候補は `/api/messages/labels` と datalist を利用。

### 検索UIヘルパー
- `frontend/src/components/SearchSelect.tsx`
  - `useDebouncedValue` で企業/案件名をデバウンス検索。
  - `/api/companies/search` または `/api/projects/search` を呼び出す。
  - 選択済みオプションの詳細を再取得してラベルを安定化。
- `frontend/src/hooks/useDebouncedValue.ts` はクエリのデバウンスを担当。

### 型と契約
- `frontend/src/types/entities.ts` は `Message`, `MessageItem`, ラベルの型を含む。
- `frontend/src/lib/apiRoutes.ts` がメッセージ/ラベルのエンドポイントを定義。

## データフロー詳細
- 企業タイムライン:
  - UI フィルタが URL/状態を更新し、メッセージ取得 → 日別グループ化 → ラベル描画。
  - ラベル追加/削除で再取得して反映。
- 全文検索:
  - バックエンドが PostgreSQL テキスト検索と配列演算で SQL の WHERE を構築。
  - 件数取得と一覧取得を並列で実行し、ページング結果を返す。
- ラベル集計:
  - バックエンドが `unnest(labels)` で件数集計し、結果をキャッシュ。

## 依存関係
- Prisma（Message, Company, Project, Wholesale, Contact）。
- PostgreSQL 全文検索（`to_tsvector`, `plainto_tsquery`）。
- ラベル集計の TTL メモリキャッシュ。
- Chatwork 同期がメッセージデータを供給（クラスター06）。

## テスト
- `backend/src/routes/messages.test.ts`
- `frontend/src/components/SearchSelect.test.tsx`

## 他クラスターとの接点
- メッセージは Chatwork 同期で生成（クラスター06）。
- サマリー生成がメッセージを入力として利用（クラスター07）。
- 企業詳細ページにタイムライン/ラベルUIが組み込み（クラスター02）。
