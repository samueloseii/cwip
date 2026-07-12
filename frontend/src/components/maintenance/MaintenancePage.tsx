import { useEffect, useState } from 'react'
import { Wrench, Plus, X } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

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

interface CommunityOption {
  id: string
  name: string
  currency: string
}

const CATEGORIES = [
  'pipe_repair', 'valve_replacement', 'pump_maintenance', 'tank_cleaning',
  'meter_repair', 'chlorination', 'electrical', 'infrastructure', 'other',
]
const PRIORITIES = ['low', 'medium', 'high', 'critical']

export default function MaintenancePage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<MaintenanceData[]>([])
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'other', priority: 'medium',
    community_id: '', cost: '',
  })

  function load() {
    setLoading(true)
    api.get('/maintenance/')
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/communities/')
      .then((res) => setCommunities(res.data))
      .catch(() => setCommunities([]))
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

  function openReport() {
    setForm({
      title: '', description: '', category: 'other', priority: 'medium',
      community_id: communities[0]?.id || '', cost: '',
    })
    setError('')
    setShowReport(true)
  }

  async function handleReport() {
    setError('')
    if (!form.title.trim() || !form.community_id) {
      setError('A short title and a community are required.')
      return
    }
    setSaving(true)
    const community = communities.find((c) => c.id === form.community_id)
    try {
      await api.post('/maintenance/', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        priority: form.priority,
        reported_date: new Date().toISOString(),
        cost: parseFloat(form.cost) || 0,
        currency: community?.currency || 'USD',
        reported_by: user?.full_name || null,
        community_id: form.community_id,
      })
      setShowReport(false)
      load()
    } catch {
      setError('Could not submit the issue. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">Track and manage maintenance issues</p>
        </div>
        <button
          onClick={openReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
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

      {showReport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Report Issue</h2>
              <button onClick={() => setShowReport(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Broken pipe near tank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Community</label>
                <select className={inputCls} value={form.community_id} onChange={(e) => setForm({ ...form, community_id: e.target.value })}>
                  <option value="">— Select community —</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated cost (optional)</label>
                <input type="number" step="0.01" className={inputCls} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={handleReport} disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                {saving ? 'Submitting…' : 'Submit Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
