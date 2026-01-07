# Backend 一括実行 Todo（漏れなし版 / 現行コード準拠）

## ゴール
- 本番事故リスク（起動時seed・依存固定不足・Prisma例外で500・コスト境界崩れ）を確実に除去
- API入力検証（Zod）とエラー応答を整流し、OpenAPI(/api/docs)を実運用可能にする
- DB検索（messages）をスケール可能にし、監査ログの非原子問題を解消
- CIでlint/build/testを自動化して回帰を防ぐ

## 重要ルール（作業中）
- 変更はこのTodo順に実施（1→2→3…）
- 途中で「ビルド/テストが通らない状態」を長時間放置しない（各章末で必ず確認）
- 本番適用前に必ずDBスナップショット/バックアップを取る

---

## 0. 作業前（必須）
### 0.1 ブランチ作成・ベースライン確立
- [ ] `git checkout -b chore/backend-hardening-YYYYMMDD`
- [ ] 現状の起動/テスト状態を記録（READMEが未整備なら自分用メモでよい）
  - [ ] ローカルに `.env` を用意し最低限を設定
    - [ ] `DATABASE_URL=...`
    - [ ] `JWT_SECRET=...`（強ランダム）
    - [ ] `REDIS_URL=...`
  - [ ] `npm install`
  - [ ] `npm run build`
  - [ ] `npm test`（落ちたらログを保存）

### 0.2 本番DBの安全策（本番反映前の必須準備）
- [ ] 本番DBのスナップショット/バックアップ手順を確定（クラウド標準機能）
- [ ] ロールバック方針を決める
  - [ ] アプリ：直前イメージ/タグへ戻す
  - [ ] DB：本章で追加するインデックスは原則“戻さなくても動く”が、必要ならDROP手順を用意

---

## 1. ビルド/デプロイの致命傷を除去（最優先）
### 1.1 lockfile追加（再現性・Docker/CI安定化）
- [ ] `rm -rf node_modules`
- [ ] `npm install`（package-lock.json生成）
- [ ] `git add package-lock.json`
- [ ] `npm ci` が通ることを確認
  - [ ] `npm ci`
  - [ ] `npm run build`

### 1.2 Dockerfileのビルド前提を満たす
- [ ] `Dockerfile` が `COPY package.json package-lock.json ./` 前提で問題ないことを確認
- [ ] Docker build確認
  - [ ] `docker build -t cwllm-backend:dev .`

### 1.3 起動時seedをデフォルトで走らせない（重大事故対策）
対象：`Dockerfile`, `prisma/seed.ts`
- [ ] `Dockerfile` の `CMD` から `node dist/prisma/seed.js` を撤去
  - [ ] 現状：`migrate deploy -> seed -> server` の順を修正して `seed` を外す
- [ ] seedを実行したい場合の明示手段を用意（どちらか）
  - [ ] 方式A（推奨）：`docker/entrypoint.sh` 追加し `RUN_SEED=true` の時だけ seed
  - [ ] 方式B（最小）：READMEに「手動で seed 実行」手順を明記（本番で常時実行しない）
- [ ] `prisma/seed.ts` のadminパスワード事故を根絶
  - [ ] `ADMIN_PASSWORD || 'admin123'` のデフォルト撤廃
    - [ ] `ADMIN_PASSWORD` 未設定なら **admin作成をスキップ** するか **seed自体を失敗**（どちらかを決める）
  - [ ] 既存adminがいる場合に `password` を `update` しない（毎回上書き事故を止める）
    - [ ] 既存：admin存在時に `prisma.user.update(... password ...)` を実行している挙動を改める
- [ ] 動作確認
  - [ ] 通常起動で seed が走らない
  - [ ] （方式Aの場合）`RUN_SEED=true` でのみ seed が走る

### 1.4 Prisma migrateの実行方式を安定化（npx依存の排除）
- [ ] 方針を決めて実装（どちらか）
  - [ ] 方針A（推奨）：`prisma` CLI を `dependencies` に移す（runtimeでも確実に使える）
  - [ ] 方針B：runtimeでもdevDepsを含める（短期回避）
- [ ] `npm run build` 後、Docker runで起動が成立することを確認
  - [ ] `docker run --rm -p 3000:3000 --env-file .env cwllm-backend:dev`
- [ ] （可能なら）ネットワーク制限環境でも起動できることを想定し、`npx`のダウンロード依存がないことを確認

---

## 2. 共通基盤の底上げ（以降の修正コストを下げる）
対象：`src/index.ts`

### 2.1 Prisma既知エラーをグローバルでHTTP 4xxに正規化
- [ ] `src/index.ts` の `setErrorHandler` を拡張
  - [ ] `import { Prisma } from '@prisma/client'`
  - [ ] `error instanceof Prisma.PrismaClientKnownRequestError` を判定
  - [ ] code→HTTPマッピング（最低限）
    - [ ] `P2025` → 404
    - [ ] `P2002` → 409
    - [ ] `P2003` → 400
  - [ ] 返却ペイロードを統一（message/details等）
    - [ ] 機密を含む可能性のある詳細は本番では出さない方針を採用（messageは短く）
