import { useEffect, useState } from 'react'
import {
  Users,
  MapPin,
  Droplets,
  DollarSign,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Gauge,
} from 'lucide-react'
import api from '../../services/api'

interface SystemDashboard {
  total_partners: number
  total_communities: number
  total_households: number
  total_users: number
  overall_collection_rate: number
  total_revenue: number
  total_arrears: number
}

export default function DashboardPage() {
  const [data, setData] = useState<SystemDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/system')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const stats = data
    ? [
        { label: 'Communities', value: data.total_communities, icon: MapPin, color: 'text-blue-600 bg-blue-100' },
        { label: 'Households', value: data.total_households, icon: Users, color: 'text-green-600 bg-green-100' },
        { label: 'Collection Rate', value: `${data.overall_collection_rate}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
        { label: 'Revenue', value: `$${data.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-100' },
        { label: 'Arrears', value: `$${data.total_arrears.toLocaleString()}`, icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
        { label: 'Partners', value: data.total_partners, icon: Droplets, color: 'text-cyan-600 bg-cyan-100' },
        { label: 'Users', value: data.total_users, icon: Gauge, color: 'text-indigo-600 bg-indigo-100' },
      ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your community water systems</p>
      </div>

      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-700">No Data Available</h2>
          <p className="text-gray-500 mt-2">Run the database seed script to populate demo data.</p>
          <code className="block bg-gray-100 rounded-lg p-3 mt-4 text-sm text-gray-600">
            cd backend && python -m app.db.seed
          </code>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a href="/households" className="block px-4 py-3 bg-primary-50 rounded-lg text-primary-700 hover:bg-primary-100 transition-colors">
              Register a household
            </a>
            <a href="/billing" className="block px-4 py-3 bg-primary-50 rounded-lg text-primary-700 hover:bg-primary-100 transition-colors">
              Generate bills
            </a>
            <a href="/expenses" className="block px-4 py-3 bg-primary-50 rounded-lg text-primary-700 hover:bg-primary-100 transition-colors">
              Record an expense
            </a>
            <a href="/maintenance" className="block px-4 py-3 bg-primary-50 rounded-lg text-primary-700 hover:bg-primary-100 transition-colors">
              Review maintenance reports
            </a>
            <a href="/analytics" className="block px-4 py-3 bg-primary-50 rounded-lg text-primary-700 hover:bg-primary-100 transition-colors">
              View analytics
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Info</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Version</span>
              <span className="font-medium">0.1.0 (Pilot MVP)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Countries</span>
              <span className="font-medium">Nicaragua, Ecuador, Honduras</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span>Partners</span>
              <span className="font-medium">FEDICAMP, ALTROPICO, AVODEC, ASOMAINCUPACO</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Target Communities</span>
              <span className="font-medium">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
