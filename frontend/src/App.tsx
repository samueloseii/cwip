import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import LoginPage from './components/auth/LoginPage'
import DashboardPage from './components/dashboard/DashboardPage'
import CommunitiesPage from './components/communities/CommunitiesPage'
import HouseholdsPage from './components/households/HouseholdsPage'
import HouseholdDetailPage from './components/households/HouseholdDetailPage'
import BillingPage from './components/billing/BillingPage'
import ExpensesPage from './components/expenses/ExpensesPage'
import MaintenancePage from './components/maintenance/MaintenancePage'
import AnalyticsPage from './components/reports/AnalyticsPage'
import UsersPage from './components/users/UsersPage'
import FieldView from './components/field/FieldView'
import PrintBill from './components/billing/PrintBill'
import { Spinner } from './components/ui'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function FieldOrRedirect() {
  const { user, isField } = useAuth()
  if (!user) return <Spinner />
  return isField ? <FieldView /> : <Navigate to="/" replace />
}

function AdminOrRedirect() {
  const { user, isField } = useAuth()
  if (!user) return <Spinner />
  if (isField) return <Navigate to="/field" replace />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Field view: operators and readers */}
      <Route
        path="/field"
        element={
          <ProtectedRoute>
            <FieldOrRedirect />
          </ProtectedRoute>
        }
      />
      {/* Administration: system admins and treasurers */}
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
        <Route path="/households/:householdId" element={<HouseholdDetailPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/print" element={<PrintBill />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/team" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