- [ ] 手動確認（最低限）
  - [ ] 存在しないID更新（P2025）で500ではなく404になること

### 2.2 ログ秘匿（Authorization/Cookie/token）
- [ ] Fastify logger（pino）に `redact` を設定
  - [ ] `req.headers.authorization`
  - [ ] `req.headers.cookie`
  - [ ] `request.cookies.token` 相当
- [ ] 手動確認：ログに平文トークンが出ないこと

### 2.3 Graceful shutdown（SIGTERM/SIGINT）
- [ ] `process.on('SIGTERM')` / `process.on('SIGINT')` を追加
- [ ] `await fastify.close()` を呼ぶ
- [ ] `fastify.addHook('onClose', ...)` で `prisma.$disconnect()` を実行（`src/utils/prisma.ts` の `prisma` を利用）
- [ ] 手動確認：SIGTERMでハングせず終了する

### 2.x この章の確認
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test`

---

## 3. 認証・認可の境界を固める（セキュリティの中核）
### 3.1 AuthルートにZodバリデーション（不正入力で500を出さない）
対象：`src/routes/auth.ts`, `src/routes/auth.test.ts`
- [ ] authRoutesを `withTypeProvider<ZodTypeProvider>()` 対応
- [ ] login body schema追加
  - [ ] `email: z.string().email()`
  - [ ] `password: z.string().min(1)`
- [ ] バリデーション不正 → 400
- [ ] 資格情報不一致 → 401（現行挙動維持）
- [ ] テスト追加
  - [ ] `{}` で 400
  - [ ] 誤パスワードで 401

### 3.2 RBACの堅牢化（境界固定）
対象：`src/middleware/rbac.ts`, `src/middleware/rbac.test.ts`
- [ ] `requireAuth()` が `request.user` の必須フィールド欠落時に 401 を返す
- [ ] roleセットを定数化（可読性・事故防止）
- [ ] テスト追加
  - [ ] role欠落トークン → 401
  - [ ] 不正role → 401/403（どちらかに統一）

### 3.3 高コスト処理の権限境界修正（必須）
対象：`src/routes/summaries.ts`, `src/routes/summaries.test.ts`
- [ ] `/companies/:id/summaries/draft` の preHandler を `requireWriteAccess()` に変更（or同等）
- [ ] readonly で叩いたら 403
- [ ] 既存テストが通る（必要なら最小修正）

### 3.x この章の確認
- [ ] `npm test`

---

## 4. 主要ルートの入力検証（Zod）＋OpenAPIを“実運用可能”に整備
### 4.1 Users：500/整合性/キャッシュ無効化
対象：`src/routes/users.ts`, `src/utils/ttlCache.ts`, `src/routes/users.test.ts`（新規）
- [ ] `ttlCache.ts` に `deleteCache(key)` を追加（Mapから削除）
- [ ] `users.ts` を withTypeProvider 化し schema追加（body/params/response）
  - [ ] Create body：email/password/role（email形式、role enum、password min）
  - [ ] `:id` params：空文字排除
- [ ] create と role update で Prismaエラー整流
  - [ ] try/catch + `handlePrismaError` を使用（または2章のグローバル変換を補助としてもOK）
- [ ] create/role update 後に `deleteCache('users:options')`
- [ ] テスト新規追加
  - [ ] duplicate email → 409
  - [ ] 存在しないid更新 → 404
  - [ ] options が更新直後に反映

### 4.2 Chatwork：schema化してdocsに載せる
対象：`src/routes/chatwork.ts`, `src/routes/chatwork.test.ts`
- [ ] withTypeProvider化
- [ ] schema追加（body/params/response）
  - [ ] roomId/companyId 等は空文字排除
- [ ] 既存テストが通る

### 4.3 Search：q/limitガードレール
対象：`src/routes/search.ts`
- [ ] query schema追加
  - [ ] `q: min(1), max(100)`（必要なら調整）
  - [ ] `limit: z.coerce.number().int().min(1).max(20).default(5)`
- [ ] 400時のメッセージを統一
- [ ] /api/docs に表示

### 4.4 Settings：valueサイズ制限
対象：`src/routes/settings.ts`
- [ ] key/value schema化
  - [ ] `key: min(1).max(100)`
  - [ ] `value` はJSON文字列化サイズで上限（例16KB）
- [ ] 超過は 400
- [ ] /api/docs に表示

### 4.5 Export：CSV Injection対策（式注入防止）
対象：`src/routes/export.ts`
- [ ] query schema化（status/targetType/datetime等）
- [ ] CSV出力でセル先頭が `= + - @` の場合に `'` を付与して無害化
- [ ] 手動でCSV生成を確認（式が無効化されている）

