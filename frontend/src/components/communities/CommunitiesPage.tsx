import { useEffect, useState } from 'react'
import { MapPin, Plus, Users } from 'lucide-react'
import api from '../../services/api'

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

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/communities/')
      .then((res) => setCommunities(res.data))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false))
  }, [])

  const systemTypeLabel: Record<string, string> = {
    gravity_fed: 'Gravity-Fed',
    pumped: 'Pumped',
    mixed: 'Mixed',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="text-gray-500 mt-1">Manage community water systems</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Community
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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
    </div>
  )
}
