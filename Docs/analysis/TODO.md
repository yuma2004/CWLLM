# docs/analysis TODO

docs/analysis/01-08 のセクション1-8にある箇条書きを TODO 化した一覧。
完了済みのものは後でチェックを入れる。

## 01 企業/担当者
### 1. 概要
- [x] 企業(Company)と担当者(Contact)のCRUDと一覧/検索/フィルタを提供する
- [x] 企業とChatworkルームの紐付けを扱い、タイムラインやタスクと連動する
- [x] 企業詳細でメッセージ/タスク/プロジェクト/卸/サマリーを横断的に確認できるようにする
### 2. 関連ファイル
- [x] ルート: `backend/src/routes/companies.ts`
- [x] ハンドラ: `backend/src/routes/companies.handlers.ts`
- [x] スキーマ: `backend/src/routes/companies.schemas.ts`
- [x] ユーティリティ: `backend/src/utils/normalize.ts`, `backend/src/utils/pagination.ts`, `backend/src/utils/cacheKeys.ts`, `backend/src/utils/validation.ts`
- [x] キャッシュ: options取得で `CACHE_KEYS.companyOptions` を使用し、更新時に削除
- [x] 一覧: `frontend/src/pages/Companies.tsx` と `useListPage`
- [x] 詳細: `frontend/src/pages/CompanyDetail.tsx` (Overview/Contacts/Timeline/Projects/Wholesales/Summaries/Tasks)
- [x] UI: `frontend/src/components/companies/*` (Filters/Table/Overview/Contacts/Timeline/Tasks/Projects/Wholesales/Summaries)
- [x] Chatwork連携: `POST /companies/:id/chatwork-rooms`
- [x] メッセージ: `/companies/:id/messages`
- [x] タスク: `/companies/:id/tasks`
### 3. データモデル
- [x] `Company`
- [x] `id`, `name`, `normalizedName`
- [x] `category`, `status`, `tags[]`, `profile`
- [x] `ownerIds[]`
- [x] `createdAt`, `updatedAt`
- [x] 制約: `normalizedName` unique
- [x] `Contact`
- [x] `id`, `companyId`, `name`, `role`, `email`, `phone`, `memo`
- [x] `sortOrder`, `sortKey`
- [x] `createdAt`, `updatedAt`
- [x] インデックス: `[companyId, sortKey]`
### 4. API
- [x] `GET /api/companies`
- [x] 認可: `requireAuth`
- [x] Query: `q/category/status/tag/ownerId/page/pageSize`
- [x] Response: `{ items, pagination }`
- [x] `GET /api/companies/search`
- [x] 認可: `requireAuth`
- [x] Query: `q, limit`
- [x] Response: `{ items: {id,name,status,category,tags}[] }`
- [x] `POST /api/companies`
- [x] 認可: `requireWriteAccess`
- [x] Body: `name, category, status, tags[], profile, ownerIds[]`
- [x] Response: `{ company }`
- [x] `GET /api/companies/:id`
- [x] 認可: `requireAuth`
- [x] Response: `{ company }`
- [x] `PATCH /api/companies/:id`
- [x] 認可: `requireWriteAccess`
- [x] Body: `name/category/status/tags/profile/ownerIds`
- [x] `DELETE /api/companies/:id`
- [x] 認可: `requireWriteAccess`
- [x] Response: `204`
- [x] `GET /api/companies/:id/contacts`
- [x] 認可: `requireAuth`
- [x] Response: `{ contacts }`
- [x] `GET /api/companies/:id/projects`
- [x] 認可: `requireAuth`
- [x] Response: `{ projects }`
- [x] `GET /api/companies/:id/wholesales`
- [x] 認可: `requireAuth`
- [x] Response: `{ wholesales }`
- [x] `GET /api/companies/:id/summaries`
- [x] 認可: `requireAuth`
- [x] Response: `{ summaries }`
- [x] `POST /api/companies/:id/contacts`
- [x] 認可: `requireWriteAccess`
- [x] Body: `name, role, email, phone, memo`
- [x] `PATCH /api/contacts/:id`
- [x] 認可: `requireWriteAccess`
- [x] Body: `name/role/email/phone/memo/sortOrder`
- [x] `DELETE /api/contacts/:id`
- [x] 認可: `requireWriteAccess`
- [x] `PATCH /api/companies/:id/contacts/reorder`
- [x] 認可: `requireWriteAccess`
- [x] Body: `orderedIds[]`
- [x] `GET /api/companies/options`
- [x] 認可: `requireAuth`
- [x] Response: `{ categories, statuses, tags }`
### 5. 画面/UX
- [x] Companies 一覧
- [x] 検索/フィルタ/ページングは `useListPage` で制御
- [x] 企業作成時にChatwork連携の有無を選択
- [x] ownerIds のフィルタと表示
- [x] CompanyDetail
- [x] Overview: 企業情報/担当者/ステータス/タグ
- [x] Contacts: 連絡先の追加/編集/並び替え
- [x] Timeline: メッセージの時系列表示とラベル操作
- [x] Projects: 企業に紐づく案件一覧
- [x] Wholesales: 企業に紐づく卸一覧
- [x] Summaries: 企業に紐づくサマリー一覧
- [x] Tasks: 企業に紐づくタスク一覧
### 6. 実装詳細
- [x] `listCompaniesHandler`
- [x] `q` を `normalizeCompanyName` で正規化し、`name`/`normalizedName` のOR検索
- [x] category/status/tag/ownerId を `where` に反映
- [x] `searchCompaniesHandler`
- [x] `q` + `limit` の小規模検索
- [x] `createCompanyHandler` / `updateCompanyHandler`
- [x] `tags`/`ownerIds` の配列バリデーション
- [x] `normalizedName` の生成
- [x] `normalizedName` 重複時は 409 + 既存企業情報を返す
- [x] 会社オプションキャッシュの削除
- [x] `createCompanyContactHandler`
- [x] `sortKey` を生成して `sortOrder` と併用
- [x] `reorderContactsHandler`
- [x] `orderedIds` をもとに `sortOrder`, `sortKey` を transaction で更新
- [x] `getCompanyOptionsHandler`
- [x] distinct + `unnest(tags)` で候補を収集
- [x] `mergeCompanyHandler`
- [x] `sourceCompanyId` の関連データを `targetCompanyId` に付け替え
- [x] tags/ownerIds は union、category/profile は target 優先
- [x] messages/projects/wholesales/summaries/summaryDrafts/roomLinks/tasks を統合
- [x] summaryDraft と roomLink は target の重複を優先して source を削除
- [x] `Companies.tsx`
- [x] `useListPage` の `handleSearchSubmit/clearFilter/clearAllFilters`
- [x] `handleCreate` でChatwork連携の分岐
- [x] `handleOwnerChange` の反映
- [x] `CompanyDetail.tsx`
- [x] Overview/Contacts/Timeline/Projects/Wholesales/Summaries/Tasks のデータ取得と状態連携
- [x] `handleMergeDuplicates` のAPI連携
- [x] Contactsの並び替え `reorderContacts` 実装
- [x] `useCompanyDetailData` / `useCompanyContacts` / `useCompanyOverviewForm` へ分割
### 7. 気になる点 (Readable Code)
- [x] 特になし（主要な整理は完了）
### 8. 改善案
- [x] Zodに `z.preprocess` / `z.refine` を導入して入力正規化
- [x] `CompanyDetail` を hooks に分割
- [x] `useCompanyDetailData` (Company/Contacts/Messages/Projects/Wholesales/Summaries のfetch)
- [x] `useCompanyContacts` (追加/更新/並び替え)
- [x] `useCompanyOverviewForm`
- [x] ChatworkのルームIDは `id`(内部) / `roomId`(Chatwork) に統一して扱う
- [x] `sortKey` を追加し、並び順は `sortKey` で管理
- [x] CompanySearchのレスポンス型を統一

