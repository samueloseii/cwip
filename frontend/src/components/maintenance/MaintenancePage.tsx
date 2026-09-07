import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Trash2, Wrench } from 'lucide-react'
import api from '../../services/api'
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  formatDate,
  inputClass,
} from '../ui'

interface MaintenanceRecord {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  reported_date: string
  resolved_date: string | null
  reported_by: string | null
  reported_via_whatsapp: boolean
  resolved_by: string | null
  community_id: string
  community_name: string | null
}

const statuses = ['reported', 'in_progress', 'completed', 'deferred']
const priorities = ['low', 'medium', 'high', 'critical']

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [openOnly, setOpenOnly] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/maintenance/', {
        params: { limit: 300, ...(openOnly ? { open_only: true } : {}) },
      })
      setRecords(res.data)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [openOnly])

  useEffect(() => {
    load()
  }, [load])

  async function patch(id: string, changes: Partial<MaintenanceRecord>) {
    const res = await api.patch(`/maintenance/${id}`, changes)
    setRecords((prev) => prev.map((r) => (r.id === id ? res.data : r)))
  }

  async function remove(record: MaintenanceRecord) {
    if (!window.confirm(`Delete the report "${record.title}"?`)) return
    await api.delete(`/maintenance/${record.id}`)
    setRecords((prev) => prev.filter((r) => r.id !== record.id))
  }

  const openCount = records.filter((r) => r.status !== 'completed').length
  const urgentCount = records.filter(
    (r) => r.status !== 'completed' && (r.priority === 'high' || r.priority === 'critical'),
  ).length

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Issues reported by operators in the field. Costs are recorded under Expenses."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Reports shown" value={records.length} />
        <StatCard label="Still open" value={openCount} tone={openCount ? 'warning' : 'positive'} />
        <StatCard
          label="High or critical"
          value={urgentCount}
          tone={urgentCount ? 'danger' : 'positive'}
        />
      </div>

      <label className="flex items-center gap-2 mb-6 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={openOnly}
          onChange={(e) => setOpenOnly(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600"
        />
        Show only unresolved issues
      </label>

      {loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-6 py-3">Issue</th>
                  <th className="px-6 py-3">Community</th>
                  <th className="px-6 py-3">Reported</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      {r.description && (
                        <p className="text-gray-500 mt-0.5 max-w-md">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge value={r.category} />
                        {r.reported_via_whatsapp && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                            <MessageCircle className="h-3 w-3" />
                            Committee notified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.community_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(r.reported_date)}
                      {r.reported_by && (
                        <span className="block text-xs text-gray-400">{r.reported_by}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={r.priority}
                        onChange={(e) => patch(r.id, { priority: e.target.value })}
                        className={`${inputClass} py-1.5 capitalize`}
                      >
                        {priorities.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={r.status}
                        onChange={(e) => patch(r.id, { status: e.target.value })}
                        className={`${inputClass} py-1.5 capitalize`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      {r.resolved_date && (
                        <span className="block text-xs text-gray-400 mt-1">
                          resolved {formatDate(r.resolved_date)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        aria-label={`Delete ${r.title}`}
                        className="text-gray-300 hover:text-red-600"
                        onClick={() => remove(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <EmptyState
              icon={Wrench}
              title="No maintenance reports"
              hint="Operators report issues from the field view."
            />
          )}
        </Card>
      )}
    </div>
  )
}
