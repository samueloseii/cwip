import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Gauge, Wrench, Wifi, WifiOff, ChevronRight } from 'lucide-react'
import api from '../../services/api'

interface CommunityInfo {
  id: string
  name: string
  country: string
  currency: string
  tariff_fixed: number
  tariff_per_m3: number
}

interface HouseholdInfo {
  id: string
  account_number: string
  head_of_household: string
  members_count: number
  status: string
  outstanding_balance: number
}

interface Props {
  onNavigate: (page: 'readings' | 'maintenance') => void
}

export default function FieldDashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [community, setCommunity] = useState<CommunityInfo | null>(null)
  const [households, setHouseholds] = useState<HouseholdInfo[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (!user?.community_id) return
    Promise.all([
      api.get(`/communities/${user.community_id}`),
      api.get(`/households/?community_id=${user.community_id}`),
    ])
      .then(([commRes, hhRes]) => {
        setCommunity(commRes.data)
        setHouseholds(hhRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.community_id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  const activeCount = households.filter((h) => h.status === 'active').length

  return (
    <div className="max-w-lg mx-auto">
      {/* Connection status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {online ? 'Online — data syncs automatically' : 'Offline — data saved locally, will sync when online'}
      </div>

      {/* Community header */}
      <div className="bg-primary-600 text-white rounded-xl p-5 mb-6">
        <p className="text-primary-200 text-sm">{community?.country}</p>
        <h1 className="text-xl font-bold mt-1">{community?.name || 'My Community'}</h1>
        <div className="flex gap-4 mt-3 text-sm">
          <span>{activeCount} active households</span>
          <span>{community?.currency} {community?.tariff_fixed?.toFixed(2)} base tariff</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Households</p>
          <p className="text-2xl font-bold">{households.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">To read this month</p>
          <p className="text-2xl font-bold text-primary-600">{activeCount}</p>
        </div>
      </div>

      {/* Action buttons — large touch targets for field use */}
      <div className="space-y-3">
        <button
          onClick={() => onNavigate('readings')}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Gauge className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Record meter readings</p>
            <p className="text-sm text-gray-500">Go house-to-house, enter the dial value</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('maintenance')}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Report an issue</p>
            <p className="text-sm text-gray-500">Leaks, broken meters, pump problems</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Welcome info */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-1">Welcome, {user?.full_name}</p>
        <p>Record meter readings and report issues. Data is saved on the phone and syncs automatically when you have internet. Billing and payments are handled by the treasurer.</p>
      </div>
    </div>
  )
}
