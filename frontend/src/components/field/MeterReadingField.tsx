import { useEffect, useState } from 'react'
import { ArrowLeft, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { saveOfflineReading, getPendingReadings } from '../../services/offlineStore'

interface Household {
  id: string
  account_number: string
  head_of_household: string
  status: string
}

interface Meter {
  id: string
  serial_number: string
  last_reading_value: number
  last_reading_date: string | null
  household_id: string
}

interface Props {
  onBack: () => void
}

export default function MeterReadingField({ onBack }: Props) {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<Household[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [selectedHH, setSelectedHH] = useState<string>('')
  const [currentMeter, setCurrentMeter] = useState<Meter | null>(null)
  const [readingValue, setReadingValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [warning, setWarning] = useState('')
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

  useEffect(() => {
    if (!user?.community_id) return
    api
      .get(`/households/?community_id=${user.community_id}`)
      .then((res) => setHouseholds(res.data.filter((h: Household) => h.status === 'active')))
      .catch(() => {})
    api
      .get('/meters/')
      .then((res) => setMeters(res.data))
      .catch(() => {})
  }, [user?.community_id])

  useEffect(() => {
    if (!selectedHH) {
      setCurrentMeter(null)
      return
    }
    const meter = meters.find((m) => m.household_id === selectedHH)
    setCurrentMeter(meter || null)
    setReadingValue('')
    setNotes('')
    setWarning('')
  }, [selectedHH, meters])

  useEffect(() => {
    if (!currentMeter || !readingValue) {
      setWarning('')
      return
    }
    const val = parseFloat(readingValue)
    if (isNaN(val)) return
    const prev = currentMeter.last_reading_value
    if (val < prev) {
      setWarning(`Reading (${val}) is lower than previous (${prev.toFixed(1)}). Check the meter.`)
    } else if (val - prev > 50) {
      setWarning(`Very high consumption (${(val - prev).toFixed(1)} m³). Please verify.`)
    } else {
      setWarning('')
    }
  }, [readingValue, currentMeter])

  async function handleSubmit() {
    if (!currentMeter || !readingValue) return
    setSaving(true)
    const val = parseFloat(readingValue)
    const reading = {
      client_id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      meter_id: currentMeter.id,
      reading_value: val,
      reading_date: new Date().toISOString(),
      notes: notes || undefined,
      recorded_by: user?.full_name || 'Unknown',
    }

    if (online) {
      try {
        await api.post('/sync/push', { readings: [reading], payments: [] })
        setSaved((prev) => [...prev, selectedHH])
        setSelectedHH('')
        setReadingValue('')
        setNotes('')
      } catch {
        await saveOfflineReading(reading)
        setSaved((prev) => [...prev, selectedHH])
        setSelectedHH('')
        setReadingValue('')
        setNotes('')
      }
    } else {
      await saveOfflineReading(reading)
      setSaved((prev) => [...prev, selectedHH])
      setSelectedHH('')
      setReadingValue('')
      setNotes('')
    }
    setSaving(false)
  }

  const selectedHousehold = households.find((h) => h.id === selectedHH)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meter Readings</h1>
          <p className="text-sm text-gray-500">{saved.length} recorded this session</p>
        </div>
      </div>

      {/* Status bar */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-4 ${online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
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

      {/* Household selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Household</label>
        <select
          value={selectedHH}
          onChange={(e) => setSelectedHH(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">— Choose household —</option>
          {households.map((h) => (
            <option key={h.id} value={h.id} disabled={saved.includes(h.id)}>
              {h.account_number} — {h.head_of_household} {saved.includes(h.id) ? '✓' : ''}
            </option>
          ))}
        </select>
      </div>

      {currentMeter && selectedHousehold && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          {/* Previous reading info */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Previous Reading</p>
              <p className="text-lg font-bold font-mono">{currentMeter.last_reading_value.toFixed(1)} m³</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Meter</p>
              <p className="text-sm font-medium">{currentMeter.serial_number}</p>
            </div>
          </div>

          {/* New reading input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">New Reading (m³)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-xl font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={`> ${currentMeter.last_reading_value.toFixed(1)}`}
              autoFocus
            />
          </div>

          {/* Consumption preview */}
          {readingValue && !isNaN(parseFloat(readingValue)) && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 text-sm text-blue-700">
              Consumption: <strong>{Math.max(0, parseFloat(readingValue) - currentMeter.last_reading_value).toFixed(1)} m³</strong>
            </div>
          )}

          {/* Warning */}
          {warning && (
            <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 mb-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {warning}
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. Meter hard to read, estimated"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !readingValue}
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
        </div>
      )}

      {/* Already recorded list */}
      {saved.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recorded this session</h3>
          <div className="space-y-1">
            {saved.map((hhId) => {
              const hh = households.find((h) => h.id === hhId)
              return (
                <div key={hhId} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <Check className="h-4 w-4" />
                  {hh?.account_number} — {hh?.head_of_household}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
