# クラスター09: ダッシュボード/CSV/設定/監査ログ

## 目的/範囲
- ダッシュボード集計（タスク期限別リスト、最新サマリー、最近更新企業、未割当メッセージ数）。
- CSV エクスポート（Companies/Tasks）。
- アプリ設定（summary 期間・タグ候補）。
- 監査ログ一覧（フィルタ・ページング・ユーザー補完）。

## 依存データモデル（Prisma）
- `Task` / `Summary` / `Company` / `Message`（ダッシュボード集計）
- `AppSetting`（設定保持）
- `AuditLog`（監査ログ）
- `User`（監査ログの `userEmail` 補完）

## バックエンド構成
### ダッシュボード
- `backend/src/routes/dashboard.ts`
  - `GET /api/dashboard`
  - 期限の基準日を「サーバーのローカル時間」で計算（UTC ではない）。
  - `overdue/today/soon/week` を `TaskStatus.done/cancelled` 以外 & `dueDate != null` で抽出。
  - `summary`, `company`, `unassignedMessageCount` を同時取得し、`Promise.all` で並列化。
- `backend/src/services/taskTargets.ts`
  - `attachTargetInfo(items)` が `targetType` に応じて Company/Project/Wholesale の名前を補完。
  - 対象 id を Set に集約 → `findMany` でまとめて取得 → Map 化して `target` を付与。

### CSV エクスポート
- `backend/src/routes/export.ts`
  - `GET /api/export/companies.csv`
    - クエリ: `from/to/status/category/ownerId/tag`
    - `parseDate` で日付妥当性チェック。
  - `GET /api/export/tasks.csv`
    - クエリ: `status/targetType/targetId/assigneeId/dueFrom/dueTo`
  - CSV 生成:
    - `escapeCsv` で `"` をエスケープ。
    - `sanitizeCsvCell` で `= + - @` 先頭セルに `'` を付与（CSV インジェクション対策）。
    - `toCsv` で BOM (`\ufeff`) を付けて UTF-8 出力。
  - `Content-Disposition: attachment` でファイル名を指定。

### 設定
- `backend/src/routes/settings.ts`
  - `GET /api/settings`
    - `AppSetting` から `summaryDefaultPeriodDays` と `tagOptions` を取得。
    - 未設定時は `DEFAULT_SETTINGS` にフォールバック。
  - `PATCH /api/settings`
    - `summaryDefaultPeriodDays` は 1-365 の範囲。
    - `tagOptions` は `parseStringArray` で検証。
    - JSON サイズが `MAX_JSON_VALUE_BYTES (16KB)` を超えると 400。
    - `upsert` で保存し、保存後に再取得して返却。

### 監査ログ
- `backend/src/routes/audit-logs.ts`
  - `GET /api/audit-logs`
  - フィルタ: `entityType/entityId/from/to` + `page/pageSize`。
  - `parsePagination` で `page/pageSize/skip` を算出。
  - `prisma.$transaction` で `findMany` + `count` を同時取得。
  - `userId` を収集し `User` を取得 → `userEmail` を付与。
  - `buildPaginatedResponse` で `{ items, pagination }` を返却。
- `backend/src/services/audit.ts`
  - `logAudit` が `AuditLog` に `before/after` を記録。
  - `companies.handlers.ts` / `projects.ts` / `tasks.handlers.ts` / `wholesales.ts` で `create/update/delete` 時に呼び出し。

### 共通ユーティリティ
- `backend/src/utils/validation.ts`: `parseDate` / `parseStringArray` など。
- `backend/src/utils/pagination.ts`: `parsePagination` / `buildPaginatedResponse`。
- `backend/src/utils/prisma.ts`: `handlePrismaError` で Prisma エラーを HTTP に変換。

## フロントエンド構成
### ダッシュボード
- `frontend/src/pages/Home.tsx`
  - `useFetch(apiRoutes.dashboard())` で `DashboardResponse` を取得。
  - `taskGroups` を `overdue/today/soon/week` に分割し UI ブロックへ展開。
  - `getTargetPath` でタスクの遷移先（company/project/wholesale）を決定。
  - `statusLabel`/`targetTypeLabel` で表示ラベル変換。

### CSV エクスポート
- `frontend/src/pages/Exports.tsx`
  - `useFetch` で `companyOptions` / `userOptions` を取得。
  - `buildQueryString` でクエリ構築し `apiDownload` で Blob 取得。
  - ダウンロードは `<a>` を生成して `link.click()` で実行。
- `frontend/src/lib/apiClient.ts`
  - `apiDownload` が `Authorization` と `credentials: include` を付与して CSV を取得。
- `frontend/src/utils/queryString.ts`
  - 空値を除外してクエリを生成。

### 設定
- `frontend/src/pages/Settings.tsx`
  - `useFetch(apiRoutes.settings())` で初期値を取得。
  - `tagOptions` は textarea の改行を `split('\n')` して配列化。
  - `useMutation` で `PATCH /api/settings` を実行し成功通知を表示。

## データフロー
- ダッシュボード:
  - `GET /api/dashboard` → タスク/サマリー/企業/未割当メッセージ取得 →
    `attachTargetInfo` で `target` 付与 → フロントでグルーピング表示。
- CSV:
  - UI フィルタ → `buildQueryString` → `apiDownload` → Blob 保存。
- 設定:
  - `GET /api/settings` → フォームに反映 → `PATCH /api/settings` で upsert。
- 監査ログ:
  - CRUD 操作で `logAudit` → `/api/audit-logs` で一覧取得（UI は未実装）。

## 関連テスト
- `backend/src/routes/audit-logs.test.ts`
- `frontend/src/pages/Settings.test.tsx`

## 他クラスターとの接点
- ダッシュボードは `Task/Summary/Company/Message` クラスターに依存。
- エクスポートは `Companies/Tasks` のフィルタ構造と連携。
- 監査ログは `Company/Project/Task/Wholesale` 更新処理から書き込まれる。
