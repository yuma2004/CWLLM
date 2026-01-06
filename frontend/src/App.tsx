import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import ChatworkSettings from './pages/ChatworkSettings'
import UnassignedMessages from './pages/UnassignedMessages'
import MessageSearch from './pages/MessageSearch'
import Tasks from './pages/Tasks'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Wholesales from './pages/Wholesales'
import WholesaleDetail from './pages/WholesaleDetail'
import Settings from './pages/Settings'
import Exports from './pages/Exports'

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
  { path: '/projects', element: <Projects /> },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/wholesales', element: <Wholesales /> },
  { path: '/wholesales/:id', element: <WholesaleDetail /> },
  { path: '/settings', element: <Settings />, allowedRoles: ['admin'] },
  { path: '/exports', element: <Exports />, allowedRoles: ['admin'] },
  { path: '/messages/search', element: <MessageSearch /> },
  {
    path: '/messages/unassigned',
    element: <UnassignedMessages />,
    allowedRoles: ['admin', 'sales', 'ops'],
  },
]

const renderProtectedRoute = (route: ProtectedRouteConfig) => (
  <ProtectedRoute allowedRoles={route.allowedRoles}>
    <Layout>{route.element}</Layout>
  </ProtectedRoute>
)

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        {protectedRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={renderProtectedRoute(route)} />
        ))}
      </Routes>
    </AuthProvider>
  )
}

export default App
