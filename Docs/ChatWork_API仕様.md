# Chatwork API v2 仕様まとめ（一次情報リンク付き）

最終更新: 2025-12-25  
一次情報:  
- Docs（はじめに/共通仕様）: https://developer.chatwork.com/docs/getting-started  
- エンドポイント共通仕様・レート制限: https://developer.chatwork.com/docs/endpoints  
- メッセージ記法: https://developer.chatwork.com/docs/message-notation  
- OAuth 2.0: https://developer.chatwork.com/docs/oauth  
- Webhook: https://developer.chatwork.com/docs/webhook  
- Reference（エンドポイント詳細）: https://developer.chatwork.com/reference  

## 概要

- Chatwork API は REST 原則に基づく API。
- ベース URI: `https://api.chatwork.com/v2`
- 必須: HTTPS（HTTP は接続エラー）
- ※ API は KDDI Chatwork でも利用可能。

## 認証

### 1) APIトークン（従来方式）

- すべてのリクエストで HTTP ヘッダー `x-chatworktoken` に API トークンを設定する。
- API トークンは有効期限がなく、機能にフルアクセス可能なため取り扱い注意（クエリ文字列に入れずヘッダーで送る）。

例:
```bash
curl -H "x-chatworktoken: <YOUR_TOKEN>" https://api.chatwork.com/v2/me
```

### 2) OAuth 2.0（Bearer Token）

- Chatwork API は OAuth 2.0（Authorization Code）をサポート。
- アクセストークン取得後は `authorization: Bearer <access_token>` でアクセス。

関連 URL（公式）:
- 認可: `https://www.chatwork.com/packages/oauth2/login.php`
- トークン発行/再発行: `https://oauth.chatwork.com/token`

例:
```bash
curl -H "authorization: Bearer <ACCESS_TOKEN>" https://api.chatwork.com/v2/me
```

## リクエスト/レスポンスの共通仕様

### リクエスト

- POST/PUT のリクエストボディは `content-type: application/x-www-form-urlencoded` が必要。
- ファイルアップロードは `multipart/form-data`。

### レスポンス

- レスポンスボディは JSON。
- 成否は JSON 内ではなく HTTP ステータスコードで判定する。
- エラー時は `errors` キーに配列でメッセージが返る（例: APIトークン誤りで 401 / `["Invalid API token"]`）。

## レート制限

### API全体の利用回数制限

- 上限: **5分あたり300回**
- レスポンスヘッダーで参照:
  - `x-ratelimit-limit`: 最大回数
  - `x-ratelimit-remaining`: 残り回数
  - `x-ratelimit-reset`: リセット時刻（Unix時間・秒）
- 超過すると `429 (Too Many Requests)`

### チャットルーム単位の投稿回数制限（追加制限）

上記に加え、以下は合算で **10秒あたり10回** の制限:
- `POST /rooms/{room_id}/messages`
- `POST /rooms/{room_id}/tasks`

超過すると `429` かつ例として次のようなエラーが返る:
```json
{ "errors": ["Rate limit for message posting per room exceeded."] }
```

## エンドポイント一覧（Chatwork API v2）

補足:
- すべて `https://api.chatwork.com/v2` 配下。
- OAuth の場合は「スコープ（いずれか）」を満たす必要あり（APIトークンの場合は `x-chatworktoken`）。

