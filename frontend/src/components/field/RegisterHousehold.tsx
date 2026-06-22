import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { CheckCircle } from 'lucide-react'
import api from '../../services/api'

interface Props {
  onBack: () => void
}

export default function RegisterHousehold({ onBack }: Props) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    account_number: '',
    head_of_household: '',
    address: '',
    phone: '',
    members_count: '1',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.account_number || !form.head_of_household) {
      setError('Account number and head of household are required')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.post('/households/', {
        account_number: form.account_number,
        head_of_household: form.head_of_household,
        address: form.address || null,
        phone: form.phone || null,
        members_count: parseInt(form.members_count) || 1,
        community_id: user?.community_id,
        has_meter: true,
      })
      setSuccess(`Household "${form.head_of_household}" registered successfully!`)
      setForm({ account_number: '', head_of_household: '', address: '', phone: '', members_count: '1' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register household'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="text-primary-600 text-sm mb-4">&larr; Back</button>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Register Household</h2>
        <p className="text-sm text-gray-500 mb-6">Add a new household to your community.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
            <input
              type="text"
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="e.g. HH-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Head of Household *</label>
            <input
              type="text"
              value={form.head_of_household}
              onChange={(e) => setForm({ ...form, head_of_household: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Full name of household head"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address / Landmark</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="e.g. Near the school, blue house"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Members</label>
              <input
                type="number"
                min="1"
                value={form.members_count}
                onChange={(e) => setForm({ ...form, members_count: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 mt-6"
          >
            {saving ? 'Registering...' : 'Register Household'}
          </button>
        </form>
      </div>
    </div>
  )
}
