# クラスター01: 認証・ユーザー管理（JWT/RBAC）

## 目的/範囲
- ログイン/ログアウト/現在ユーザー取得
- JWT ベースの認証・セッション復元
- RBAC（admin/sales/ops/readonly）によるアクセス制御
- ユーザー作成・一覧・ロール変更（adminのみ）
- 参照用ユーザー候補（users/options）の配布

## ドメインモデル（Prisma）
- User: `id`, `email`(unique), `password`(hash), `role`, `createdAt`, `updatedAt`
  - relation: `companies/projects/wholesales/tasks/jobs` の owner/assignee として参照
- UserRole enum: `admin`, `sales`, `ops`, `readonly`

## 依存関係
- Fastify JWT/Cookie/RateLimit（`@fastify/jwt`, `@fastify/cookie`, `@fastify/rate-limit`）
- bcryptjs（パスワードハッシュ）
- PostgreSQL + Prisma（`User`, `UserRole`）
- `backend/src/config/env.ts`（`JWT_SECRET`, `RATE_LIMIT_*`, `CORS_ORIGINS`）
- ブラウザ localStorage（`auth_token`）+ Cookie（`token`）

## バックエンド構成
### ルーティング/モジュール
- `backend/src/index.ts`
  - JWT 抽出: Authorization → Cookie の優先順
  - `rateLimit`/CORS/Swagger を登録
  - `setErrorHandler` と `preSerialization` でエラーを正規化
- `backend/src/routes/auth.ts`: `/api/auth/*` を `authRoutes` で登録
- `backend/src/routes/users.ts`: `/api/users*` を `userRoutes` で登録
- `backend/src/middleware/rbac.ts`: `requireAuth`, `requireAdmin`, `requireWriteAccess`
- `backend/src/types/auth.ts`: `JWTUser` 型
- `backend/src/utils/validation.ts`: `validatePassword` など
- `backend/src/utils/ttlCache.ts`: users/options の TTL キャッシュ
- `backend/src/utils/errors.ts`, `backend/src/utils/prisma.ts`

### API/エンドポイント詳細
- `POST /api/auth/login`
  - Zod: `email`, `password`
  - `prisma.user.findUnique` → `bcrypt.compare`
  - `fastify.jwt.sign({ userId, role }, expiresIn: '7d')`
  - `setCookie('token', ...)` + `{ token, user }` を返却
  - rateLimit: `env.rateLimitMax` / `env.rateLimitWindowMs`
- `POST /api/auth/logout`
  - `clearCookie('token')`
- `GET /api/auth/me`
  - `request.jwtVerify()` → `JWTUser`
  - `prisma.user.findUnique(select id/email/role)`
  - 401: JWT 失敗, 404: ユーザー無し
- `POST /api/users`
  - `requireAdmin`
  - `validatePassword` + `UserRole` のホワイトリストチェック
  - `bcrypt.hash(..., 10)` → `prisma.user.create`
  - `deleteCache('users:options')`
- `GET /api/users`
  - `requireAdmin`, `createdAt desc` で一覧
- `GET /api/users/options`
  - `requireAuth`, TTL 30s キャッシュ
  - `id/email/role` のみ返却
- `PATCH /api/users/:id/role`
  - `requireAdmin`, 役割バリデーション
  - 更新後 `deleteCache('users:options')`

### 関数索引（バックエンド）
- `authRoutes(fastify)` (`backend/src/routes/auth.ts`)
  - login/logout/me の登録
- `userRoutes(fastify)` (`backend/src/routes/users.ts`)
  - create/list/options/update role の登録
- `requireAuth(allowedRoles?)` (`backend/src/middleware/rbac.ts`)
  - `jwtVerify` + 役割チェック
- `requireAdmin()`, `requireWriteAccess()` (`backend/src/middleware/rbac.ts`)
  - `requireAuth` のラッパ
- `validatePassword(value)` (`backend/src/utils/validation.ts`)
  - 8文字以上 + 英字/数字を必須
- `getCache/setCache/deleteCache` (`backend/src/utils/ttlCache.ts`)
  - `users:options` の TTL 制御
- `handlePrismaError` (`backend/src/utils/prisma.ts`)
  - Prisma エラー → API エラー変換

## フロントエンド構成
- `frontend/src/contexts/AuthContext.tsx`
  - `/api/auth/me` で初期化、`login`/`logout` を提供
  - `VITE_MOCK_AUTH=true`（非 prod）でモックユーザー固定
- `frontend/src/components/ProtectedRoute.tsx`
  - `allowedRoles` による画面ガード
- `frontend/src/hooks/usePermissions.ts`
  - `canWrite`/`isAdmin` の派生計算
- `frontend/src/pages/Login.tsx`
  - ログイン UI → `useAuth().login`
- `frontend/src/lib/apiClient.ts`
  - `Authorization: Bearer <auth_token>` を付与
  - `credentials: 'include'` で Cookie を同送
- `frontend/src/lib/apiRoutes.ts`
  - `/api/auth/*`, `/api/users*` の URL 組み立て
- `frontend/src/hooks/useApi.ts`, `frontend/src/hooks/useApiClient.ts`
  - Abort/Retry/Cache と `ApiRequestError` 伝播
- `frontend/src/constants/routes.tsx`
  - `protectedRoutes` と `allowedRoles` によるナビ制御

### 関数索引（フロントエンド）
- `AuthProvider` (`AuthContext.tsx`)
  - `login`: `/auth/login` → token 保存 → user 更新
  - `logout`: `/auth/logout` → token 削除 → user 破棄
- `useAuth` (`AuthContext.tsx`)
  - AuthContext 取得
- `ProtectedRoute` (`ProtectedRoute.tsx`)
  - 未ログインは `/login` へ遷移
  - `allowedRoles` 不一致は 403 相当のメッセージ
- `usePermissions` (`usePermissions.ts`)
  - `role` から `canWrite`/`isAdmin` を導出
- `apiRequest/apiSend` (`apiClient.ts`)
  - ヘッダー/ボディ整形 + エラー変換

## データフロー
- ログイン: `Login.tsx` → `AuthContext.login` → `/api/auth/login`
  - 成功時 `localStorage.auth_token` 保存 + cookie 付与
- セッション復元: `AuthContext` → `/api/auth/me` で user 取得
  - 401 の場合は user を null に戻す
- API 認証: `apiClient` で Authorization 付与
  - バックエンドは Authorization → Cookie の順に検証
- 権限判定: UI (`ProtectedRoute`) + API (`requireAuth/requireAdmin/requireWriteAccess`)

## 関連テスト
- backend: `backend/src/routes/auth.test.ts`, `backend/src/routes/users.test.ts`, `backend/src/middleware/rbac.test.ts`, `backend/src/index.test.ts`
- frontend: `frontend/src/components/ProtectedRoute.test.tsx`, `frontend/src/hooks/useApi.test.tsx`

## 他クラスターとの接点
- ほぼ全 API ルートが `requireAuth`/`requireWriteAccess` を利用
- `users/options` は Companies/Projects/Tasks/Exports などの担当者候補に利用
