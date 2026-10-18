import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { saveOfflinePayment, getPendingPayments } from '../../services/offlineStore'

interface Household {
  id: string
  account_number: string
  head_of_household: string
  outstanding_balance: number
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  balance_due: number
  currency: string
  status: string
  billing_period_end: string
  household_id: string
}

interface Props {
  onBack: () => void
}

export default function PaymentField({ onBack }: Props) {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<Household[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedHH, setSelectedHH] = useState('')
  const [amount, setAmount] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [currency, setCurrency] = useState('USD')

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
    getPendingPayments().then((p) => setPendingCount(p.length))
  }, [saved])

  useEffect(() => {
    if (!user?.community_id) return
    api
      .get(`/households/?community_id=${user.community_id}`)
      .then((res) => setHouseholds(res.data))
      .catch(() => {})
    api
      .get('/billing/invoices')
      .then((res) => setInvoices(res.data))
      .catch(() => {})
    api
      .get('/communities/')
      .then((res) => {
        const c = res.data.find((x: { id: string; currency: string }) => x.id === user.community_id)
        if (c?.currency) setCurrency(c.currency)
      })
      .catch(() => {})
  }, [user?.community_id])

  const hhInvoices = invoices.filter(
    (inv) => inv.household_id === selectedHH && inv.balance_due > 0,
  )
  const selectedHousehold = households.find((h) => h.id === selectedHH)

  async function handleSubmit() {
    if (!selectedHH || !amount) return
    setSaving(true)
    const val = parseFloat(amount)
    const oldestUnpaid = hhInvoices[0]

    const payment = {
      client_id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      household_id: selectedHH,
      invoice_id: oldestUnpaid?.id || null,
      amount: val,
      currency: oldestUnpaid?.currency || currency,
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      receipt_number: receiptNumber || undefined,
      notes: notes || undefined,
    }

    if (online) {
      try {
        await api.post('/sync/push', { readings: [], payments: [payment] })
      } catch {
        await saveOfflinePayment(payment)
      }
    } else {
      await saveOfflinePayment(payment)
    }

    setSaved((prev) => [...prev, `${selectedHH}-${Date.now()}`])
    setSelectedHH('')
    setAmount('')
    setReceiptNumber('')
    setNotes('')
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Payment</h1>
          <p className="text-sm text-gray-500">{saved.length} recorded this session</p>
        </div>
      </div>

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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Household</label>
        <select
          value={selectedHH}
          onChange={(e) => setSelectedHH(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-primary-500"
        >
          <option value="">— Choose household —</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.account_number} — {h.head_of_household} {h.outstanding_balance > 0 ? `(owes ${h.outstanding_balance.toFixed(2)})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedHousehold && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-lg font-bold text-amber-600">{currency} {selectedHousehold.outstanding_balance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Unpaid Invoices</p>
              <p className="text-lg font-bold">{hhInvoices.length}</p>
            </div>
          </div>

          {hhInvoices.length > 0 && (
            <div className="mb-4 space-y-1">
              {hhInvoices.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                  <span>{inv.invoice_number}</span>
                  <span className="font-medium">{inv.currency} {inv.balance_due.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-xl font-mono focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt # (optional)</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. R-001"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. Partial payment"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !amount}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Record Payment
              </>
            )}
          </button>
        </div>
      )}

      {saved.length > 0 && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <Check className="h-4 w-4 inline mr-1" />
          {saved.length} payment(s) recorded this session
        </div>
      )}
    </div>
  )
}
