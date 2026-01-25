import { lazy } from 'react'

export type RouteConfig = {
  path: string
  element: JSX.Element
  label?: string
  icon?: JSX.Element
  section?: 'main' | 'settings'
  allowedRoles?: string[]
  end?: boolean
}

const Home = lazy(() => import('../pages/Home'))
const Companies = lazy(() => import('../pages/Companies'))
const CompanyDetail = lazy(() => import('../pages/CompanyDetail'))
const ChatworkSettings = lazy(() => import('../pages/ChatworkSettings'))
const Tasks = lazy(() => import('../pages/Tasks'))
const TaskDetail = lazy(() => import('../pages/TaskDetail'))
const Projects = lazy(() => import('../pages/Projects'))
const ProjectDetail = lazy(() => import('../pages/ProjectDetail'))
const WholesaleDetail = lazy(() => import('../pages/WholesaleDetail'))
const AccountCreate = lazy(() => import('../pages/AccountCreate'))

export const protectedRoutes: RouteConfig[] = [
  {
    path: '/',
    element: <Home />,
    label: 'ダッシュボード',
    section: 'main',
    end: true,
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
  },
  {
    path: '/companies',
    element: <Companies />,
    label: '企業管理',
    section: 'main',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  { path: '/companies/:id', element: <CompanyDetail /> },
  {
    path: '/tasks',
    element: <Tasks />,
    label: 'タスク管理',
    section: 'main',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  { path: '/tasks/:id', element: <TaskDetail /> },
  {
    path: '/projects',
    element: <Projects />,
    label: '案件管理',
    section: 'main',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/wholesales/:id', element: <WholesaleDetail /> },
  {
    path: '/settings/accounts',
    element: <AccountCreate />,
    label: 'アカウント作成',
    section: 'settings',
    allowedRoles: ['admin'],
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 9c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M6 20a6 6 0 0112 0"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 8v4m2-2h-4"
        />
      </svg>
    ),
  },
  {
    path: '/settings/chatwork',
    element: <ChatworkSettings />,
    label: 'Chatwork設定',
    section: 'settings',
    allowedRoles: ['admin'],
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
]
