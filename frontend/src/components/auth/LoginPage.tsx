import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'request'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [requestedRole, setRequestedRole] = useState('operator')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? 'That email and password combination was not recognised.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRequest(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/access-requests', {
        email,
        password,
        full_name: fullName,
        phone: phone || null,
        requested_role: requestedRole,
      })
      setMode('signin')
      setNotice('Request sent. An administrator will approve your access.')
      setPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not send the request. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <Droplets className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-gray-900">Flow</span>
        </div>

        {mode === 'signin' ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              {notice && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3.5 py-2.5 text-sm">
                  {notice}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3.5 py-2.5 text-sm">
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Email"
                autoComplete="email"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="Password"
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode('request')
                setError('')
                setNotice('')
              }}
              className="mt-6 text-sm text-primary-600 hover:text-primary-700"
            >
              Request access
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Request access</h1>
            <p className="text-sm text-gray-500 mt-1">
              An administrator approves your account and sets your role.
            </p>
            <form onSubmit={handleRequest} className="mt-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3.5 py-2.5 text-sm">
                  {error}
                </div>
              )}
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Full name"
                required
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Email"
                autoComplete="email"
                required
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="Phone (optional)"
              />
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                className={inputClass}
              >
                <option value="operator">Operator — meter readings and issue reports</option>
                <option value="treasurer">Treasurer — billing and payments</option>
                <option value="community_admin">Administrator</option>
              </select>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Choose a password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send request'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError('')
              }}
              className="mt-6 text-sm text-primary-600 hover:text-primary-700"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
