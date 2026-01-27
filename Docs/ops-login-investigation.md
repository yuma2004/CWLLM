# 本番ログイン調査手順（ログ取得なし・コード変更なし）

この手順は、現在のCWLLM認証フローとRender構成に合わせています。

## 対象範囲
- 本番で「ログインが遅い/できない」の調査。
- アプリのコード変更は行わない。
- 外形計測・設定確認・環境変数の切り替えで原因を切り分ける。

## コードから分かる事実
- ログインAPI: `POST /api/auth/login`
- 処理: ユーザー検索(email) → `bcrypt.compare` → JWT発行 → JSON返却
- `/api/auth/login` にレート制限が有効（`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`）
- `CORS_ORIGINS` が設定されると、登録されたOriginのみ許可
- Production では `JWT_SECRET` と `REDIS_URL` が必須
- Chatwork自動同期 + ジョブワーカーが有効だと負荷が増える可能性

主な参照ファイル:
- `backend/src/routes/auth.ts`
- `backend/src/routes/auth.handlers.ts`
- `backend/src/index.ts`
- `backend/src/config/env.ts`
- `render.yaml`

## 原因候補（コード起点）
1) **レート制限が厳しすぎる**
   - デフォルトは 1分5回（`RATE_LIMIT_MAX=5`, `RATE_LIMIT_WINDOW_MS=60000`）
   - プロキシ設定が誤ると全ユーザーが同一IP扱いになる

2) **CORS設定ミス**
   - 本番で `CORS_ORIGINS` が未設定だと Origin が拒否される
   - フロントとAPIが別ドメインなら特に影響大

3) **バックグラウンド負荷**
   - Chatwork自動同期/ジョブワーカーがAPIと同居
   - 同期頻度が高いとCPU/DBを圧迫

4) **bcrypt比較のCPU負荷**
   - 高負荷時にログイン処理が遅くなりやすい

## チェックリスト
### 1) 外形計測の取得
- ログイン画面のDevToolsで `/api/auth/login` を確認。
- 取得する項目:
  - HTTPステータス（200/401/429/5xx）
  - 応答時間
  - レスポンスヘッダ（`x-ratelimit-remaining`, `x-ratelimit-reset`）
- `/healthz` と比較して基盤遅延かどうか切り分け。

### 2) Renderの設定確認
- `CORS_ORIGINS` に本番フロントのOriginが含まれているか。
- `TRUST_PROXY` がRender構成に合っているか（通常は `true`）。
- `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` が実トラフィックに対して妥当か。
- `VITE_API_BASE_URL` が本番APIを正しく指しているか。

### 3) レート制限の切り分け
- 短時間に複数回ログインして 429 が出るか確認。
- 出る場合:
  - `RATE_LIMIT_MAX` の緩和 or `RATE_LIMIT_WINDOW_MS` 調整。
  - `TRUST_PROXY` を見直し（誤設定は全員同一IP扱い）。

### 4) 負荷/DB切り分け
- RenderメトリクスでAPI CPU/メモリ・DB使用率を確認。
- 一時的に負荷要因を止めて差分確認:
  - `CHATWORK_AUTO_SYNC_ENABLED=false`
  - `JOB_WORKER_ENABLED=false`
- 改善した場合は、片方ずつ戻して原因を特定。

### 5) ネットワーク/リージョン
- ユーザー地域とRenderリージョン（Singapore）のRTTを確認。
- RTTが高い場合はリージョン変更も検討。

## 判定の目安
- **429が多い** → RateLimit/TrustProxy が主因
- **401が多い（正しい認証でも）** → CORS/Origin またはAPI URL設定
- **5xx/タイムアウト** → DB負荷・CPU圧迫・バックグラウンド処理
- **RTTが高い** → リージョン問題

## 最低限集める証拠
- `/api/auth/login` のステータス・応答時間のスクショ/記録
- 現在の設定値:
  - `CORS_ORIGINS`, `TRUST_PROXY`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`
  - `CHATWORK_AUTO_SYNC_ENABLED`, `JOB_WORKER_ENABLED`, `VITE_API_BASE_URL`
- Renderメトリクス（遅延発生時のCPU/DB）
