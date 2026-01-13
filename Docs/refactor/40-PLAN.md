# 実行計画

P0: 事前検証
- Frontend typecheck: PASS (`npm --prefix frontend run typecheck`)
- Backend lint: PASS (`npm --prefix backend run lint`)
- Backend test: PASS (`npm --prefix backend run test -- --run`)
- Frontend test: PASS (`npm --prefix frontend run test -- --run`)

P1: SOLO レーン
- RF-006 useApi の整理

P1: Lane A (backend routes)
- RF-001 companies routes の分割
- RF-002 tasks routes の分割

P1: Lane B (frontend pages)
- RF-003 CompanyDetail の整理
- RF-004 Tasks の整理

P1: Lane C (backend services)
- RF-005 jobQueue の整理

統合
- refactor/integration へマージ
- backend/frontend の lint/typecheck/test 実行
- AI レビュー + 提出物作成

注意
- 各RFは1タスク=1コミット、差分は小さく。
