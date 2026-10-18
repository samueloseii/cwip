import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { saveOfflineReading, getPendingReadings } from '../../services/offlineStore'

interface Props {
  onBack: () => void
}

interface SavedEntry {
  household: string
  reading: number
}

export default function MeterReadingField({ onBack }: Props) {
  const { user } = useAuth()
  const [household, setHousehold] = useState('')
  const [readingValue, setReadingValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<SavedEntry[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

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
    getPendingReadings().then((r) => setPendingCount(r.length))
  }, [saved])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!household.trim() || !readingValue) return

    setSaving(true)
    const val = parseFloat(readingValue)
    const reading = {
      client_id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      meter_id: null,
      household_name: household.trim(),
      reading_value: val,
      reading_date: new Date().toISOString(),
      recorded_by: user?.full_name || 'Operator',
    }

    if (online) {
      try {
        await api.post('/sync/push', { readings: [reading], payments: [] })
      } catch {
        await saveOfflineReading(reading)
      }
    } else {
      await saveOfflineReading(reading)
    }

    setSaved((prev) => [...prev, { household: household.trim(), reading: val }])
    setHousehold('')
    setReadingValue('')
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Record Reading</h1>
          <p className="text-sm text-gray-500">{saved.length} recorded this session</p>
        </div>
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-6 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
        <div className="flex items-center gap-2">
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {online ? 'Online' : 'Offline — saving locally'}
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
            {pendingCount} pending sync
          </span>
        )}
      </div>

      {/* Simple form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Household Name or Number
          </label>
          <input
            type="text"
            value={household}
            onChange={(e) => setHousehold(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g. Juan Torres or AC-001"
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meter Reading (m³)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={readingValue}
            onChange={(e) => setReadingValue(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-xl font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0.0"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !household.trim() || !readingValue}
          className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              Save Reading
            </>
          )}
        </button>
      </form>

      {/* Recorded list */}
      {saved.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recorded this session</h3>
          <div className="space-y-1">
            {saved.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="h-4 w-4" />
                  {entry.household}
                </div>
                <span className="font-mono text-green-600">{entry.reading} m³</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
