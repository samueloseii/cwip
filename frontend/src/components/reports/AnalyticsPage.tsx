import { useEffect, useState } from 'react'
import {
  BarChart3,
  AlertTriangle,
  TrendingDown,
  Wrench,
  Shield,
} from 'lucide-react'
import api from '../../services/api'

interface Community {
  id: string
  name: string
}

export default function AnalyticsPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<string>('')
  const [paymentRisk, setPaymentRisk] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [maintenancePriority, setMaintenancePriority] = useState<any[]>([])
  const [financialAlerts, setFinancialAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/communities/').then((res) => {
      setCommunities(res.data)
      if (res.data.length > 0) {
        setSelectedCommunity(res.data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedCommunity) return
    setLoading(true)
    Promise.all([
      api.get(`/analytics/payment-risk/${selectedCommunity}`),
      api.get(`/analytics/consumption-anomalies/${selectedCommunity}`),
      api.get(`/analytics/maintenance-priority/${selectedCommunity}`),
      api.get(`/analytics/financial-alerts/${selectedCommunity}`),
    ])
      .then(([risk, anom, maint, alerts]) => {
        setPaymentRisk(risk.data)
        setAnomalies(anom.data)
        setMaintenancePriority(maint.data)
        setFinancialAlerts(alerts.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedCommunity])

  const riskColor: Record<string, string> = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-green-600 bg-green-50',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Analytics</h1>
          <p className="text-gray-500 mt-1">Intelligent insights and recommendations</p>
        </div>
        <select
          value={selectedCommunity}
          onChange={(e) => setSelectedCommunity(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
        >
          {communities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Sustainability Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Financial Alerts</h3>
            </div>
            <div className="space-y-3">
              {financialAlerts.map((alert, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <p className="font-medium text-sm">{alert.message}</p>
                  <p className="text-xs mt-1 text-gray-600">{alert.recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Risk */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold">Payment Risk</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paymentRisk.filter(r => r.risk_level !== 'low').slice(0, 10).map((r, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${riskColor[r.risk_level]}`}>
                  <div>
                    <p className="text-sm font-medium">{r.head_of_household}</p>
                    <p className="text-xs opacity-75">{r.account_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${r.total_arrears.toFixed(2)}</p>
                    <p className="text-xs">{r.overdue_invoices} overdue</p>
                  </div>
                </div>
              ))}
              {paymentRisk.filter(r => r.risk_level !== 'low').length === 0 && (
                <p className="text-gray-500 text-sm">No payment risk detected</p>
              )}
            </div>
          </div>

          {/* Consumption Anomalies */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Consumption Anomalies</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {anomalies.map((a, i) => (
                <div key={i} className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-800">{a.message}</p>
                  <p className="text-xs text-purple-600 mt-1">Meter: {a.serial_number}</p>
                </div>
              ))}
              {anomalies.length === 0 && (
                <p className="text-gray-500 text-sm">No anomalies detected</p>
              )}
            </div>
          </div>

          {/* Maintenance Priority */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Maintenance Priority</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {maintenancePriority.slice(0, 8).map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.recommendation}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    m.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    m.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {m.priority}
                  </span>
                </div>
              ))}
              {maintenancePriority.length === 0 && (
                <p className="text-gray-500 text-sm">No pending maintenance</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
