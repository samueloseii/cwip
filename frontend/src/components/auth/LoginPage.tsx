import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Droplets, Eye, EyeOff, Gauge, Receipt } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const highlights = [
  {
    icon: Gauge,
    title: 'Readings you can trust',
    text: 'Operators pick a household, see the last reading and get warned about impossible jumps.',
  },
  {
    icon: Receipt,
    title: 'Billing by household',
    text: 'Every bill shows who owes what, for how much water, and what is still outstanding.',
  },
  {
    icon: BarChart3,
    title: 'One view of the system',
    text: 'Consumption, revenue, expenses and maintenance in a single place for the committee.',
  },
]

const demoAccounts = [
  { label: 'System administrator', email: 'admin@cwip.org', password: 'admin123' },
  { label: 'Treasurer', email: 'treasurer1@cwip.org', password: 'treasurer123' },
  { label: 'Operator (field)', email: 'operator1@cwip.org', password: 'operator123' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('That email and password combination was not recognised.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
            <Droplets className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Flow</p>
            <p className="text-primary-200 text-sm">Community Water Management</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Run the water system like a utility, not a notebook.
          </h2>
          <div className="mt-10 space-y-6">
            {highlights.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-primary-200 text-sm mt-0.5">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-300 text-xs">
          Built with community water committees, operators and treasurers.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-lg text-gray-900 leading-tight">Flow</p>
              <p className="text-gray-500 text-sm">Community Water Management</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="text-gray-500 mt-1 mb-8">
            Accounts are created by your system administrator.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="you@community.org"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
              Demo accounts
            </p>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(account.password)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-700">{account.label}</span>
                  <span className="text-xs text-gray-400">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
