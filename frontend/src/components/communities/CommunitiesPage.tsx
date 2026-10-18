import { useEffect, useState } from 'react'
import { MapPin, Users, Plus, UserCog, X } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

interface Community {
  id: string
  name: string
  country: string
  region: string | null
  total_connections: number
  water_system_type: string
  community_size: string
  currency: string
  tariff_fixed: number
  tariff_per_m3: number
}

interface Operator {
  id: string
  full_name: string
  email: string
  community_id: string | null
}

const emptyForm = {
  name: '',
  country: '',
  region: '',
  currency: 'USD',
  water_system_type: 'gravity_fed',
  tariff_fixed: '',
  tariff_per_m3: '',
}

export default function CommunitiesPage() {
  const { isAdmin } = useAuth()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [operators, setOperators] = useState<Operator[]>([])
  const [assignOperator, setAssignOperator] = useState('')
  const [assignCommunity, setAssignCommunity] = useState('')

  function load() {
    setLoading(true)
    api.get('/communities/')
      .then((res) => setCommunities(res.data))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const systemTypeLabel: Record<string, string> = {
    gravity_fed: 'Gravity-Fed',
    pumped: 'Pumped',
    mixed: 'Mixed',
  }

  async function handleCreate() {
    setError('')
    if (!form.name.trim() || !form.country.trim()) {
      setError('Community name and country are required.')
      return
    }
    setSaving(true)
    try {
      await api.post('/communities/', {
        name: form.name.trim(),
        country: form.country.trim(),
        region: form.region.trim() || null,
        currency: form.currency.trim() || 'USD',
        water_system_type: form.water_system_type,
        tariff_fixed: parseFloat(form.tariff_fixed) || 0,
        tariff_per_m3: parseFloat(form.tariff_per_m3) || 0,
      })
      setForm({ ...emptyForm })
      setShowCreate(false)
      load()
    } catch {
      setError('Could not create the community. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function openAssign() {
    api.get('/auth/users?role=operator')
      .then((res) => setOperators(res.data))
      .catch(() => setOperators([]))
    setError('')
    setAssignOperator('')
    setAssignCommunity('')
    setShowAssign(true)
  }

  async function handleAssign() {
    setError('')
    if (!assignOperator || !assignCommunity) {
      setError('Select both an operator and a community.')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/auth/users/${assignOperator}/community`, {
        community_id: assignCommunity,
      })
      setShowAssign(false)
    } catch {
      setError('Could not assign the operator. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-500 mt-1">Community water systems</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={openAssign}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserCog className="h-4 w-4" />
              Assign Operator
            </button>
            <button
              onClick={() => { setForm({ ...emptyForm }); setError(''); setShowCreate(true) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Community
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : communities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 text-center py-16 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No communities yet.</p>
          {isAdmin && <p className="text-sm mt-1">Use "Create Community" to add the first pilot system.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {c.region ? `${c.region}, ` : ''}{c.country}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  c.water_system_type === 'gravity_fed' ? 'bg-green-100 text-green-700' :
                  c.water_system_type === 'pumped' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {systemTypeLabel[c.water_system_type] || c.water_system_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    Connections
                  </div>
                  <p className="font-semibold mt-1">{c.total_connections}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500">Tariff</p>
                  <p className="font-semibold mt-1">{c.currency} {c.tariff_fixed} + {c.tariff_per_m3}/m³</p>
                </div>
              </div>

              <a
                href={`/communities/${c.id}`}
                className="block mt-4 text-center py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                View Details
              </a>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Community" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <Field label="Community name">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. San Juan del Sur" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <input className={inputCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Nicaragua" />
              </Field>
              <Field label="Region (optional)">
                <input className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Rivas" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency">
                <input className={inputCls} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="e.g. NIO" />
              </Field>
              <Field label="Water system">
                <select className={inputCls} value={form.water_system_type} onChange={(e) => setForm({ ...form, water_system_type: e.target.value })}>
                  <option value="gravity_fed">Gravity-Fed</option>
                  <option value="pumped">Pumped</option>
                  <option value="mixed">Mixed</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fixed monthly charge">
                <input type="number" step="0.01" className={inputCls} value={form.tariff_fixed} onChange={(e) => setForm({ ...form, tariff_fixed: e.target.value })} placeholder="0.00" />
              </Field>
              <Field label="Cost per m³">
                <input type="number" step="0.01" className={inputCls} value={form.tariff_per_m3} onChange={(e) => setForm({ ...form, tariff_per_m3: e.target.value })} placeholder="0.00" />
              </Field>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleCreate} disabled={saving} className={btnCls}>
              {saving ? 'Creating…' : 'Create Community'}
            </button>
          </div>
        </Modal>
      )}

      {showAssign && (
        <Modal title="Assign Operator to Community" onClose={() => setShowAssign(false)}>
          <div className="space-y-4">
            <Field label="Operator">
              <select className={inputCls} value={assignOperator} onChange={(e) => setAssignOperator(e.target.value)}>
                <option value="">— Select operator —</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.full_name} ({o.email})</option>
                ))}
              </select>
            </Field>
            <Field label="Community">
              <select className={inputCls} value={assignCommunity} onChange={(e) => setAssignCommunity(e.target.value)}>
                <option value="">— Select community —</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-gray-500">Once assigned, the operator records readings and payments for this community.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleAssign} disabled={saving} className={btnCls}>
              {saving ? 'Assigning…' : 'Assign Operator'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
const btnCls = 'w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
