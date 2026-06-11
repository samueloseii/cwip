import { useEffect, useState } from 'react'
import { Gauge, Plus } from 'lucide-react'
import api from '../../services/api'

interface MeterData {
  id: string
  serial_number: string
  brand: string | null
  status: string
  last_reading_value: number
  last_reading_date: string | null
  household_id: string
}

export default function MetersPage() {
  const [meters, setMeters] = useState<MeterData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/meters/')
      .then((res) => setMeters(res.data))
      .catch(() => setMeters([]))
      .finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    faulty: 'bg-red-100 text-red-700',
    replaced: 'bg-gray-100 text-gray-700',
    removed: 'bg-gray-100 text-gray-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meters</h1>
          <p className="text-gray-500 mt-1">Manage water meters and readings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" />
          Record Reading
        </button>
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Brand</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Reading (m³)</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Read Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meters.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600">{m.serial_number}</td>
                  <td className="px-6 py-4 text-sm">{m.brand || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[m.status] || 'bg-gray-100'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{m.last_reading_value.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {m.last_reading_date ? new Date(m.last_reading_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meters.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Gauge className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No meters found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
