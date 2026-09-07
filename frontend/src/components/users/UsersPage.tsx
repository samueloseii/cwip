import { FormEvent, useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import api from '../../services/api'
import {
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Spinner,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui'

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  phone: string | null
  is_active: boolean
  community_id: string | null
}

interface Community {
  id: string
  name: string
}

const roleOptions = [
  { value: 'operator', label: 'Operator — records readings and issue reports' },
  { value: 'treasurer', label: 'Treasurer — billing, payments and expenses' },
  { value: 'community_admin', label: 'System administrator — full access to a community' },
  { value: 'partner_admin', label: 'Organization administrator — all its communities' },
]

const roleLabels: Record<string, string> = {
  super_admin: 'Super administrator',
  partner_admin: 'Organization administrator',
  community_admin: 'System administrator',
  treasurer: 'Treasurer',
  operator: 'Operator',
  reader: 'Reader',
}

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  role: 'operator',
  community_id: '',
}

export default function UsersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [approvalRoles, setApprovalRoles] = useState<Record<string, string>>({})

  function load() {
    setLoading(true)
    Promise.all([api.get('/auth/users'), api.get('/communities/')])
      .then(([usersRes, communitiesRes]) => {
        setMembers(usersRes.data)
        setCommunities(communitiesRes.data)
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/auth/users', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        role: form.role,
        community_id: form.community_id || null,
      })
      setShowForm(false)
      setForm(emptyForm)
      load()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not create the account.')
    } finally {
      setSaving(false)
    }
  }

  const communityName = (id: string | null) =>
    communities.find((c) => c.id === id)?.name ?? '—'

  const pending = members.filter((m) => !m.is_active)
  const active = members.filter((m) => m.is_active)

  async function approve(member: TeamMember, role: string) {
    await api.post(`/auth/users/${member.id}/approve`, {
      role,
      community_id: member.community_id || communities[0]?.id || null,
    })
    load()
  }

  async function remove(member: TeamMember, question: string) {
    if (!window.confirm(question)) return
    try {
      await api.delete(`/auth/users/${member.id}`)
      load()
    } catch (err: any) {
      window.alert(err?.response?.data?.detail ?? 'Could not remove this account.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Who can sign in, and what they are allowed to do"
        actions={
          <button
            onClick={() => {
              setForm({ ...emptyForm, community_id: communities[0]?.id ?? '' })
              setError('')
              setShowForm(true)
            }}
            className={primaryButtonClass}
          >
            <Plus className="h-4 w-4" />
            Add person
          </button>
        }
      />

      {!loading && pending.length > 0 && (
        <Card className="mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="font-medium text-gray-900">Access requests</p>
            <p className="text-sm text-gray-500">Approve a person and choose what they can do.</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {pending.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{m.full_name}</p>
                    <p className="text-gray-500">
                      {m.email}
                      {m.phone ? ` · ${m.phone}` : ''}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    Requested: {roleLabels[m.role] ?? m.role}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className={inputClass}
                        value={approvalRoles[m.id] ?? m.role}
                        onChange={(e) =>
                          setApprovalRoles({ ...approvalRoles, [m.id]: e.target.value })
                        }
                      >
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className={primaryButtonClass}
                        onClick={() => approve(m, approvalRoles[m.id] ?? m.role)}
                      >
                        Approve
                      </button>
                      <button
                        className={secondaryButtonClass}
                        onClick={() => remove(m, `Decline the access request from ${m.full_name}?`)}
                      >
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : active.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No accounts yet" hint="Add your operators and treasurer." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Community</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{m.full_name}</td>
                  <td className="px-5 py-3 text-gray-600">{m.email}</td>
                  <td className="px-5 py-3 text-gray-600">{roleLabels[m.role] ?? m.role}</td>
                  <td className="px-5 py-3 text-gray-600">{communityName(m.community_id)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="text-gray-400 hover:text-red-600"
                      aria-label={`Remove ${m.full_name}`}
                      onClick={() => remove(m, `Remove ${m.full_name}'s account?`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && (
        <Modal
          title="Add person"
          description="They sign in with this email and password."
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Temporary password" hint="At least 8 characters">
                <input
                  type="text"
                  minLength={8}
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </Field>
              <Field label="Role" className="sm:col-span-2">
                <select
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Community" className="sm:col-span-2">
                <select
                  className={inputClass}
                  value={form.community_id}
                  onChange={(e) => setForm({ ...form, community_id: e.target.value })}
                >
                  <option value="">All communities</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass} disabled={saving}>
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
