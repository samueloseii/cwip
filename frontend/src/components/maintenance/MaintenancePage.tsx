import { useEffect, useState } from 'react'
import { Wrench, Plus, AlertTriangle } from 'lucide-react'
import api from '../../services/api'

interface MaintenanceData {
  id: string
  title: string
  category: string
  priority: string
  status: string
  reported_date: string
  resolved_date: string | null
  cost: number
  currency: string
  community_id: string
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/maintenance/')
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  const priorityColor: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }

  const statusColor: Record<string, string> = {
    reported: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    deferred: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">Track and manage maintenance issues</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" />
          Report Issue
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Issue</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reported</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.title}</td>
                  <td className="px-6 py-4 text-sm capitalize text-gray-600">{r.category.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColor[r.priority] || 'bg-gray-100'}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[r.status] || 'bg-gray-100'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(r.reported_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {r.cost > 0 ? `${r.currency} ${r.cost.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No maintenance records found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
