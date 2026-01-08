import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { entryApi } from '../services/api'
import type { Entry } from '../types'
import { format } from 'date-fns'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Banknote,
  Calendar,
  User
} from 'lucide-react'

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    try {
      const response = await entryApi.getAll()
      setEntries(response.data)
    } catch (error) {
      console.error('Error loading entries:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-dark-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const recentEntries = entries.slice(0, 5)
  const unpaidEntries = entries.filter(e => e.status === 'UNPAID')
  const partiallyPaidEntries = entries.filter(e => e.status === 'PARTIALLY_PAID')
  const paidEntries = entries.filter(e => e.status === 'PAID')
  
  const totalBorrowed = entries.reduce((sum, e) => sum + e.amountBorrowed, 0)
  const totalRemaining = entries.reduce((sum, e) => sum + e.amountRemaining, 0)

  const stats = [
    {
      label: 'Total Entries',
      value: entries.length,
      icon: TrendingUp,
      color: 'primary',
      gradient: 'from-primary-500 to-primary-400',
    },
    {
      label: 'Unpaid',
      value: unpaidEntries.length,
      icon: AlertCircle,
      color: 'rose',
      gradient: 'from-rose-500 to-rose-400',
    },
    {
      label: 'In Progress',
      value: partiallyPaidEntries.length,
      icon: Clock,
      color: 'amber',
      gradient: 'from-amber-500 to-amber-400',
    },
    {
      label: 'Completed',
      value: paidEntries.length,
      icon: CheckCircle2,
      color: 'accent',
      gradient: 'from-accent-500 to-accent-400',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success">Paid</span>
      case 'PARTIALLY_PAID':
        return <span className="badge badge-warning">Partial</span>
      default:
        return <span className="badge badge-danger">Unpaid</span>
    }
  }

  return (
    <div className="page-enter space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-50">Dashboard</h1>
          <p className="mt-1 text-dark-400">Welcome back! Here's your financial overview.</p>
        </div>
        <Link to="/entries/new" className="btn-primary">
          Create Entry
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm font-medium">{stat.label}</p>
                  <p className="mt-2 text-4xl font-display font-bold text-dark-50">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold text-dark-100 mb-4">Financial Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-400">Total Borrowed</p>
                  <p className="text-lg font-semibold text-dark-100">₱{totalBorrowed.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-400">Remaining Balance</p>
                  <p className="text-lg font-semibold text-dark-100">₱{totalRemaining.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <p className="text-sm text-dark-400">Total Paid</p>
                  <p className="text-lg font-semibold text-dark-100">₱{(totalBorrowed - totalRemaining).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="glass-card p-6">
          <h2 className="font-display text-lg font-semibold text-dark-100 mb-4">Payment Progress</h2>
          <div className="flex flex-col items-center justify-center h-48">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-dark-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${totalBorrowed > 0 ? ((totalBorrowed - totalRemaining) / totalBorrowed) * 440 : 0} 440`}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-dark-50">
                  {totalBorrowed > 0 ? Math.round(((totalBorrowed - totalRemaining) / totalBorrowed) * 100) : 0}%
                </span>
                <span className="text-sm text-dark-400">Paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-dark-800 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-dark-100">Recent Entries</h2>
          <Link to="/entries" className="btn-ghost text-sm">
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-dark-500" />
            </div>
            <p className="text-dark-400 mb-4">No entries yet. Start tracking your loans!</p>
            <Link to="/entries/new" className="btn-primary">
              Create Your First Entry
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Entry Name</th>
                  <th>Borrower</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry, index) => (
                  <tr key={entry.entryId} className="stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td>
                      <Link to={`/entries/${entry.entryId}`} className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
                        {entry.entryName}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-500" />
                        {entry.borrowerPersonName || entry.borrowerGroupName}
                      </div>
                    </td>
                    <td className="font-mono">₱{entry.amountBorrowed.toLocaleString()}</td>
                    <td>{getStatusBadge(entry.status)}</td>
                    <td>
                      <div className="flex items-center gap-2 text-dark-400">
                        <Calendar className="w-4 h-4" />
                        {entry.dateBorrowed ? format(new Date(entry.dateBorrowed), 'MMM dd, yyyy') : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