## 02 タスク
### 1. 概要
- [ ] 企業/案件/卸に紐づくタスクを管理する
- [ ] 一覧は List / Kanban の2表示に対応する
- [ ] 一括更新(Bulk)で status/dueDate/assignee を変更できる
### 2. 関連ファイル
- [ ] ルート: `backend/src/routes/tasks.ts`
- [ ] ハンドラ: `backend/src/routes/tasks.handlers.ts`
- [ ] スキーマ: `backend/src/routes/tasks.schemas.ts`
- [ ] 参照: `backend/src/services/taskTargets.ts` (target 情報付与)
- [ ] 一覧: `frontend/src/pages/Tasks.tsx`
- [ ] 詳細: `frontend/src/pages/TaskDetail.tsx`
- [ ] UI: `frontend/src/components/tasks/*` (Filters/Table/Kanban/BulkActions)
### 3. データモデル
- [ ] `Task`: `targetType`(company/project/wholesale), `targetId`, `title`, `description`, `dueDate`, `status`, `assigneeId`
- [ ] `TaskStatus`: `todo/in_progress/done/cancelled`
### 4. API
- [ ] `GET /api/tasks` (全体一覧)
- [ ] `GET /api/me/tasks` (自分のタスク)
- [ ] `GET /api/tasks/:id`
- [ ] `POST /api/tasks`
- [ ] `PATCH /api/tasks/:id`
- [ ] `DELETE /api/tasks/:id`
- [ ] `PATCH /api/tasks/bulk`
- [ ] `GET /api/companies/:id/tasks` / `projects/:id/tasks` / `wholesales/:id/tasks`
### 5. Backend 実装ポイント
- [ ] `parseTaskListFilters`
- [ ] status/targetType/日付のバリデーションは `TaskStatus`/`TargetType` に合わせる
- [ ] `listTasks`
- [ ] pagination + 並び順は dueDate asc, createdAt desc
- [ ] `attachTargetInfo` で target を付与
- [ ] `listTasksHandler` / `listMyTasksHandler`
- [ ] 権限に応じて `assigneeId` を限定
- [ ] `listTasksForTarget`
- [ ] company/project/wholesale の target で絞り込み
- [ ] `createTaskHandler`
- [ ] target の存在確認と assignee の妥当性
- [ ] `updateTaskHandler`
- [ ] title/status/dueDate/assignee の更新
- [ ] `bulkUpdateTasksHandler`
- [ ] `taskIds` を transaction で更新
### 6. Frontend 実装ポイント
- [ ] `Tasks.tsx`
- [ ] `useListPage` でURL同期
- [ ] `handleStatusChange`/`handleDueDateChange`/`handleAssigneeChange` の反映
- [ ] `handleBulkUpdate` は `taskIds` + status/dueDate を送信
- [ ] `view` は list/kanban を切替, `taskScope` は all/mine
- [ ] `TaskDetail.tsx`
- [ ] 詳細更新はPATCH
- [ ] `DELETE /tasks/:id` で削除
### 7. 気になる点
- [x] **権限**: `GET /tasks/:id` は assignee 制限ありだが、`PATCH/DELETE/bulk` の制限が不足
- [x] **フィルタ**: `listTasksForTarget` で `dueFrom/dueTo` が未反映
- [x] **型**: `useMutation` のレスポンスが `{ task: Task }` と一致していない
- [x] **認証**: `TaskDetail` の API 呼び出しに `authMode` 指定が必要
- [x] **UI/JSX**: `Tasks.tsx`/`TaskDetail.tsx`/`TaskFilters.tsx` の重複
### 8. 改善案
- [x] `buildTaskWhere` を共通化し、`listTasksHandler`/`listMyTasksHandler`/`listTasksForTarget` で再利用
- [x] `parseTaskListFilters` のエラー文言を統一
- [x] `updateTaskHandler`/`deleteTaskHandler`/`bulkUpdateTasksHandler` に assignee 制限を追加
- [ ] `useTaskOptimisticUpdate` / `useTaskBulkActions` の導入
- [x] `TaskDetail` の fetch/mutation は `authMode: 'bearer'` に統一
- [x] UI 文言は `strings/tasks.ts` に集約

