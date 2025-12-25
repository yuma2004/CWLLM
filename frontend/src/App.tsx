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

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <Layout>
                <Companies />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CompanyDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/chatwork"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <ChatworkSettings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesales"
          element={
            <ProtectedRoute>
              <Layout>
                <Wholesales />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesales/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <WholesaleDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <Exports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/search"
          element={
            <ProtectedRoute>
              <Layout>
                <MessageSearch />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/unassigned"
          element={
            <ProtectedRoute allowedRoles={['admin', 'sales', 'ops']}>
              <Layout>
                <UnassignedMessages />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