### 4.6 Dashboard：schema化＋日付境界明確化
対象：`src/routes/dashboard.ts`
- [ ] response schema追加
- [ ] `today/overdue` の境界（timezone）を仕様として固定
  - [ ] 破壊的変更回避なら「現状維持＋明文化」
  - [ ] 可能ならUTC基準へ寄せる（影響が出るなら現状維持）

### 4.7 Jobs：cancel終端扱い＋stack露出制御＋型整合
対象：`src/routes/jobs.ts`
- [ ] `terminalStatuses` に `canceled` を含める
- [ ] 非adminには `job.error.stack` を返さない（`{name,message}`に縮退 or null）
- [ ] Querystringの型定義をZod schemaに合わせる（enum/string不整合解消）

### 4.x この章の確認
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `/api/docs` で主要ルートが表示されることを確認

---

## 5. DB性能の下地（messages検索のスケール）
### 5.1 message検索/labels用インデックスを追加（migration）
対象：`prisma/migrations/<new>/migration.sql`
- [ ] 新規 migration を作成（既存ルールに合わせる）
- [ ] 以下のインデックス追加（Postgres）
  - [ ] `Message.body` FTS: `GIN(to_tsvector('simple', "body"))`
  - [ ] `Message.labels` : `GIN("labels")`
- [ ] Prisma migrateの制約で `CONCURRENTLY` が難しい場合の運用をREADMEに追記（後でも可）
- [ ] 適用確認
  - [ ] migrationが通る
  - [ ] 可能なら `EXPLAIN` でindex使用を確認

### 5.x この章の確認
- [ ] `npm test`（テストDBにもmigrationが適用されること）

---

## 6. 監査ログの非原子問題を解消（成功しているのに失敗応答を止める）
対象：`src/services/audit.ts`
### 6.1 audit insert失敗でmain requestを落とさない（best-effort）
- [ ] `logAudit` を try/catch で包む
- [ ] productionでは例外を飲む（ログ等で検知可能にする）
- [ ] 非productionでの扱い（throw継続 or warn）を決める
- [ ] 影響が広いので全体テストを通す

### 6.x この章の確認
- [ ] `npm test`

---

## 7. CI導入（回帰混入を止める）
対象：`.github/workflows/ci.yml`（新規）
### 7.1 lint/build/test を自動化
- [ ] workflow作成
  - [ ] Node 18（現行に合わせる）
  - [ ] Postgres service起動
  - [ ] `DATABASE_URL_TEST` を env で設定（vitest globalSetupが使う）
  - [ ] `npm ci` → `npm run lint` → `npm run build` → `npm test`
- [ ] PR/PushでCIが走り、グリーンになることを確認

---

## 8. ドキュメント整備（属人性排除）
### 8.1 `.env.example` 追加/更新
- [ ] `DATABASE_URL=`
- [ ] `DATABASE_URL_TEST=`
- [ ] `JWT_SECRET=`
- [ ] `REDIS_URL=`
- [ ] `CHATWORK_API_TOKEN=`
- [ ] `OPENAI_API_KEY=`
- [ ] `CORS_ORIGINS=`
- [ ] `TRUST_PROXY=`
- [ ] （導入した場合）`RUN_MIGRATIONS=`, `RUN_SEED=`

### 8.2 `README.md` 追加/更新
最低限の章を追加
- [ ] ローカル起動手順（DB/Redis）
- [ ] migrate手順（dev/prod）
- [ ] seed手順（いつ、誰が、どう実行するか。起動時は走らない）
- [ ] テスト実行（DATABASE_URL_TEST）
- [ ] `/api/docs` の確認方法

---

## 9. 手動スモークテスト（本番相当）
- [ ] `POST /api/auth/login` 正常/異常（400/401/200）
- [ ] adminで users 作成 / role更新（409/404含む）
- [ ] readonlyで summaries draft → 403
- [ ] chatwork sync がenqueueされ jobsで追跡できる
- [ ] exportがCSVを返し、先頭式が無害化される
- [ ] messages検索が動作する（可能なら速度も確認）

---

## 10. 本番リリース手順（推奨）
- [ ] stagingで適用（可能なら）
- [ ] 本番DBスナップショット取得
- [ ] migrate適用（インデックス作成は時間帯注意）
- [ ] デプロイ
- [ ] smoke test（9章）
- [ ] 監視（ログ/エラー率/レイテンシ）確認して完了

---

## 11. ロールバック手順（必ず文書化）
- [ ] アプリ：直前イメージへ戻す（タグ/リビジョン）
- [ ] DB：
  - [ ] 追加インデックスは原則そのままでも動く
  - [ ] 必要なら `DROP INDEX` 手順を用意
  - [ ] 重大時はスナップショットから復元