## 03 Chatwork連携
### 1. 概要
- [ ] Chatwork API を用いてルーム/メッセージを同期する
- [ ] Webhook を受け取って最新メッセージを取り込む
- [ ] BullMQ による定期/オンデマンド同期を行う
### 2. 関連ファイル
- [ ] ルート: `backend/src/routes/chatwork.ts`
- [ ] ハンドラ: `backend/src/routes/chatwork.handlers.ts`
- [ ] スキーマ: `backend/src/routes/chatwork.schemas.ts`
- [ ] サービス: `backend/src/services/chatwork.ts`, `chatworkSync.ts`, `chatworkScheduler.ts`
- [ ] キュー: `backend/src/services/jobQueue.ts`
- [ ] 設定画面: `frontend/src/pages/ChatworkSettings.tsx`
### 3. API
- [ ] `POST /api/chatwork/rooms/sync` (ルーム同期)
- [ ] `POST /api/chatwork/messages/sync` (メッセージ同期)
- [ ] `GET /api/chatwork/rooms`
- [ ] `PATCH /api/chatwork/rooms/:id` (isActive 更新)
- [ ] `POST /api/chatwork/webhook`
- [ ] `GET/POST/DELETE /api/companies/:id/chatwork-rooms`
### 4. 実装の流れ
- [ ] 同期
- [ ] `/chatwork/rooms/sync` or `/chatwork/messages/sync` で `enqueueChatwork*Sync`
- [ ] Worker がChatwork APIを呼び出しDBを更新
- [ ] Webhook
- [ ] raw JSON 受信 + `CHATWORK_WEBHOOK_TOKEN` 検証
- [ ] roomId 抽出と cooldown 判定後に enqueue
- [ ] 定期同期
- [ ] scheduler が Redis lock を獲得してジョブを投入
### 5. 実装詳細
- [ ] `syncChatworkRooms` / `syncChatworkMessages`
- [ ] Chatwork API 取得 → Prisma upsert/createMany/update
- [ ] lastSync/lastError を記録
- [ ] `chatworkWebhookHandler`
- [ ] payload 検証/署名検証/イベント判定/cooldown 判定/ジョブ投入
- [ ] `startChatworkAutoSync`
- [ ] Redis lock の取得後にルーム/メッセージ同期
### 6. 気になる点
- [x] **Webhook token 検証不足**: 署名検証が曖昧
- [x] **cooldown が Map**: プロセス再起動で失われる
- [x] **スキーマが `z.any()`**: 入力検証が弱い
- [x] **UIの複雑さ**: `ChatworkSettings.tsx` が肥大化
- [ ] **429対策**: Chatwork API レート制限時の挙動確認
### 7. 改善案
- [x] Webhookを `parse/validate/decide/enqueue` に分割し Zod で厳密化
- [ ] `roomId` / `chatworkRoomId` の命名を統一
- [x] `chatwork.schemas.ts` を UI と一致させる
- [x] `ChatworkSettings` の状態と表示を整理
- [x] cooldown を Redis で永続化
### 8. TODO
- [ ] Webhookの運用手順を明文化
- [ ] cooldown と同期間隔の見直し
- [ ] 失敗時のリトライ戦略を検討

