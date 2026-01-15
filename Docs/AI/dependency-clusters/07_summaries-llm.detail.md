# クラスター07 詳細: サマリー・LLM

## 目的/範囲
- メッセージ履歴から非同期ジョブでサマリー下書きを生成。
- メタデータ/来歴を含めてサマリーを保存。
- サマリー本文からタスク候補を抽出。

## データモデル（Prisma）
- SummaryDraft: `companyId`, `periodStart`, `periodEnd`, `content`, `sourceLinks`, `model`, `promptVersion`, `sourceMessageCount`, `tokenUsage`, `expiresAt`。
- Summary: `companyId`, `periodStart`, `periodEnd`, `content`, `type`, `sourceLinks`, `model`, `promptVersion`, `sourceMessageCount`, `tokenUsage`。
- SummaryType: `manual`, `auto`。
- Job: サマリー下書きジョブの payload と状態を記録。

## バックエンド構成
### サマリールート
- `backend/src/routes/summaries.ts`
  - POST `/api/companies/:id/summaries/draft`
    - 期間レンジと会社を検証。
    - 未失効のキャッシュ下書きがあれば返却。
    - それ以外は `summary_draft` ジョブを enqueue し、202 を返す。
  - POST `/api/companies/:id/summaries`
    - サマリーを保存（手動/自動）。
    - `draftId` があれば下書きから不足メタデータを補完。
  - GET `/api/companies/:id/summaries`
    - 会社のサマリー一覧を新しい順で返却。
  - POST `/api/summaries/:id/tasks/candidates`
    - サマリーMarkdownを解析してタスク候補を抽出。
    - 「Next Actions」「Open Items」配下の箇条書きを対象。
    - `YYYY-MM-DD` があれば日付を抽出。

### 下書き生成
- `backend/src/services/summaryGenerator.ts`
  - `selectMessagesForSummary`:
    - メッセージ上限を 300 に制限（`MAX_MESSAGES`）。
    - 最新60%を保持し、古いメッセージはバケットでサンプリング。
    - `sentAt` 昇順で返却。
  - `generateSummaryDraft`:
    - メッセージがない場合は空の既定サマリーを作成。
    - メッセージがある場合は `createLLMClient().summarize` を実行。
    - 7日TTLで `SummaryDraft` を upsert。
    - model/promptVersion/sourceMessageCount/tokenUsage を記録。

### LLMクライアント
- `backend/src/services/llm.ts`
  - `MockLLMClient` はローカル/開発用（APIキー不要）。
    - 上位メッセージとキーワード抽出から簡易セクションを生成。
  - `OpenAILLMClient` は実運用のリクエスト向け:
    - `SYSTEM_PROMPT` と `REDUCE_PROMPT` で出力フォーマットを定義。
    - メッセージ数が `CHUNK_SIZE`（40）超の場合は map-reduce を使用。
    - トークン使用量を計測し、リクエスト間で集計。
  - `createLLMClient` は `OPENAI_API_KEY` があれば OpenAI、なければ mock を選択。

### ジョブ実行
- `backend/src/services/jobQueue.ts`
  - `JobType.summary_draft` を `generateSummaryDraft` で処理。
  - `jobs.result` に下書きメタデータ付きの結果を書き込む。

### 環境依存
- `OPENAI_API_KEY` と任意の `OPENAI_MODEL`。
- 本番の非同期ジョブには Redis が必須（ジョブ基盤クラスター参照）。

## フロントエンド構成
### ダッシュボード表示
- `frontend/src/pages/Home.tsx`
  - `/api/dashboard` から `latestSummaries` を表示。
  - サマリーの抜粋と企業詳細へのリンクを表示。

### 型と契約
- `frontend/src/types/entities.ts` が `Summary`, `SummaryDraft`, `SummaryCandidate` を定義。
- `frontend/src/types/dashboard.ts` がホーム表示用の `DashboardSummary` を定義。

## データフロー詳細
- 下書き生成:
  - UI（または他クライアント）が下書きを要求 -> ジョブ作成 -> ワーカーがメッセージ選定 -> LLM 要約 -> 下書き upsert -> ジョブ完了。
  - TTL 内の再リクエストはキャッシュ下書きを即時返却。
- サマリー作成:
  - クライアントが本文/メタデータを送信し、サーバが任意の下書きメタデータを補完。
- タスク候補抽出:
  - Markdown 解析で指定見出し配下の箇条書きだけを走査。

## 依存関係
- Prisma（SummaryDraft, Summary, Message, Company, Job）。
- OpenAI API または mock サマライザ。
- 非同期下書き生成のジョブ基盤。

## テスト
- `backend/src/routes/summaries.test.ts`
- `backend/src/services/llm.test.ts`

## 他クラスターとの接点
- メッセージクラスター（クラスター05）から入力を取得。
- 下書き生成はジョブ基盤（クラスター08）で実行。
- ダッシュボードに最新サマリーを表示（クラスター09）。
