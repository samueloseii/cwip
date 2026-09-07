import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  Home,
  Receipt,
  Wallet,
  Wrench,
  BarChart3,
  UserCog,
  LogOut,
  Droplets,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/communities', icon: MapPin, label: 'Communities' },
  { to: '/households', icon: Home, label: 'Households' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
  { to: '/expenses', icon: Wallet, label: 'Expenses' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  partner_admin: 'Partner Admin',
  community_admin: 'System Administrator',
  treasurer: 'Treasurer',
}

export default function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-primary-900 text-white flex flex-col print:hidden">
      <div className="p-6 flex items-center gap-3 border-b border-primary-800">
        <Droplets className="h-8 w-8 text-primary-300" />
        <div>
          <h1 className="text-lg font-bold">Flow</h1>
          <p className="text-xs text-primary-300">Water Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-800 text-white border-r-2 border-primary-300'
                  : 'text-primary-200 hover:bg-primary-800/50 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-800">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm text-white truncate">{user.full_name}</p>
            <p className="text-xs text-primary-400">{roleLabels[user.role] || user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-2 py-2 text-sm text-primary-300 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