## 04 サマリー/LLM
### 1. 概要
- [ ] 会社のメッセージから要約ドラフトを生成する
- [ ] LLM 実行は JobQueue で非同期化し、`summary_drafts` に保存する
### 2. 関連ファイル
- [ ] ルート: `backend/src/routes/summaries.ts`
- [ ] ハンドラ: `backend/src/routes/summaries.handlers.ts`
- [ ] サービス: `backend/src/services/summaryGenerator.ts`
- [ ] LLM: `backend/src/services/llm.ts`
- [ ] キュー: `backend/src/services/jobQueue.ts`
### 3. API
- [ ] `POST /api/companies/:id/summaries/draft`
- [ ] 既存Draftのキャッシュ確認後にJob投入
- [ ] `POST /api/companies/:id/summaries`
- [ ] Draft から metadata を引き継いで Summary を作成
- [ ] `GET /api/companies/:id/summaries`
- [ ] `POST /api/summaries/:id/tasks/candidates`
### 4. 実装の流れ
- [ ] Draft生成
- [ ] 期間指定で Draft を要求
- [ ] 既存Draftがあれば返却、なければ job enqueue
- [ ] Job処理
- [ ] `generateSummaryDraft` で LLM を呼び出し Draft upsert
### 5. 実装詳細
- [ ] `generateSummaryDraft`
- [ ] メッセージを収集し、件数や内容を整形
- [ ] `LLMClient.summarize`
- [ ] 40件ごとに chunk して map-reduce で集約
- [ ] `createSummaryHandler`
- [ ] Draft の `sourceLinks/model/promptVersion/sourceMessageCount/tokenUsage` を保存
### 6. 気になる点
- [x] **プロンプト品質**: `SYSTEM_PROMPT`/`REDUCE_PROMPT` の精度不足
- [x] **キャンセル整合性**: Job cancel と LLM 実行の同期が不完全
- [ ] **TTL設計**: Draft の有効期限が未定義
- [x] **言語/文字コード**: PROMPT_VERSION の扱い
- [ ] **可観測性**: 実行ログやトークン消費の記録が不足
### 7. 改善案
- [x] UTF-8 で `PROMPT_VERSION` を定数化
- [x] `generateSummaryDraft` の `isCanceled` を尊重
- [x] Draft の更新条件を明確化 (期間/メッセージ件数)
- [x] まとめ処理の定数を `const` に集約
### 8. TODO
- [ ] Draft のTTLと削除ロジック
- [ ] 失敗時の再試行/再生成
- [ ] 100/300/500件などの分割パターンの検証

