import { useEffect, useState } from 'react'
import { Receipt, DollarSign } from 'lucide-react'
import api from '../../services/api'

interface InvoiceData {
  id: string
  invoice_number: string
  billing_period_start: string
  billing_period_end: string
  consumption_m3: number
  total_amount: number
  amount_paid: number
  balance_due: number
  currency: string
  status: string
  due_date: string
  household_id: string
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices')

  useEffect(() => {
    api.get('/billing/invoices')
      .then((res) => setInvoices(res.data))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    pending: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Invoices and payment tracking</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'invoices' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Receipt className="h-4 w-4 inline mr-2" />
          Invoices
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'payments' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <DollarSign className="h-4 w-4 inline mr-2" />
          Payments
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Consumption</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(inv.billing_period_start).toLocaleDateString()} – {new Date(inv.billing_period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">{inv.consumption_m3.toFixed(1)} m³</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{inv.currency} {inv.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right">{inv.currency} {inv.amount_paid.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    <span className={inv.balance_due > 0 ? 'text-red-600' : 'text-green-600'}>
                      {inv.currency} {inv.balance_due.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[inv.status] || 'bg-gray-100'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No invoices found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
