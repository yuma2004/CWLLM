import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingState from './components/ui/LoadingState'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Companies = lazy(() => import('./pages/Companies'))
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'))
const ChatworkSettings = lazy(() => import('./pages/ChatworkSettings'))
const Tasks = lazy(() => import('./pages/Tasks'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Wholesales = lazy(() => import('./pages/Wholesales'))
const WholesaleDetail = lazy(() => import('./pages/WholesaleDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Exports = lazy(() => import('./pages/Exports'))

type ProtectedRouteConfig = {
  path: string
  element: JSX.Element
  allowedRoles?: string[]
}

const protectedRoutes: ProtectedRouteConfig[] = [
  { path: '/', element: <Home /> },
  { path: '/companies', element: <Companies /> },
  { path: '/companies/:id', element: <CompanyDetail /> },
  { path: '/settings/chatwork', element: <ChatworkSettings />, allowedRoles: ['admin'] },
  { path: '/tasks', element: <Tasks /> },
  { path: '/tasks/:id', element: <TaskDetail /> },
  { path: '/projects', element: <Projects /> },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/wholesales', element: <Wholesales /> },
  { path: '/wholesales/:id', element: <WholesaleDetail /> },
  { path: '/settings', element: <Settings />, allowedRoles: ['admin'] },
  { path: '/exports', element: <Exports />, allowedRoles: ['admin'] },
]

const renderProtectedRoute = (route: ProtectedRouteConfig) => (
  <ProtectedRoute allowedRoles={route.allowedRoles}>
    <Layout>{route.element}</Layout>
  </ProtectedRoute>
)

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          {protectedRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={renderProtectedRoute(route)} />
          ))}
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