## 05 プロジェクト/卸
### 1. 概要
- [ ] 企業に紐づく Project を管理する
- [ ] Project に紐づく Wholesale を管理する
- [ ] ProjectDetail で Project と Wholesales を横断的に確認する
### 2. 関連ファイル
- [ ] Projects: `backend/src/routes/projects.ts`, `projects.handlers.ts`, `projects.schemas.ts`
- [ ] Wholesales: `backend/src/routes/wholesales.ts`, `wholesales.handlers.ts`, `wholesales.schemas.ts`
- [ ] Projects 一覧: `frontend/src/pages/Projects.tsx`
- [ ] Project + Wholesales: `frontend/src/pages/ProjectDetail.tsx`
- [ ] Wholesale 詳細: `frontend/src/pages/WholesaleDetail.tsx`
### 3. API
- [ ] Project CRUD + `/projects/:id/wholesales`
- [ ] Wholesale CRUD + `/companies/:id/wholesales`
### 4. 実装ポイント
- [ ] `createProjectHandler` / `updateProjectHandler`
- [ ] 企業(Company)の存在を検証
- [ ] `createWholesaleHandler` / `updateWholesaleHandler`
- [ ] Project/Company の関係を検証
- [ ] `ProjectDetail.tsx`
- [ ] Project と Wholesale の一覧/フォーム/詳細を集約
### 5. 気になる点
- [x] **unitPrice が null**: UI で null を送ると backend で 400 になる
- [x] **Wholesales の schema**: Zod と Fastify schema が不一致
- [x] **taxType**: UIとDB/APIで表記が揺れている
- [x] **projectWholesalesResponseSchema**: `status` 型が曖昧
### 6. 改善案
- [x] Projects と Wholesales の form/state を整理
- [x] Wholesales API の schema を OpenAPI と一致させる
- [x] null/undefined の扱いを統一
### 7. TODO
- [x] project/wholesale のUI改善
- [x] unitPrice の入力・保存フローの修正
- [x] ProjectDetail の状態管理整理

