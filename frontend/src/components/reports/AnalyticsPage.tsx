import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../services/api'
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  formatMoney,
  inputClass,
} from '../ui'

interface Community {
  id: string
  name: string
}

interface MonthlyPoint {
  month: string
  label: string
  consumption_m3: number
  billed: number
  collected: number
  expenses: number
}

interface Overview {
  currency: string
  months: MonthlyPoint[]
  totals: {
    billed: number
    collected: number
    expenses: number
    arrears: number
    net_balance: number
    collection_rate: number
    consumption_m3: number
    households: number
    metered_households: number
    open_maintenance: number
  }
  aging: { bucket: string; amount: number; invoices: number }[]
  top_consumers: {
    household_id: string
    account_number: string
    head_of_household: string
    consumption_m3: number
  }[]
  invoice_status: { status: string; count: number; amount: number }[]
}

const AGING_COLORS = ['#0ea5e9', '#38bdf8', '#fbbf24', '#f97316', '#ef4444']

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-64">{children}</div>
    </Card>
  )
}

const axisProps = {
  tick: { fontSize: 11, fill: '#6b7280' },
  axisLine: { stroke: '#e5e7eb' },
  tickLine: false,
}

export default function AnalyticsPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [selected, setSelected] = useState('')
  const [months, setMonths] = useState(12)
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/communities/')
      .then((res) => {
        setCommunities(res.data)
        if (res.data.length > 0) setSelected(res.data[0].id)
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    api
      .get(`/analytics/overview?community_id=${selected}&months=${months}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selected, months])

  const currency = data?.currency ?? ''
  const hasFinancials = !!data && data.months.some((m) => m.billed || m.collected || m.expenses)
  const hasConsumption = !!data && data.months.some((m) => m.consumption_m3 > 0)

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Water delivered, money collected and money spent"
        actions={
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className={`${inputClass} w-56`}
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className={`${inputClass} w-36`}
            >
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
            </select>
          </>
        }
      />

      {communities.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No community yet"
            hint="Create a community and register households — analytics build up as readings and payments are recorded."
          />
        </Card>
      ) : loading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Collection rate"
              value={`${data.totals.collection_rate}%`}
              hint={`${formatMoney(currency, data.totals.collected)} of ${formatMoney(currency, data.totals.billed)}`}
              tone={data.totals.collection_rate >= 80 ? 'positive' : 'warning'}
            />
            <StatCard
              label="Outstanding"
              value={formatMoney(currency, data.totals.arrears)}
              hint="Unpaid balance on issued bills"
              tone={data.totals.arrears > 0 ? 'danger' : 'default'}
            />
            <StatCard
              label="Net balance"
              value={formatMoney(currency, data.totals.net_balance)}
              hint="Collected minus expenses"
              tone={data.totals.net_balance >= 0 ? 'positive' : 'danger'}
            />
            <StatCard
              label="Water billed"
              value={`${data.totals.consumption_m3} m³`}
              hint={`${data.totals.metered_households} of ${data.totals.households} households metered`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Consumption" subtitle="Cubic metres recorded per month">
              {hasConsumption ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.months} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip formatter={(v: number) => `${v} m³`} />
                    <Area
                      type="monotone"
                      dataKey="consumption_m3"
                      name="Consumption"
                      stroke="#0284c7"
                      fill="#bae6fd"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="No readings recorded yet" />
              )}
            </ChartCard>

            <ChartCard title="Billed vs collected" subtitle="How much of each month's billing came in">
              {hasFinancials ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip formatter={(v: number) => formatMoney(currency, v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="billed" name="Billed" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="No bills issued yet" />
              )}
            </ChartCard>

            <ChartCard title="Revenue vs expenses" subtitle="Is the system covering its costs?">
              {hasFinancials ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.months} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip formatter={(v: number) => formatMoney(currency, v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      name="Collected"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="No payments or expenses recorded yet" />
              )}
            </ChartCard>

            <ChartCard title="Arrears ageing" subtitle="How long unpaid balances have been outstanding">
              {data.totals.arrears > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.aging} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="bucket" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip formatter={(v: number) => formatMoney(currency, v)} />
                    <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]}>
                      {data.aging.map((_, index) => (
                        <Cell key={index} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={BarChart3} title="Nothing outstanding" />
              )}
            </ChartCard>
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Highest consumption</h2>
            {data.top_consumers.length === 0 ? (
              <EmptyState icon={BarChart3} title="No readings recorded yet" />
            ) : (
              <div className="space-y-2">
                {data.top_consumers.map((h) => {
                  const max = data.top_consumers[0].consumption_m3 || 1
                  return (
                    <a
                      key={h.household_id}
                      href={`/households/${h.household_id}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 group-hover:text-primary-700">
                          {h.head_of_household}
                          <span className="text-gray-400"> · {h.account_number}</span>
                        </span>
                        <span className="font-medium text-gray-900">{h.consumption_m3} m³</span>
                      </div>
                      <div className="h-1.5 mt-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${(h.consumption_m3 / max) * 100}%` }}
                        />
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
