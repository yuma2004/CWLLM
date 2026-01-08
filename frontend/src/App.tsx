import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingState from './components/ui/LoadingState'
import { protectedRoutes, type RouteConfig } from './constants/routes'

const Login = lazy(() => import('./pages/Login'))

const renderProtectedRoute = (route: RouteConfig) => (
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
