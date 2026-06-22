import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import api from '../../services/api'

interface ReadingData {
  id: string
  reading_value: number
  consumption_m3: number
  reading_date: string
  notes: string | null
  recorded_by: string | null
}

export default function MetersPage() {
  const [readings, setReadings] = useState<ReadingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/meters/readings')
      .then((res) => setReadings(res.data))
      .catch(() => setReadings([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
        <p className="text-gray-500 mt-1">View all recorded meter readings</p>
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Household</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reading (m³)</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readings.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {r.notes?.replace('Household: ', '') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono text-primary-600 font-semibold">
                    {r.reading_value.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.recorded_by || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(r.reading_date).toLocaleDateString()} {new Date(r.reading_date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {readings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Gauge className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No readings recorded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
