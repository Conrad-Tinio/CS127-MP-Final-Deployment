import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { 
  Home, 
  FileText, 
  Users, 
  PlusCircle,
  Wallet,
  Receipt
} from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import UserSelectionModal from './UserSelectionModal'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { selectedUser } = useUser()
  const [showUserModal, setShowUserModal] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/entries', label: 'All Entries', icon: FileText },
    { path: '/payments', label: 'Payment History', icon: Receipt },
    { path: '/people-groups', label: 'People & Groups', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 glass-card border-r border-dark-800 z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-dark-800">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-dark-50">LoanTrack</h1>
                <p className="text-xs text-dark-500">Finance Manager</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Create Entry Button */}
          <div className="p-4 border-t border-dark-800">
            <Link to="/entries/new" className="btn-primary w-full">
              <PlusCircle className="w-5 h-5" />
              <span>New Entry</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-dark-800">
            <button
              onClick={() => setShowUserModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-dark-800/50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-sm font-bold text-dark-950">
                {selectedUser?.fullName.charAt(0).toUpperCase() || 'T'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-dark-200 truncate">
                  {selectedUser?.fullName || 'tung tung tung sahur'}
                </p>
                <p className="text-xs text-dark-500 truncate">Single User Mode</p>
              </div>
            </button>
          </div>
          
          <UserSelectionModal
            isOpen={showUserModal}
            onClose={() => setShowUserModal(false)}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
