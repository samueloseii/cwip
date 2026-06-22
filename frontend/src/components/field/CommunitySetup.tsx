import { useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import api from '../../services/api'

interface Props {
  onComplete: () => void
}

export default function CommunitySetup({ onComplete }: Props) {
  const [online] = useState(navigator.onLine)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    country: '',
    region: '',
    currency: 'USD',
    tariff_fixed: '',
    tariff_per_m3: '',
    water_system_type: 'gravity_fed',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.country) {
      setError('Community name and country are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/communities/', {
        name: form.name,
        country: form.country,
        region: form.region || null,
        currency: form.currency,
        tariff_fixed: parseFloat(form.tariff_fixed) || 0,
        tariff_per_m3: parseFloat(form.tariff_per_m3) || 0,
        water_system_type: form.water_system_type,
      })
      onComplete()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create community'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {online ? 'Online — data syncs automatically' : 'Offline — data saved locally'}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Set Up Your Community</h2>
        <p className="text-sm text-gray-500 mb-6">Enter the details of the community you manage. This only needs to be done once.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Community Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="e.g. Agua Clara Village"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="e.g. Honduras"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="e.g. Lempira"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Water System Type</label>
            <select
              value={form.water_system_type}
              onChange={(e) => setForm({ ...form, water_system_type: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="gravity_fed">Gravity-Fed</option>
              <option value="pumped">Pumped</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="USD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Tariff</label>
              <input
                type="number"
                step="0.01"
                value={form.tariff_fixed}
                onChange={(e) => setForm({ ...form, tariff_fixed: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per m³</label>
              <input
                type="number"
                step="0.01"
                value={form.tariff_per_m3}
                onChange={(e) => setForm({ ...form, tariff_per_m3: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !online}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 mt-6"
          >
            {saving ? 'Creating...' : 'Create Community'}
          </button>
        </form>
      </div>
    </div>
  )
}
