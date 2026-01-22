import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm uppercase text-slate-400">404</p>
      <h2 className="text-2xl font-semibold text-slate-900">ページが見つかりません</h2>
      <p className="text-sm text-slate-500">
        URLが間違っているか、ページが移動した可能性があります。
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        ダッシュボードへ戻る
      </Link>
    </div>
  )
}

export default NotFound
