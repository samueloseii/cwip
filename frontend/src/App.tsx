import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './components/auth/LoginPage'
import DashboardPage from './components/dashboard/DashboardPage'
import CommunitiesPage from './components/communities/CommunitiesPage'
import HouseholdsPage from './components/households/HouseholdsPage'
import MetersPage from './components/meters/MetersPage'
import BillingPage from './components/billing/BillingPage'
import MaintenancePage from './components/maintenance/MaintenancePage'
import AnalyticsPage from './components/reports/AnalyticsPage'
import FieldView from './components/field/FieldView'
import PrintBill from './components/billing/PrintBill'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RoleRouter() {
  const { user, isOperator } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (isOperator) {
    return <FieldView />
  }

  return null
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Operator/Treasurer field view */}
      <Route
        path="/field"
        element={
          <ProtectedRoute>
            <RoleRouter />
          </ProtectedRoute>
        }
      />
      {/* Admin routes */}
      <Route
        element={
          <ProtectedRoute>
            <AdminOrRedirect />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/households" element={<HouseholdsPage />} />
        <Route path="/meters" element={<MetersPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/print" element={<PrintBill />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AdminOrRedirect() {
  const { user, isOperator } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (isOperator) {
    return <Navigate to="/field" replace />
  }

  return <Layout />
}
