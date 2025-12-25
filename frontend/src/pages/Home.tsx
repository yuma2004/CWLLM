import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Dashboard</p>
          <h2 className="text-3xl font-bold text-slate-900">ダッシュボード</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-white/80 px-4 py-2 text-slate-600 shadow">
            {user?.email} ({user?.role})
          </span>
          <button
            onClick={logout}
            className="rounded-full bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">企業マスタ</h3>
          <p className="mt-2 text-sm text-slate-500">
            企業情報の登録・検索・担当者管理をここから開始できます。
          </p>
          <Link
            to="/companies"
            className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            企業一覧へ →
          </Link>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
          タイムラインや要約などの機能は次のマイルストーンで拡張予定です。
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
          Chatwork同期や未紐づけ整理の導線は順次追加します。
        </div>
      </div>
    </div>
  )
}

export default Home
