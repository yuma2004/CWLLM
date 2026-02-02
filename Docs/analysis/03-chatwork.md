# 03 Chatwork連携

## 1. 概要
- Chatwork API を用いてルーム/メッセージを同期する
- Webhook を受け取って最新メッセージを取り込む
- BullMQ による定期/オンデマンド同期を行う

## 2. 関連ファイル
### Backend
- ルート: `backend/src/routes/chatwork.ts`
- ハンドラ: `backend/src/routes/chatwork.handlers.ts`
- スキーマ: `backend/src/routes/chatwork.schemas.ts`
- サービス: `backend/src/services/chatwork.ts`, `chatworkSync.ts`, `chatworkScheduler.ts`
- キュー: `backend/src/services/jobQueue.ts`

### Frontend
- 設定画面: `frontend/src/pages/ChatworkSettings.tsx`

## 3. API
- `POST /api/chatwork/rooms/sync` (ルーム同期)
- `POST /api/chatwork/messages/sync` (メッセージ同期)
- `GET /api/chatwork/rooms`
- `PATCH /api/chatwork/rooms/:id` (isActive 更新)
- `POST /api/chatwork/webhook`
- `GET/POST/DELETE /api/companies/:id/chatwork-rooms`

## 4. 実装の流れ
- 同期
  - `/chatwork/rooms/sync` or `/chatwork/messages/sync` で `enqueueChatwork*Sync`
  - Worker がChatwork APIを呼び出しDBを更新
- Webhook
  - raw JSON 受信 + `CHATWORK_WEBHOOK_TOKEN` 検証
  - roomId 抽出と cooldown 判定後に enqueue
- 定期同期
  - scheduler が Redis lock を獲得してジョブを投入

## 5. 実装詳細
- `syncChatworkRooms` / `syncChatworkMessages`
  - Chatwork API 取得 → Prisma upsert/createMany/update
  - lastSync/lastError を記録
- `chatworkWebhookHandler`
  - payload 検証/署名検証/イベント判定/cooldown 判定/ジョブ投入
- `startChatworkAutoSync`
  - Redis lock の取得後にルーム/メッセージ同期

## 6. 気になる点
- **Webhook token 検証不足**: 署名検証が曖昧
- **cooldown が Map**: プロセス再起動で失われる
- **スキーマが `z.any()`**: 入力検証が弱い
- **UIの複雑さ**: `ChatworkSettings.tsx` が肥大化
- **429対策**: Chatwork API レート制限時の挙動確認

## 7. 改善案
- Webhookを `parse/validate/decide/enqueue` に分割し Zod で厳密化
- `roomId` / `chatworkRoomId` の命名を統一
- `chatwork.schemas.ts` を UI と一致させる
- `ChatworkSettings` の状態と表示を整理
- cooldown を Redis で永続化

## 8. TODO
- Webhookの運用手順を明文化
- cooldown と同期間隔の見直し
- 失敗時のリトライ戦略を検討
