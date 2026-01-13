# Refactor God Pack（リファクタ神パック）

リファクタリングを安全に進めるための役割分担パック。

## 使い方
1) $refactor-god-orchestrator
2) レーンを3本に分けて並列実行
   - $refactor-god-worker LANE=A MODE=DRAIN
   - $refactor-god-worker LANE=B MODE=DRAIN
   - $refactor-god-worker LANE=C MODE=DRAIN
3) 統合
   - $refactor-god-integrator
4) AIレビューと提出物作成
   - $refactor-god-ai-review
   - $refactor-god-ship
