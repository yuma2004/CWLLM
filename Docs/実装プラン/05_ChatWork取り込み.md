# 05 ChatWork取り込み（ルーム/メッセージ同期 → 企業に紐づけ）

対応要件：
- `FR-CW-01（Must）` メッセージ（本文/投稿者/日時/ルーム情報）を取得して保存
- `FR-CW-02（Must）` メッセージを企業に紐づけ（手動含む）
- `FR-CW-03（Must）` 1企業に複数ルームを紐づけ
- `FR-CW-05（Should）` 取り込み対象ルームの追加/除外
- `FR-CW-06（Should）` 取り込み失敗の検知（ログ）
- `IF-01（Must）` Chatworkからデータ取得
- 画面：`SCR-07 設定（管理者）` / `SCR-03 企業詳細`

参照：
- `Docs/ChatWork_API仕様.md`

---

## 実装方針（MVP）

- 認証：Chatwork **APIトークン**（`x-chatworktoken`）で開始（OAuth/Webhookは後）
- 同期方式：**ポーリング**（手動実行 + 定期実行）
- ルーム紐づけ：Companyに複数ルームをリンク（CompanyRoomLink）
- 企業紐づけ：紐づけ済みルームのメッセージには `companyId` を自動付与
- 未紐づけ：`companyId = null` のメッセージは「未紐づけ箱」で手動割当できる
- テスト：Chatwork APIはモックし、**トークン無しでもテストが通る**（人間作業を最小化）

---

## 完了条件（DoD）

- AI：ルーム/メッセージがDBに取り込まれ、重複なく差分同期できる
- AI：ルーム↔企業の紐づけで `message.companyId` が自動で付く
- AI：未紐づけメッセージを企業に割り当てられる（API+UI）
- AI：レート制限（429）や一時失敗が起きても、ログに残り再実行可能
- AI：自動テスト（Chatworkモック）で主要ケースを担保し、`git push` 済み
- 人間（必須）：Chatworkトークン投入と、取り込み対象ルームの選定（運用判断）

---

## API一覧（案 / AIが確定）

管理者向け（設定/同期）：
- `GET /chatwork/rooms`（DB上のルーム一覧）
- `POST /chatwork/rooms/sync`（Chatworkからルーム一覧を同期）
- `POST /chatwork/messages/sync`（対象ルームのメッセージを差分同期）
- `PATCH /chatwork/rooms/:id`（include/exclude 等）

企業紐づけ：
- `GET /companies/:id/chatwork-rooms`
- `POST /companies/:id/chatwork-rooms`（リンク追加）
- `DELETE /companies/:id/chatwork-rooms/:roomId`（リンク削除）

未紐づけメッセージ：
- `GET /messages/unassigned`（ページング/検索）
- `PATCH /messages/:id/assign-company`（companyId付与/付け替え）

---

## TODO（TDD）

### 1) Backend：Chatwork APIクライアント（AI）

- [x] `x-chatworktoken` 付きでHTTPリクエストできる薄いクライアントを作る
- [x] 共通：タイムアウト、リトライ（429/一時エラー）、ログ（request_id/room_id）
- [x] レート制限：`429` 時に `x-ratelimit-reset` を見て待機/リトライ（簡易でOK）

### 2) Backend：ルーム同期（AI）

- [x] `GET /rooms`（Chatwork）→ `ChatworkRoom` に upsert（roomIdユニーク）
- [x] include/exclude：`ChatworkRoom.isActive` をトグルできる
- [x] 取り込み対象の条件を統一（isActive=true + 企業に紐づいている、など）

### 3) Backend：メッセージ差分同期（AI）

- [x] ルームごとに「同期位置」（lastMessageId/lastSyncAt）を持ち、差分で取得する
- [x] upsert：`(roomId,messageId)` をキーに重複取り込みしない
- [x] 保存項目：sender/body/sentAt/roomId/messageId（要件Must）
- [x] 紐づけ：CompanyRoomLinkが存在するルームのメッセージは `companyId` を自動付与
- [x] 取り込み失敗：失敗ルーム/エラー内容を保存（最低限：ログ + 管理画面表示）

### 4) Backend：紐づけ管理（AI）

- [x] CompanyRoomLink CRUD（重複リンク防止）
- [x] 既存メッセージへの反映（リンク追加後に「そのルームの既存メッセージへ companyId を付与」するか方針決定）
  - [x] MVP案：リンク追加時に過去メッセージも一括で companyId 付与（バッチ）

### 5) Backend：未紐づけの手動割当（AI）

- [x] `GET /messages/unassigned`（検索/ページング）
- [x] `PATCH /messages/:id/assign-company`（companyId付与/付け替え）
- [x] RBAC：管理系はadmin、割当はwrite権限（admin/sales/ops）

### 6) Backend tests（AI）

- [x] Chatwork APIをモックして「ルーム同期→メッセージ同期」が完走する
- [x] 同じメッセージを2回同期しても重複しない（upsert）
- [x] 企業↔ルームの紐づけで message.companyId が付与される
- [x] include/exclude が効く（除外ルームは同期されない）
- [x] 失敗時にエラーが記録され、再実行で回復できる（最低1ケース）

### 7) Frontend（AI）

設定（管理者）：
- [x] ルーム一覧（include/exclude 切替）
- [x] 「ルーム同期」「メッセージ同期」ボタン（進捗/結果表示）

企業詳細：
- [x] 企業に紐づくルームの一覧＋追加/削除

未紐づけ箱：
- [x] 未紐づけメッセージ一覧（検索/ページング）
- [x] 企業を選んで割当（最小UI）

### 8) AI検証（AIが実行）

- [ ] `cd infra; docker compose up -d`
- [ ] `cd backend; npm ci; npm run prisma:generate; npm run migrate:dev; npm run seed`
- [x] `cd backend; npm run test; npm run lint; npm run build`
- [x] モックで同期のAPIテストが通る（トークンなし）
- [ ] （トークンが投入されている場合）実ルームで `ルーム同期→メッセージ同期` を1回実行し、DBに入ることを確認

### 9) 人間作業（必須のみ / 外部連携）

- [ ] Chatwork APIトークンを用意し、`.env`（`CHATWORK_API_TOKEN`）に投入
- [ ] 取り込み対象ルーム（会社運用としてどのルームを見るか）を決める

### 10) Git（AI）

- [x] `git add -A`
- [x] `git commit -m "feat: chatwork sync errors and message search"`
- [ ] `git push`
