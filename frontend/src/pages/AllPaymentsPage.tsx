import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { entryApi } from '../services/api'
import type { Entry } from '../types'
import { format } from 'date-fns'
import { 
  Plus, 
  Search, 
  Calendar,
  User,
  Users,
  FileText
} from 'lucide-react'

export default function AllPaymentsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  }, [entries, searchTerm, statusFilter, typeFilter])

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

  const filterEntries = () => {
    let filtered = [...entries]
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(e => 
        e.entryName.toLowerCase().includes(search) ||
        e.referenceId.toLowerCase().includes(search) ||
        (e.borrowerPersonName && e.borrowerPersonName.toLowerCase().includes(search)) ||
        (e.borrowerGroupName && e.borrowerGroupName.toLowerCase().includes(search))
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter)
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.transactionType === typeFilter)
    }
    
    setFilteredEntries(filtered)
  }

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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'STRAIGHT_EXPENSE':
        return <span className="badge badge-info">Straight</span>
      case 'INSTALLMENT_EXPENSE':
        return <span className="badge badge-info">Installment</span>
      case 'GROUP_EXPENSE':
        return <span className="badge badge-info">Group</span>
      default:
        return <span className="badge badge-info">{type}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-dark-400">Loading entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-50">All Entries</h1>
          <p className="mt-1 text-dark-400">Manage and track all your loan entries.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/entries/new" className="btn-primary">
            <Plus className="w-5 h-5" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          
          {/* Type Filter */}
          <div className="w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All Types</option>
              <option value="STRAIGHT_EXPENSE">Straight Expense</option>
              <option value="INSTALLMENT_EXPENSE">Installment</option>
              <option value="GROUP_EXPENSE">Group Expense</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-dark-400">
        <span>Showing {filteredEntries.length} of {entries.length} entries</span>
      </div>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <FileText className="w-8 h-8 text-dark-500" />
          </div>
          <p className="text-dark-400 mb-4">
            {entries.length === 0 
              ? "No entries found. Create your first entry to get started!" 
              : "No entries match your search criteria."}
          </p>
          {entries.length === 0 && (
            <Link to="/entries/new" className="btn-primary">
              Create Your First Entry
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Entry Name</th>
                  <th>Borrower</th>
                  <th>Lender</th>
                  <th>Amount</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.entryId} className="stagger-item" style={{ animationDelay: `${index * 0.03}s` }}>
                    <td>
                      <code className="text-xs bg-dark-800 px-2 py-1 rounded text-primary-400 font-mono">
                        {entry.referenceId}
                      </code>
                    </td>
                    <td>
                      <Link 
                        to={`/entries/${entry.entryId}`} 
                        className="font-medium text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        {entry.entryName}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {entry.borrowerGroupName ? (
                          <Users className="w-4 h-4 text-dark-500" />
                        ) : (
                          <User className="w-4 h-4 text-dark-500" />
                        )}
                        <span>{entry.borrowerPersonName || entry.borrowerGroupName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-500" />
                        <span>{entry.lenderPersonName}</span>
                      </div>
                    </td>
                    <td className="font-mono font-medium">₱{entry.amountBorrowed.toLocaleString()}</td>
                    <td className="font-mono text-dark-400">₱{entry.amountRemaining.toLocaleString()}</td>
                    <td>{getStatusBadge(entry.status)}</td>
                    <td>{getTypeBadge(entry.transactionType)}</td>
                    <td>
                      <div className="flex items-center gap-2 text-dark-400 text-sm">
                        <Calendar className="w-4 h-4" />
                        {entry.dateBorrowed ? format(new Date(entry.dateBorrowed), 'MMM dd, yyyy') : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
