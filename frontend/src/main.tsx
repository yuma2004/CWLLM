import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// アプリの起点。root要素にReactをマウントする。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ルーティングの基盤。将来のv7互換オプションを有効化。 */}
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* 画面全体のルートコンポーネント */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
