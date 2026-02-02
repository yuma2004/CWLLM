# 08 ダッシュボード/検索/フィードバック

## 1. 概要
- ダッシュボードでタスクや最新情報のサマリーを表示する
- 横断検索 API で企業/案件/卸/タスク/連絡先を検索する
- フィードバック送信と管理を提供する

## 2. 関連ファイル
### Backend
- ダッシュボード: `backend/src/routes/dashboard.ts`, `dashboard.handlers.ts`, `dashboard.schemas.ts`
- 検索: `backend/src/routes/search.ts`, `search.handlers.ts`, `search.schemas.ts`
- フィードバック: `backend/src/routes/feedback.ts`, `feedback.handlers.ts`, `feedback.schemas.ts`

### Frontend
- Home: `frontend/src/pages/Home.tsx`
- Feedback: `frontend/src/pages/Feedback.tsx`
- 型: `frontend/src/types/dashboard.ts`

## 3. API
- `GET /api/dashboard`
- `GET /api/search?q=...&limit=...`
- `POST /api/feedback` / `GET /api/feedback?type=...` / `PATCH /api/feedback/:id`

## 4. 実装ポイント
- `getDashboardHandler`
  - overdue/today/soon/week の4区分でタスクを取得
  - `attachTargetInfo` で target を付与
  - 最新サマリー/最近更新の企業/未割当メッセージ数を返す
- `searchHandler`
  - `q` と `limit` で最大5件を返す
- `createFeedbackHandler` / `updateFeedbackHandler`
  - 送信者/管理者で権限を分ける
- `Home.tsx`
  - `useFetch` で `/api/dashboard` を取得
- `Feedback.tsx`
  - 管理者/一般ユーザーのUI切替

## 5. 気になる点
- **dashboard schema が any**: `dashboardResponseSchema` に `z.any()` が残っている
- **日付計算**: `startOfThreeDays` が +4日、`startOfSevenDays` が +8日になっている
- **search**: `/api/search` が最大5件固定、`q` 必須チェックが曖昧
- **UI連携**: `unassignedMessageCount` を Home で使っていない
- **Search API**: UIで使われていない

## 6. 改善案
- `dashboardResponseSchema` を `frontend/src/types/dashboard.ts` と一致させる
- `startOfDayPlus3` など日付計算を正確化
- `/api/search` に `scope` を追加するか検討
- `unassignedMessageCount` の表示を検討

## 7. TODO
- ダッシュボードの表示改善
- feedback の権限整理とUI改善
- search limit の仕様整理