## 06 メッセージ
### 1. 概要
- [ ] Chatwork メッセージを保存し、会社/案件/卸に紐づける
- [ ] メッセージの検索とラベル管理を提供する
### 2. 関連ファイル
- [ ] ルート: `backend/src/routes/messages.ts`
- [ ] ハンドラ: `backend/src/routes/messages.handlers.ts`
- [ ] スキーマ: `backend/src/routes/messages.schemas.ts`
- [ ] タイムライン: `frontend/src/components/companies/CompanyTimelineTab.tsx`
- [ ] 詳細: `frontend/src/pages/CompanyDetail.tsx`
### 3. データモデル
- [ ] `Message`: `roomId`, `messageId`, `sender`, `body`, `sentAt`, `labels[]`, `companyId`, `projectId`, `wholesaleId`
- [ ] 制約/インデックス: `@@unique([roomId, messageId])`, `@@index([companyId])`, `@@index([companyId, sentAt])`, `GIN(labels)`
### 4. API
- [ ] `GET /api/companies/:id/messages`
- [ ] `GET /api/messages/search`
- [ ] `GET /api/messages/unassigned`
- [ ] `PATCH /api/messages/:id/assign-company`
- [ ] `PATCH /api/messages/assign-company`
- [ ] `POST /api/messages/:id/labels` / `DELETE /api/messages/:id/labels/:label`
- [ ] `POST /api/messages/labels/bulk` / `POST /api/messages/labels/bulk/remove`
- [ ] `GET /api/messages/labels`
### 5. 実装ポイント
- [ ] `listCompanyMessagesHandler`
- [ ] label/date フィルタ + pagination
- [ ] 1ページ目のみ on-demand sync を enqueue
- [ ] `searchMessagesHandler`
- [ ] `q` か `messageId` で検索
- [ ] `Prisma.sql` で `to_tsvector` を利用
- [ ] `normalizeLabel`
- [ ] 最大30文字、改行/タブを拒否
- [ ] `CompanyTimelineTab`
- [ ] Chatwork形式(info/code/quote)のレンダリング
- [ ] `onAddLabel/onRemoveLabel` を提供
### 6. 気になる点
- [ ] **全文検索**: `to_tsvector(body)` 用の GIN インデックス確認
- [ ] **GETで同期**: on-demand sync がGETに入っている
- [x] **バリデーション**: Zod `min(1)` と `normalizeLabel` の責務が曖昧
- [ ] **トランザクション**: bulk label の更新単位
- [x] **検索条件**: `messageSearchQuerySchema` は `q or messageId` を強制できていない
### 7. 改善案
- [x] `normalizeLabel` に合わせた Zod 制約を整理
- [ ] `searchMessagesHandler` の SQL を読みやすく整理
- [ ] on-demand sync を `POST /messages/sync` へ分離検討
- [ ] `body` の全文検索インデックスを最適化
- [ ] UI のコード構成を整理
### 8. TODO
- [ ] assign/label 操作のUX改善
- [ ] search の `q` と `messageId` の優先順位を明確化
- [ ] on-demand sync の仕様決定

