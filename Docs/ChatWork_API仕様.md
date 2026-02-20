# Chatwork API 仕様メモ（v2）

最終更新: 2026-02-20

## 参照元

- 公式ドキュメント: https://developer.chatwork.com/docs/getting-started
- エンドポイント一覧: https://developer.chatwork.com/docs/endpoints
- メッセージ記法: https://developer.chatwork.com/docs/message-notation
- OAuth 2.0: https://developer.chatwork.com/docs/oauth
- Webhook: https://developer.chatwork.com/docs/webhook
- API Reference: https://developer.chatwork.com/reference

## 基本情報

- ベース URL: `https://api.chatwork.com/v2`
- 通信方式: HTTPS
- 主要レスポンス形式: JSON
- POST/PUT の多くは `application/x-www-form-urlencoded` を利用

## 認証

### APIトークン方式

- リクエストヘッダー `x-chatworktoken` にトークンを設定

```bash
curl -H "x-chatworktoken: <YOUR_TOKEN>" https://api.chatwork.com/v2/me
```

### OAuth 2.0（Bearer Token）

- `Authorization: Bearer <access_token>` を使用

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://api.chatwork.com/v2/me
```

## レート制限

- 全体制限: 5分あたり300リクエスト
- 主なレスポンスヘッダー:
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`（Unix time）
- 超過時は `429 Too Many Requests`

### ルーム投稿系の追加制限

- 対象:
- `POST /rooms/{room_id}/messages`
- `POST /rooms/{room_id}/tasks`
- 目安: 10秒あたり10リクエスト
- 超過時は `429` とエラーメッセージを返す

## よく使うエンドポイント

- `GET /me`: ログインユーザー情報
- `GET /rooms`: 参加ルーム一覧
- `GET /rooms/{room_id}/messages`: メッセージ取得
- `POST /rooms/{room_id}/messages`: メッセージ投稿
- `GET /rooms/{room_id}/tasks`: タスク一覧
- `POST /rooms/{room_id}/tasks`: タスク作成

## エラーハンドリング方針

- `429` は待機してリトライ
- `5xx` は指数バックオフでリトライ
- `401/403` はトークン失効や権限不足として扱う
- ルーム単位で失敗を記録し、同期ジョブ全体を止めない
