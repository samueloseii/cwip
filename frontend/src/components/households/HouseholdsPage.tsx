import { useEffect, useState } from 'react'
import { Home, Plus, Search } from 'lucide-react'
import api from '../../services/api'

interface Household {
  id: string
  account_number: string
  head_of_household: string
  members_count: number
  status: string
  has_meter: boolean
  outstanding_balance: number
  community_id: string
}

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/households/')
      .then((res) => setHouseholds(res.data))
      .catch(() => setHouseholds([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = households.filter(
    (h) =>
      h.head_of_household.toLowerCase().includes(search.toLowerCase()) ||
      h.account_number.toLowerCase().includes(search.toLowerCase()),
  )

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-amber-100 text-amber-700',
    inactive: 'bg-gray-100 text-gray-700',
    disconnected: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Households</h1>
          <p className="text-gray-500 mt-1">Manage household registrations and accounts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" />
          Register Household
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or account number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Head of Household</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Members</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Meter</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600">{h.account_number}</td>
                  <td className="px-6 py-4 text-sm">{h.head_of_household}</td>
                  <td className="px-6 py-4 text-sm">{h.members_count}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[h.status] || 'bg-gray-100'}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{h.has_meter ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    <span className={h.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      ${h.outstanding_balance.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Home className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No households found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
