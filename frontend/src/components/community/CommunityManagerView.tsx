import { useCallback, useEffect, useState } from 'react'
import {
  Droplets,
  LogOut,
  Home,
  DollarSign,
  Gauge,
  Save,
  Pencil,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

interface Community {
  id: string
  name: string
  country: string
  region: string | null
  currency: string
  tariff_fixed: number
  tariff_per_m3: number
  total_connections: number
}

interface HouseholdRecord {
  household_id: string
  account_number: string
  head_of_household: string
  status: string
  outstanding_balance: number
  meter_id: string | null
  latest_reading_id: string | null
  latest_reading_value: number | null
  latest_reading_date: string | null
  latest_consumption_m3: number | null
}

const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'disconnected']

// Round to at most one decimal place, dropping trailing zeros (avoids float artifacts).
function fmt(n: number): string {
  return String(Math.round(n * 10) / 10)
}

export default function CommunityManagerView() {
  const { logout, user } = useAuth()
  const [community, setCommunity] = useState<Community | null>(null)
  const [records, setRecords] = useState<HouseholdRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = useCallback((communityId: string) => {
    api
      .get(`/communities/${communityId}/records`)
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]))
  }, [])

  useEffect(() => {
    api
      .get('/communities/')
      .then((res) => {
        const list: Community[] = res.data
        if (list.length === 0) {
          setCommunity(null)
          return
        }
        setCommunity(list[0])
        loadRecords(list[0].id)
      })
      .catch(() => setError('Could not load your community.'))
      .finally(() => setLoading(false))
  }, [loadRecords])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-primary-200" />
          <span className="font-bold">FLOW</span>
          <span className="text-primary-300 text-sm hidden sm:inline">Community Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-primary-200">{user?.full_name}</span>
          <button onClick={logout} className="p-1.5 rounded hover:bg-primary-600 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {community ? community.name : 'Community Administration'}
          </h1>
          <p className="text-gray-500 mt-1">
            {community
              ? `${[community.region, community.country].filter(Boolean).join(', ')}`
              : 'Manage your community water system'}
          </p>
          <span className="inline-block mt-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
            Prototype — Pilot Phase
          </span>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {!community ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-700">No community assigned yet</h2>
            <p className="text-gray-500 mt-2">
              Your account is not linked to a community. Contact your program administrator to be
              assigned to the community you manage.
            </p>
          </div>
        ) : (
          <>
            <TariffPanel community={community} onSaved={setCommunity} />
            <HouseholdRecords
              records={records}
              currency={community.currency}
              onChanged={() => loadRecords(community.id)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function TariffPanel({
  community,
  onSaved,
}: {
  community: Community
  onSaved: (c: Community) => void
}) {
  const [editing, setEditing] = useState(false)
  const [fixed, setFixed] = useState(String(community.tariff_fixed))
  const [perM3, setPerM3] = useState(String(community.tariff_per_m3))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.patch(`/communities/${community.id}`, {
        tariff_fixed: parseFloat(fixed) || 0,
        tariff_per_m3: parseFloat(perM3) || 0,
      })
      onSaved(res.data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold">Tariff Structure</h3>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : (
          <button
            onClick={() => {
              setEditing(false)
              setFixed(String(community.tariff_fixed))
              setPerM3(String(community.tariff_per_m3))
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Fixed charge ({community.currency} / month)
          </label>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={fixed}
              onChange={(e) => setFixed(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          ) : (
            <p className="text-xl font-bold text-gray-900">
              {community.currency} {community.tariff_fixed.toFixed(2)}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Cost per cubic meter ({community.currency} / m³)
          </label>
          {editing ? (
            <input
              type="number"
              step="0.01"
              value={perM3}
              onChange={(e) => setPerM3(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          ) : (
            <p className="text-xl font-bold text-gray-900">
              {community.currency} {community.tariff_per_m3.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {editing && (
        <button
          onClick={save}
          disabled={saving}
          className="mt-4 flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save tariff'}
        </button>
      )}
    </div>
  )
}

function HouseholdRecords({
  records,
  currency,
  onChanged,
}: {
  records: HouseholdRecord[]
  currency: string
  onChanged: () => void
}) {
  const [editHousehold, setEditHousehold] = useState<HouseholdRecord | null>(null)
  const [correctReading, setCorrectReading] = useState<HouseholdRecord | null>(null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <Home className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">Households &amp; Readings</h3>
        <span className="text-sm text-gray-400">({records.length})</span>
      </div>

      {records.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">
          No households recorded yet. Field operators can add readings, which will appear here for
          review and correction.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Account</th>
                <th className="py-2 pr-4 font-medium">Household</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Last reading</th>
                <th className="py-2 pr-4 font-medium">Consumption</th>
                <th className="py-2 pr-4 font-medium">Balance</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.household_id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4 font-mono text-gray-600">{r.account_number}</td>
                  <td className="py-2.5 pr-4">{r.head_of_household}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.latest_reading_value != null ? `${fmt(r.latest_reading_value)} m³` : '—'}
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.latest_consumption_m3 != null ? `${fmt(r.latest_consumption_m3)} m³` : '—'}
                  </td>
                  <td className="py-2.5 pr-4">
                    {currency} {r.outstanding_balance.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditHousehold(r)}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setCorrectReading(r)}
                      disabled={!r.latest_reading_id}
                      className="text-amber-600 hover:text-amber-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Fix reading
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editHousehold && (
        <EditHouseholdModal
          record={editHousehold}
          onClose={() => setEditHousehold(null)}
          onSaved={() => {
            setEditHousehold(null)
            onChanged()
          }}
        />
      )}
      {correctReading && (
        <CorrectReadingModal
          record={correctReading}
          onClose={() => setCorrectReading(null)}
          onSaved={() => {
            setCorrectReading(null)
            onChanged()
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    suspended: 'bg-amber-100 text-amber-700',
    disconnected: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EditHouseholdModal({
  record,
  onClose,
  onSaved,
}: {
  record: HouseholdRecord
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(record.head_of_household)
  const [status, setStatus] = useState(record.status)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/households/${record.household_id}`, {
        head_of_household: name,
        status,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Edit household" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Head of household</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 capitalize"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  )
}

function CorrectReadingModal({
  record,
  onClose,
  onSaved,
}: {
  record: HouseholdRecord
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState(String(record.latest_reading_value ?? ''))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!record.latest_reading_id) return
    setSaving(true)
    try {
      await api.patch(`/meters/readings/${record.latest_reading_id}`, {
        reading_value: parseFloat(value) || 0,
        notes: notes || undefined,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Correct meter reading" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-medium text-gray-700">{record.head_of_household}</span> ·{' '}
        {record.account_number}
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">
            <Gauge className="inline h-4 w-4 mr-1 -mt-0.5" />
            Corrected reading value (m³)
          </label>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Reason for correction (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. digit transposed during entry"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save correction'}
        </button>
      </div>
    </Modal>
  )
}
