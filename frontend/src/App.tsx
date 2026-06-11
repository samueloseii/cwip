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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/households" element={<HouseholdsPage />} />
        <Route path="/meters" element={<MetersPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
