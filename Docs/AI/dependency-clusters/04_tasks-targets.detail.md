# クラスター04 詳細: タスク管理・ターゲット解決

## 目的/範囲
- タスクのCRUD、バルク更新、担当者管理。
- company/project/wholesale のターゲット解決（表示名の取得）。
- タスクワークフロー向けの一覧・カンバンUI。

## データモデル（Prisma）
- Task: `id`, `targetType`, `targetId`, `assigneeId`, `title`, `description`, `dueDate`, `status`, タイムスタンプ。
- TargetType: `company`, `project`, `wholesale`.
- TaskStatus: `todo`, `in_progress`, `done`, `cancelled`.
- User は任意の担当者リレーション。

## バックエンド構成
### ルーティングとスキーマ
- `backend/src/routes/tasks.ts`
  - GET `/api/tasks` フィルタ付き一覧。
  - GET `/api/tasks/:id` 単体取得。
  - POST `/api/tasks` タスク作成（書き込み権限）。
  - PATCH `/api/tasks/:id` タスク更新（書き込み権限）。
  - PATCH `/api/tasks/bulk` バルク更新（書き込み権限）。
  - DELETE `/api/tasks/:id` 削除（書き込み権限）。
  - GET `/api/me/tasks` 自分の担当タスク一覧。
  - GET `/api/companies/:id/tasks` 会社ターゲットのタスク一覧。
  - GET `/api/projects/:id/tasks` 案件ターゲットのタスク一覧。
  - GET `/api/wholesales/:id/tasks` 卸ターゲットのタスク一覧。
- `backend/src/routes/tasks.schemas.ts`
  - リクエストボディ: `TaskCreateBody`, `TaskUpdateBody`, `TaskBulkUpdateBody`。
  - クエリ: `TaskListQuery`（`status`, `assigneeId`, `targetType`, `targetId`, `dueFrom`, `dueTo`）。
  - レスポンススキーマは `target` 情報と任意の `assignee` を含む。

### ハンドラとコアロジック
- `backend/src/routes/tasks.handlers.ts`
  - `parseTaskListFilters` は `createEnumNormalizer` + `parseDate` で status/target/日付を検証。
  - `listTasks` はトランザクション内で `prisma.task.findMany` と `prisma.task.count` を実行し、期限/作成時刻で並べ替えて `attachTargetInfo` を呼ぶ。
  - `createTaskHandler` は必須項目を検証し、ターゲット存在を確認して `dueDate` を解析し、作成後に監査ログを記録。
  - `updateTaskHandler` は部分更新を検証し、`Prisma.TaskUpdateInput` を構築して `connectOrDisconnect` で担当者を更新し、前後スナップショット付きで監査ログを記録。
  - `bulkUpdateTasksHandler` は配列入力を検証し、トランザクション内で更新して件数を返す（監査ログなし）。
  - `deleteTaskHandler` は id で削除し、削除前レコードを監査ログに記録。
  - `listMyTasksHandler` は現在ユーザーの `assigneeId` で絞り込み、同様の日付/status/target フィルタに対応。
  - `listCompanyTasksHandler`/`listProjectTasksHandler`/`listWholesaleTasksHandler` は `targetType`/`targetId` を固定し、任意で `status` を受ける。

### ターゲット名解決
- `backend/src/services/taskTargets.ts`
  - `attachTargetInfo` は種類ごとに target id を集め、名称を並列取得して `target` オブジェクト付きで返す。
  - 卸ターゲットの名称は関連企業名を優先し、なければ target id を返す。
- `ensureTargetExists`（handlers 内部）が不正な target id のタスク作成を防ぐ。

### 共通ユーティリティ
- `backend/src/utils/pagination.ts` はページングとレスポンスメタデータ。
- `backend/src/utils/validation.ts` は enum 正規化と日付解析。
- `backend/src/utils/prisma.ts` はエラー変換と `connectOrDisconnect`。
- `backend/src/services/audit.ts` は create/update/delete の監査ログ。

## フロントエンド構成
### ページとセクション
- `frontend/src/pages/Tasks.tsx`
  - `useUrlSync` でフィルタ、スコープ（`me`/`all`）、表示（`list`/`kanban`）、ページングをURLに同期。
  - `/api/tasks` または `/api/me/tasks` を `useFetch` で取得。
  - `useMutation` によるステータス/担当者/期限の楽観更新。
  - `/api/tasks/bulk` で status/assignee/dueDate（クリア含む）のバルク更新。
  - `/` キーでステータスフィルタにフォーカス。
- `frontend/src/pages/TaskDetail.tsx`
  - 単体取得し、書き込み権限で編集/削除。
  - `FormInput`/`FormSelect`/`FormTextarea` で編集UIを構成。
- `frontend/src/components/CompanyTasksSection.tsx`
  - 企業詳細に埋め込み、企業ターゲットのタスク一覧/作成を提供。
  - `targetType: 'company'` で作成し、ステータスをインライン更新。

### カンバン表示
- `frontend/src/components/KanbanBoard.tsx`
  - ステータスごとにタスクをグループ化し、`@dnd-kit/core` でドラッグ&ドロップ。
  - ドロップ時に列IDからステータスを推定して `onStatusChange` を実行。
- `frontend/src/components/KanbanColumn.tsx` はドロップ可能列を定義しカードを描画。
- `frontend/src/components/KanbanCard.tsx` は選択やターゲットリンク付きのドラッグ可能カードを描画。

### 型と定数
- `frontend/src/types/entities.ts` は `Task` と関連型を定義。
- `frontend/src/types/filters.ts` は `TasksFilters` を定義。
- `frontend/src/constants/labels.ts` はステータス/ターゲットのラベルを提供。
- `frontend/src/utils/routes.ts` は `targetType` と詳細ルートを対応付け。

## データフロー詳細
- 一覧: UI がクエリを組み、バックエンドがフィルタを解析して取得し、ターゲット名を付与してページング付きで返却。
- 作成: UI が送信し、バックエンドがターゲット存在を検証して保存し、監査ログを記録。
- 更新: UI が楽観更新で PATCH し、バックエンドが部分更新を検証/適用して監査ログを記録。
- バルク更新: UI が id 群と更新内容を送信し、バックエンドがトランザクションで更新。
- カンバン: ドラッグイベントでステータス更新し、一覧更新と同じ PATCH を使用。

## 依存関係
- Prisma（Task, User, Company, Project, Wholesale）。
- `@dnd-kit/core` と `@dnd-kit/utilities`（ドラッグ&ドロップ）。
- RBAC ミドルウェア（認証/書き込み権限制御）。

## 関連テスト
- `backend/src/routes/tasks.test.ts`
- `frontend/src/pages/Tasks.test.tsx`
- `frontend/src/components/KanbanBoard.test.tsx`

## 他クラスターとの接点
- target 解決のため company/project/wholesale を参照。
- 担当者の options は Auth/Users クラスターから取得。
- 監査ログは共通基盤として利用。