| Method | Path | 概要 | OAuthスコープ（いずれか） |
| --- | --- | --- | --- |
| `GET` | `/me` | 自分の情報を取得する | `users.all:read`, `users.profile.me:read` |
| `GET` | `/my/status` | 自分の状態を取得する | `users.all:read`, `users.status.me:read` |
| `GET` | `/my/tasks` | 自分のタスク一覧を取得する | `users.all:read`, `users.tasks.me:read` |
| `GET` | `/contacts` | コンタクト一覧を取得する | `contacts.all:read`, `contacts.all:read_write` |
| `GET` | `/incoming_requests` | コンタクト承認依頼一覧を取得する | `contacts.all:read`, `contacts.all:read_write` |
| `PUT` | `/incoming_requests/{request_id}` | コンタクト承認依頼を承認する | `contacts.all:read_write`, `contacts.all:write` |
| `DELETE` | `/incoming_requests/{request_id}` | コンタクト承認依頼を拒否する | `contacts.all:read_write`, `contacts.all:write` |
| `GET` | `/rooms` | チャット一覧を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.info:read` |
| `POST` | `/rooms` | グループチャットを作成する | `rooms.all:read_write`, `rooms.all:write`, `rooms:write` |
| `GET` | `/rooms/{room_id}` | チャットの情報を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.info:read` |
| `PUT` | `/rooms/{room_id}` | チャットの情報を変更する | `rooms.all:read_write`, `rooms.all:write`, `rooms.info:write` |
| `DELETE` | `/rooms/{room_id}` | チャットを退席/削除する | `rooms.all:read_write`, `rooms.all:write`, `rooms.info:write` |
| `GET` | `/rooms/{room_id}/members` | チャットのメンバー一覧を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.members:read` |
| `PUT` | `/rooms/{room_id}/members` | チャットのメンバーを変更する | `rooms.all:read_write`, `rooms.all:write`, `rooms.members:write` |
| `GET` | `/rooms/{room_id}/messages` | チャットのメッセージ一覧を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.messages:read` |
| `POST` | `/rooms/{room_id}/messages` | チャットにメッセージを投稿する | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `PUT` | `/rooms/{room_id}/messages/read` | チャットのメッセージを既読にする | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `PUT` | `/rooms/{room_id}/messages/unread` | チャットのメッセージを未読にする | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `GET` | `/rooms/{room_id}/messages/{message_id}` | チャットのメッセージを取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.messages:read` |
| `PUT` | `/rooms/{room_id}/messages/{message_id}` | チャットのメッセージを更新する | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `DELETE` | `/rooms/{room_id}/messages/{message_id}` | チャットのメッセージを削除する | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `GET` | `/rooms/{room_id}/tasks` | チャットのタスク一覧を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.tasks:read` |
| `POST` | `/rooms/{room_id}/tasks` | チャットにタスクを追加する | `rooms.all:read_write`, `rooms.all:write`, `rooms.tasks:write` |
| `GET` | `/rooms/{room_id}/tasks/{task_id}` | チャットのタスクの情報を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.tasks:read` |
| `PUT` | `/rooms/{room_id}/tasks/{task_id}/status` | チャットのタスクの完了状態を変更する | `rooms.all:read_write`, `rooms.all:write`, `rooms.tasks:write` |
| `GET` | `/rooms/{room_id}/files` | チャットのファイル一覧を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.files:read` |
| `POST` | `/rooms/{room_id}/files` | チャットにファイルをアップロードする | `rooms.all:read_write`, `rooms.all:write`, `rooms.messages:write` |
| `GET` | `/rooms/{room_id}/files/{file_id}` | チャットのファイルの情報を取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.files:read` |
| `GET` | `/rooms/{room_id}/link` | チャットへの招待リンクを取得する | `rooms.all:read`, `rooms.all:read_write`, `rooms.info:read` |
| `POST` | `/rooms/{room_id}/link` | チャットへの招待リンクを作成する | `rooms.all:read_write`, `rooms.all:write`, `rooms.info:write` |
| `PUT` | `/rooms/{room_id}/link` | チャットへの招待リンクを変更する | `rooms.all:read_write`, `rooms.all:write`, `rooms.info:write` |
| `DELETE` | `/rooms/{room_id}/link` | チャットへの招待リンクを削除する | `rooms.all:read_write`, `rooms.all:write`, `rooms.info:write` |

## 主要パラメータ・注意点（抜粋）

- `GET /my/tasks`（クエリ）:
  - `assigned_by_account_id`: 依頼者のアカウントID
  - `status`: 完了状態
- `POST /rooms`（フォーム）:
  - `name`（必須）
  - `members_admin_ids`（必須・カンマ区切り）
  - `members_member_ids`, `members_readonly_ids`（任意・カンマ区切り）
  - 招待リンク関連: `link`, `link_code`, `link_need_acceptance`, `description`
- `DELETE /rooms/{room_id}`（フォーム）:
  - `action_type`（必須）: `leave`（退席）/ `delete`（削除）
- `GET /rooms/{room_id}/messages`（クエリ）:
  - `force`: `0`（既定）は差分、`1` は強制的に最大件数まで取得
- `PUT /rooms/{room_id}/messages/unread`（フォーム）:
  - `message_id`（必須）: 指定 ID 以降を未読にする。既に未読の場合は 400 エラー
- `POST /rooms/{room_id}/tasks`（フォーム）:
  - `body`（必須）: タスク内容
  - `to_ids`（必須・カンマ区切り）: 担当者アカウントID
  - `limit`（任意）: 期限（Unix時間・秒）
  - `limit_type`（任意）: `none`/`date`/`time`
- `POST /rooms/{room_id}/files`（multipart）:
  - `file`（必須）: バイナリ（上限 5MB）
  - `message`（任意）: 添付時に投稿するメッセージ
- `GET /rooms/{room_id}/files/{file_id}`（クエリ）:
  - `create_download_url`: `1` でダウンロードURL作成（有効期限 30 秒）

## メッセージ記法（Chatwork記法）

代表的な記法（詳細は公式を参照）:
- To: `[To:{account_id}]`
- 返信: `[rp aid={account_id} to={room_id}-{message_id}]`
- 引用: `[qt]...[/qt]` / `[qtmeta aid={account_id} time={timestamp}]`
- インフォメーション: `[info]...[/info]`
- インフォメーション＋タイトル: `[info][title]...[/title]...[/info]`
- 罫線: `[hr]`
- アカウント表示: `[picon:{account_id}]` / `[pname:{account_id}]` / `[piconname:{account_id}]`
- URL: `[url]...[/url]`

## Webhook

### できること

- 参加ルームでのメッセージ送信/編集、自分へのメンション等のイベントを、設定した Webhook URL にリアルタイム通知。
- Webhook URL は Webhook 管理画面から設定（1アカウントあたり最大 5 件）。

### 通知仕様（概要）

- Chatwork Webhook は、設定した Webhook URL に HTTPS `POST` を送る。
- 共通ヘッダー例:
  - `user-agent: ChatWork-Webhook/<version>`
  - `x-chatworkwebhooksignature: <signature>`（署名検証用）
- 共通ボディ（抜粋）:
  - `webhook_setting_id`
  - `webhook_event_type`（例: `message_created`, `message_updated`, `mention_to_me`）
  - `webhook_event_time`（Unix時間・秒）
  - `webhook_event`（イベント種別ごとのオブジェクト）

### 失敗時の扱い

- Webhook 通知の HTTPS POST は、失敗しても再送されない。
- 通知エラーレートが高い場合、Webhook 設定が自動で「無効」になる（有効化はユーザー操作が必要）。

### 署名検証（重要）

公式の手順（要約）:
1. トークンを Base64 デコードしたバイト列を秘密鍵にする
2. Webhook の HTTPS リクエストボディを**そのままの文字列**で取得する
3. リクエストボディと秘密鍵で **HMAC-SHA256** のダイジェスト値を計算する
4. ダイジェスト値を Base64 エンコードし、署名（`x-chatworkwebhooksignature` ヘッダー、または `chatwork_webhook_signature` パラメータ）と一致することを確認する

### Webhook URL の制限

- `https://` で始まること
- 国際化ドメインは RFC3490 の ToASCII 変換済みであること
- URL は RFC3986 に従って適切にエンコードされていること

