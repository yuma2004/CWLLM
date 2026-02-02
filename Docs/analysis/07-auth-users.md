# 07 認証/ユーザー

## 1. 概要
- JWT 認証と RBAC を提供する
- 管理者/一般ユーザーのロールで操作を制限する
- Frontend では `AuthContext` と `ProtectedRoute` で制御

## 2. 関連ファイル
### Backend
- `backend/src/routes/auth.ts`, `auth.handlers.ts`
- `backend/src/routes/users.ts`, `users.handlers.ts`
- RBAC: `backend/src/middleware/rbac.ts`

### Frontend
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/AccountCreate.tsx`

## 3. API
- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/me`
- `POST /api/users` / `GET /api/users` / `GET /api/users/options` / `PATCH /api/users/:id/role`

## 4. 実装ポイント
- `buildLoginHandler`
  - email を trim + case-insensitive にし、bcrypt で検証
  - JWT を Cookie と JSON の両方で返す
- `requireAuth`/`requireAdmin`
  - JWT 検証 + role チェック
- `AuthContext`
  - localStorage の token で `/auth/me` を取得
- `AccountCreate`
  - UIでユーザー作成を支援

## 5. 気になる点
- **Cookie/LocalStorage併用**: XSS/CSRF リスクの整理
- **email 正規化**: lower-case の統一が必要
- **JWT secret**: 運用/ローテーションの方針が不明
- **RBAC**: `Role` と `UserRole` の対応が曖昧

## 6. 改善案
- Cookie or Bearer の運用を明確化
- `trim().toLowerCase()` をDB保存時も統一
- `Role` と `UserRole` の対応表を整理
- `AuthContext` の `hasToken` と `/auth/me` 取得の整合

## 7. TODO
- 認証フローのテスト追加
- 権限変更の監査ログ
- セッション失効のUI対応
