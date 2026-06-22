import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Gauge, DollarSign, Wifi, WifiOff, ChevronRight } from 'lucide-react'
import { getPendingReadings } from '../../services/offlineStore'

interface Props {
  onNavigate: (page: 'readings' | 'payments' | 'maintenance') => void
}

export default function FieldDashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [online] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    getPendingReadings().then((r) => setPendingCount(r.length))
  }, [])

  return (
    <div className="max-w-lg mx-auto">
      {/* Status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-6 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        {online ? 'Online — data syncs automatically' : 'Offline — data saved locally, will sync when online'}
      </div>

      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-1">Record meter readings and payments for your community.</p>
      </div>

      {/* Pending sync indicator */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
          <strong>{pendingCount}</strong> reading{pendingCount > 1 ? 's' : ''} waiting to sync
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={() => onNavigate('readings')}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Gauge className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Record Meter Reading</p>
            <p className="text-sm text-gray-500">Enter household reading</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>

        <button
          onClick={() => onNavigate('payments')}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Log Payment</p>
            <p className="text-sm text-gray-500">Record cash payment</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Info */}
      <div className="mt-8 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        <p>Data is saved locally on your device and syncs automatically when you have internet connection.</p>
      </div>
    </div>
  )
}