## OAuth 2.0 スコープ一覧（Reference/OpenAPI掲載分）

- `contacts.all:read`: 自分のコンタクト、及びコンタクト承認依頼情報の取得
- `contacts.all:read_write`: 自分のコンタクト、及びコンタクト承認依頼情報の取得/操作
- `contacts.all:write`: 自分あてのコンタクト承認依頼情報を操作
- `offline_access`: 永続的なAPIアクセスの許可
- `rooms.all:read`: チャットルームに紐づくメッセージ・タスク・ファイル・概要・メンバー情報の取得
- `rooms.all:read_write`: チャットルームに紐づくメッセージ・タスク・ファイル・概要・メンバー情報の操作/取得
- `rooms.all:write`: チャットルームに紐づくメッセージ・タスク・ファイル・概要・メンバー情報の操作
- `rooms.files:read`: 自分が参加しているチャットルームにアップロードされているファイル情報を取得
- `rooms.files:write`: 自分が参加しているチャットルームへのファイルのアップロード
- `rooms.info:read`: 自分が参加しているチャットルーム一覧の取得
- `rooms.info:write`: 自分が参加しているチャットルーム情報の更新
- `rooms.members:read`: 自分が参加しているチャットルームのメンバーの取得
- `rooms.members:write`: 自分が参加しているチャットルームのメンバーの追加/削除/権限変更
- `rooms.messages:read`: 自分が参加しているチャットルームのメッセージ取得
- `rooms.messages:write`: 自分が参加しているチャットルームへのメッセージ投稿
- `rooms.tasks:read`: 自分が参加しているチャットルームのタスク取得
- `rooms.tasks:write`: 自分が参加しているチャットルームでタスクを作成
- `rooms:write`: チャットルームの作成と参加しているチャットルームの削除
- `users.all:read`: 自分のアカウントに紐づく情報の取得
- `users.profile.me:read`: 自分のプロフィール情報の取得
- `users.status.me:read`: 自分の未既読数の取得
- `users.tasks.me:read`: 自分のタスク一覧の取得

