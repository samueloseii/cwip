import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Receipt } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../services/api'
import { Household } from './HouseholdsPage'
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  formatDate,
  formatMoney,
} from '../ui'

interface ConsumptionPoint {
  period: string
  consumption_m3: number
}

interface Invoice {
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
}

interface Payment {
  id: string
  payment_date: string
  amount: number
  currency: string
  payment_method: string
  receipt_number: string | null
  invoice_number: string | null
}

interface Detail {
  household: Household
  consumption_history: ConsumptionPoint[]
  invoices: Invoice[]
  payments: Payment[]
  total_billed: number
  total_paid: number
  outstanding: number
}

export default function HouseholdDetailPage() {
  const { householdId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) return
    api
      .get(`/households/${householdId}/detail`, { params: { months: 12 } })
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [householdId])

  if (loading) return <Spinner />

  if (!detail) {
    return (
      <div>
        <button
          onClick={() => navigate('/households')}
          className="flex items-center gap-2 text-sm text-primary-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to households
        </button>
        <EmptyState icon={Receipt} title="Household not found" />
      </div>
    )
  }

  const { household } = detail
  const currency = household.currency

  return (
    <div>
      <button
        onClick={() => navigate('/households')}
        className="flex items-center gap-2 text-sm text-primary-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to households
      </button>

      <PageHeader
        title={household.head_of_household}
        subtitle={`${household.account_number} · ${household.community_name || 'Community'} · meter ${
          household.meter_serial_number || 'not installed'
        }`}
        actions={<Badge value={household.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total billed" value={formatMoney(currency, detail.total_billed)} />
        <StatCard
          label="Total paid"
          value={formatMoney(currency, detail.total_paid)}
          tone="positive"
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(currency, detail.outstanding)}
          tone={detail.outstanding > 0 ? 'danger' : 'positive'}
        />
        <StatCard
          label="Last reading"
          value={
            household.last_reading_value != null
              ? `${household.last_reading_value.toFixed(1)} m³`
              : '—'
          }
          hint={formatDate(household.last_reading_date)}
        />
      </div>

      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Consumption, last 12 months</h2>
        <p className="text-sm text-gray-500 mb-4">Cubic metres billed per month.</p>
        {detail.consumption_history.length === 0 ? (
          <EmptyState icon={Receipt} title="No readings recorded yet" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detail.consumption_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" m³" width={64} />
                <Tooltip formatter={(value: number) => [`${value} m³`, 'Consumption']} />
                <Bar dataKey="consumption_m3" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Bills</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3 text-right">Consumption</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600">
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(inv.billing_period_start)} – {formatDate(inv.billing_period_end)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono">
                    {inv.consumption_m3.toFixed(1)} m³
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    {formatMoney(inv.currency, inv.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    <span className={inv.balance_due > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {formatMoney(inv.currency, inv.balance_due)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge value={inv.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/billing/print?invoice=${inv.id}`)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="Print bill"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detail.invoices.length === 0 && <EmptyState icon={Receipt} title="No bills issued yet" />}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Receipt</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {detail.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{formatDate(p.payment_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.invoice_number || '—'}</td>
                  <td className="px-6 py-4 text-sm capitalize text-gray-500">
                    {p.payment_method.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.receipt_number || '—'}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600">
                    {formatMoney(p.currency, p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detail.payments.length === 0 && (
          <EmptyState icon={Receipt} title="No payments recorded yet" />
        )}
      </Card>
    </div>
  )
}