## 07 認証/ユーザー
### 1. 概要
- [ ] JWT 認証と RBAC を提供する
- [ ] 管理者/一般ユーザーのロールで操作を制限する
- [ ] Frontend では `AuthContext` と `ProtectedRoute` で制御
### 2. 関連ファイル
- [ ] `backend/src/routes/auth.ts`, `auth.handlers.ts`
- [ ] `backend/src/routes/users.ts`, `users.handlers.ts`
- [ ] RBAC: `backend/src/middleware/rbac.ts`
- [ ] `frontend/src/contexts/AuthContext.tsx`
- [ ] `frontend/src/components/ProtectedRoute.tsx`
- [ ] `frontend/src/pages/Login.tsx`
- [ ] `frontend/src/pages/AccountCreate.tsx`
### 3. API
- [ ] `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me`
- [ ] `POST /api/users` / `GET /api/users` / `GET /api/users/options` / `PATCH /api/users/:id/role`
### 4. 実装ポイント
- [ ] `buildLoginHandler`
- [ ] email を trim + case-insensitive にし、bcrypt で検証
- [ ] JWT を Cookie と JSON の両方で返す
- [ ] `requireAuth`/`requireAdmin`
- [ ] JWT 検証 + role チェック
- [ ] `AuthContext`
- [ ] localStorage の token で `/auth/me` を取得
- [ ] `AccountCreate`
- [ ] UIでユーザー作成を支援
### 5. 気になる点
- [ ] **Cookie/LocalStorage併用**: XSS/CSRF リスクの整理
- [x] **email 正規化**: lower-case の統一が必要
- [ ] **JWT secret**: 運用/ローテーションの方針が不明
- [ ] **RBAC**: `Role` と `UserRole` の対応が曖昧
### 6. 改善案
- [ ] Cookie or Bearer の運用を明確化
- [x] `trim().toLowerCase()` をDB保存時も統一
- [ ] `Role` と `UserRole` の対応表を整理
- [x] `AuthContext` の `hasToken` と `/auth/me` 取得の整合
### 7. TODO
- [ ] 認証フローのテスト追加
- [ ] 権限変更の監査ログ
- [ ] セッション失効のUI対応

## 08 ダッシュボード/検索/フィードバック
### 1. 概要
- [ ] ダッシュボードでタスクや最新情報のサマリーを表示する
- [ ] 横断検索 API で企業/案件/卸/タスク/連絡先を検索する
- [ ] フィードバック送信と管理を提供する
### 2. 関連ファイル
- [ ] ダッシュボード: `backend/src/routes/dashboard.ts`, `dashboard.handlers.ts`, `dashboard.schemas.ts`
- [ ] 検索: `backend/src/routes/search.ts`, `search.handlers.ts`, `search.schemas.ts`
- [ ] フィードバック: `backend/src/routes/feedback.ts`, `feedback.handlers.ts`, `feedback.schemas.ts`
- [ ] Home: `frontend/src/pages/Home.tsx`
- [ ] Feedback: `frontend/src/pages/Feedback.tsx`
- [ ] 型: `frontend/src/types/dashboard.ts`
### 3. API
- [ ] `GET /api/dashboard`
- [ ] `GET /api/search?q=...&limit=...`
- [ ] `POST /api/feedback` / `GET /api/feedback?type=...` / `PATCH /api/feedback/:id`
### 4. 実装ポイント
- [ ] `getDashboardHandler`
- [ ] overdue/today/soon/week の4区分でタスクを取得
- [ ] `attachTargetInfo` で target を付与
- [ ] 最新サマリー/最近更新の企業/未割当メッセージ数を返す
- [ ] `searchHandler`
- [ ] `q` と `limit` で最大5件を返す
- [ ] `createFeedbackHandler` / `updateFeedbackHandler`
- [ ] 送信者/管理者で権限を分ける
- [ ] `Home.tsx`
- [ ] `useFetch` で `/api/dashboard` を取得
- [ ] `Feedback.tsx`
- [ ] 管理者/一般ユーザーのUI切替
### 5. 気になる点
- [x] **dashboard schema が any**: `dashboardResponseSchema` に `z.any()` が残っている
- [x] **日付計算**: `startOfThreeDays` が +4日、`startOfSevenDays` が +8日になっている
- [ ] **search**: `/api/search` が最大5件固定、`q` 必須チェックが曖昧
- [x] **UI連携**: `unassignedMessageCount` を Home で使っていない
- [ ] **Search API**: UIで使われていない
### 6. 改善案
- [x] `dashboardResponseSchema` を `frontend/src/types/dashboard.ts` と一致させる
- [x] `startOfDayPlus3` など日付計算を正確化
- [ ] `/api/search` に `scope` を追加するか検討
- [x] `unassignedMessageCount` の表示を検討
### 7. TODO
- [ ] ダッシュボードの表示改善
- [ ] feedback の権限整理とUI改善
- [ ] search limit の仕様整理











