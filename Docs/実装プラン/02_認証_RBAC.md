# 02 認証 / RBAC

対応要件：
- `NFR-SEC-01（Must）` 認証（ログイン）必須
- `NFR-SEC-02（Must）` ロールに基づくアクセス制御
- `要件定義書 5章` 想定ロール（Admin / 営業 / 運用 / 閲覧のみ）

---

## 方針（MVP）

- アプリ内ユーザーをDBで管理（初期adminはシード）
- 認証は「ログイン→セッション（JWT or サーバーセッション）」のどちらでも可
- 権限は **API側で強制**（フロントは表示制御のみで、権限の最終判断はバックエンド）

---

## 完了条件（DoD）

- AI：Cookie/Authorizationの両方で認証できる（少なくともCookieが動く）
- AI：RBACが「APIで」強制される（readonlyは更新系403）
- AI：`frontend` から `backend` の認証APIに到達できる（`/api` プレフィックス整合）
- AI：自動テストが「実装（routes/middleware）」を直接検証している（テスト内にルートをコピペしない）
- AI：`backend`/`frontend` の `lint`/`test`/`build` が成功し、`git push` 済み

---

## TODO（TDD）

### Backend（AI）

- [x] `POST /auth/login`（成功/失敗）
- [x] `POST /auth/logout`
- [x] `GET /auth/me`
- [x] ロール：`admin`, `sales`, `ops`, `readonly`（仮）
- [x] ガード/ミドルウェアで RBAC を実装（ルート単位）
- [x] Adminのみ：ユーザー作成/ロール変更（最小でOK）
- [x] APIのベースパスを統一する（推奨：`/api/*` をbackendに寄せる or frontendの`/api`を外す）
- [x] Cookieからも `jwtVerify` できるよう `@fastify/jwt` を設定（例：`cookie: { cookieName: 'token', signed: false }`）
- [x] `requireAuth()` が Cookie/Authorization の両方で動くことを確認（コメントと実装を一致させる）

### Backend tests（AI）

- [x] パスワードハッシュ検証（bcrypt等）
- [x] 未ログインは 401
- [x] ロール不足は 403
- [x] readonly は更新系を拒否
- [x] `authRoutes`/`rbac` の「実ファイル」を登録してテストする（テスト内でルート実装を複製しない）
- [x] Cookieログイン→Cookie付きリクエストで保護ルートに通るテストを追加
- [x] `/api` プレフィックスの疎通テスト（フロント想定のパスで404にならない）

### Frontend（AI）

- [x] ログイン画面
- [x] ログイン状態の保持（cookie/ヘッダ）
- [x] 画面のガード（未ログインはログインへ）
- [x] ロールに応じたメニュー表示（ただしAPIが本体）
- [x] `fetch` のパスをbackendと一致させる（`/api` を含めるならbackend側も対応）
- [x] `ProtectedRoute` の挙動をテストで担保（未ログイン→/login、ロール不足→拒否表示）

### AI検証（AIが実行）

- [ ] `cd infra; docker compose up -d`
- [ ] `cd backend; npm ci; npm run prisma:generate; npm run migrate:dev; npm run seed`
- [ ] `cd backend; npm run test; npm run lint; npm run build`
- [ ] `cd frontend; npm ci; npm run test; npm run lint; npm run build`
- [ ] `backend`/`frontend` を起動し、ログイン→トップ画面遷移ができる（E2E or 最小スモーク）

### 人間作業（必須のみ）

- [ ] 初期ユーザー（admin/sales/ops/readonly）のメール/パスワードを運用に合わせて変更する（`backend/prisma/seed.ts`）
- [ ] 本番用の `JWT_SECRET` を決めて安全に管理する

### Git（AI）

- [ ] `git add -A`
- [ ] `git commit -m "feat: auth and rbac"`
- [ ] `git push`
