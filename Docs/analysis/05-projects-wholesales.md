# 05 プロジェクト/卸

## 1. 概要
- 企業に紐づく Project を管理する
- Project に紐づく Wholesale を管理する
- ProjectDetail で Project と Wholesales を横断的に確認する

## 2. 関連ファイル
### Backend
- Projects: `backend/src/routes/projects.ts`, `projects.handlers.ts`, `projects.schemas.ts`
- Wholesales: `backend/src/routes/wholesales.ts`, `wholesales.handlers.ts`, `wholesales.schemas.ts`

### Frontend
- Projects 一覧: `frontend/src/pages/Projects.tsx`
- Project + Wholesales: `frontend/src/pages/ProjectDetail.tsx`
- Wholesale 詳細: `frontend/src/pages/WholesaleDetail.tsx`

## 3. API
- Project CRUD + `/projects/:id/wholesales`
- Wholesale CRUD + `/companies/:id/wholesales`

## 4. 実装ポイント
- `createProjectHandler` / `updateProjectHandler`
  - 企業(Company)の存在を検証
- `createWholesaleHandler` / `updateWholesaleHandler`
  - Project/Company の関係を検証
- `ProjectDetail.tsx`
  - Project と Wholesale の一覧/フォーム/詳細を集約

## 5. 気になる点
- **unitPrice が null**: UI で null を送ると backend で 400 になる
- **Wholesales の schema**: Zod と Fastify schema が不一致
- **taxType**: UIとDB/APIで表記が揺れている
- **projectWholesalesResponseSchema**: `status` 型が曖昧

## 6. 改善案
- Projects と Wholesales の form/state を整理
- Wholesales API の schema を OpenAPI と一致させる
- null/undefined の扱いを統一

## 7. TODO
- project/wholesale のUI改善
- unitPrice の入力・保存フローの修正
- ProjectDetail の状態管理整理
