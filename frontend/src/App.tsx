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
