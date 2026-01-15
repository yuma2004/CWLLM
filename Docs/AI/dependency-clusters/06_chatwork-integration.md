# クラスター06: Chatwork連携・同期

## 目的/範囲
- Chatworkルーム同期、メッセージ同期
- 会社とルームの紐付け
- ルーム有効/無効の管理

## 依存関係
- Chatwork API（`CHATWORK_API_TOKEN`, `CHATWORK_API_BASE_URL`）
- BullMQ/Redis（ジョブ実行）
- Prisma（ChatworkRoom, Message, CompanyRoomLink）

## バックエンド構成
- `backend/src/routes/chatwork.ts`
- `backend/src/services/chatwork.ts`
- `backend/src/services/chatworkSync.ts`
- `backend/src/services/jobQueue.ts`
- `backend/src/config/env.ts`
- `backend/src/utils/prisma.ts`

## フロントエンド構成
- `frontend/src/pages/ChatworkSettings.tsx`
- `frontend/src/components/ui/JobProgressCard.tsx`
- `frontend/src/pages/CompanyDetail.tsx`（ルーム紐付け）
- `frontend/src/types/entities.ts`

## データフロー
- ルーム同期: `POST /api/chatwork/rooms/sync` → Job作成 → worker が Chatwork API → `chatworkRoom` upsert。
- メッセージ同期: `POST /api/chatwork/messages/sync` → Job → `messages` createMany。
- ルーム連携: `POST /api/companies/:id/chatwork-rooms` → CompanyRoomLink 作成 → 既存 messages に companyId 付与。
- ルーム無効化: `PATCH /api/chatwork/rooms/:id` → `isActive` 切替。

## 関連テスト
- `backend/src/routes/chatwork.test.ts`

## 他クラスターとの接点
- Job基盤クラスター（enqueueJob/worker）に依存。
- メッセージクラスターへデータ供給。
- CompanyDetail から紐付けUIで Companies クラスターと連携。
