# 02 タスク

## 1. 概要
- 企業/案件/卸に紐づくタスクを管理する
- 一覧は List / Kanban の2表示に対応する
- 一括更新(Bulk)で status/dueDate/assignee を変更できる

## 2. 関連ファイル
### Backend
- ルート: `backend/src/routes/tasks.ts`
- ハンドラ: `backend/src/routes/tasks.handlers.ts`
- スキーマ: `backend/src/routes/tasks.schemas.ts`
- 参照: `backend/src/services/taskTargets.ts` (target 情報付与)

### Frontend
- 一覧: `frontend/src/pages/Tasks.tsx`
- 詳細: `frontend/src/pages/TaskDetail.tsx`
- UI: `frontend/src/components/tasks/*` (Filters/Table/Kanban/BulkActions)

## 3. データモデル
- `Task`: `targetType`(company/project/wholesale), `targetId`, `title`, `description`, `dueDate`, `status`, `assigneeId`
- `TaskStatus`: `todo/in_progress/done/cancelled`

## 4. API
- `GET /api/tasks` (全体一覧)
- `GET /api/me/tasks` (自分のタスク)
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/bulk`
- `GET /api/companies/:id/tasks` / `projects/:id/tasks` / `wholesales/:id/tasks`

## 5. Backend 実装ポイント
- `parseTaskListFilters`
  - status/targetType/日付のバリデーションは `TaskStatus`/`TargetType` に合わせる
- `listTasks`
  - pagination + 並び順は dueDate asc, createdAt desc
  - `attachTargetInfo` で target を付与
- `listTasksHandler` / `listMyTasksHandler`
  - 権限に応じて `assigneeId` を限定
- `listTasksForTarget`
  - company/project/wholesale の target で絞り込み
- `createTaskHandler`
  - target の存在確認と assignee の妥当性
- `updateTaskHandler`
  - title/status/dueDate/assignee の更新
- `bulkUpdateTasksHandler`
  - `taskIds` を transaction で更新

## 6. Frontend 実装ポイント
- `Tasks.tsx`
  - `useListPage` でURL同期
  - `handleStatusChange`/`handleDueDateChange`/`handleAssigneeChange` の反映
  - `handleBulkUpdate` は `taskIds` + status/dueDate を送信
  - `view` は list/kanban を切替, `taskScope` は all/mine
- `TaskDetail.tsx`
  - 詳細更新はPATCH
  - `DELETE /tasks/:id` で削除

## 7. 気になる点
- **権限**: `GET /tasks/:id` は assignee 制限ありだが、`PATCH/DELETE/bulk` の制限が不足
- **フィルタ**: `listTasksForTarget` で `dueFrom/dueTo` が未反映
- **型**: `useMutation` のレスポンスが `{ task: Task }` と一致していない
- **認証**: `TaskDetail` の API 呼び出しに `authMode` 指定が必要
- **UI/JSX**: `Tasks.tsx`/`TaskDetail.tsx`/`TaskFilters.tsx` の重複

## 8. 改善案
- `buildTaskWhere` を共通化し、`listTasksHandler`/`listMyTasksHandler`/`listTasksForTarget` で再利用
- `parseTaskListFilters` のエラー文言を統一
- `updateTaskHandler`/`deleteTaskHandler`/`bulkUpdateTasksHandler` に assignee 制限を追加
- `useTaskOptimisticUpdate` / `useTaskBulkActions` の導入
- `TaskDetail` の fetch/mutation は `authMode: 'bearer'` に統一
- UI 文言は `strings/tasks.ts` に集約

## 9. TODO
- Kanban/List 切替のUX改善
- Bulk 操作時のエラー/成功フィードバック強化
