import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { paymentApi, entryApi } from '../services/api'
import type { Payment, Entry } from '../types'
import { format } from 'date-fns'
import { 
  Search, 
  Calendar,
  User,
  DollarSign,
  FileText,
  X,
  ExternalLink,
  Receipt,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Filter
} from 'lucide-react'

interface PaymentWithEntry extends Payment {
  entry?: Entry
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentWithEntry[]>([])
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithEntry | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [totalPaidPenalties, setTotalPaidPenalties] = useState<number>(0)

  // Stats
  const totalPayments = payments.length
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.paymentAmount, 0)
  const totalAmount = totalPaymentAmount + totalPaidPenalties // Include penalties in total
  const thisMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.paymentDate)
    const now = new Date()
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
  })
  const thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.paymentAmount, 0)

  useEffect(() => {
    loadPayments()
  }, [])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, dateFilter])

  const loadPayments = async () => {
    try {
      // Load all payments, entries, and total paid penalties
      const [paymentsRes, entriesRes, penaltiesRes] = await Promise.all([
        paymentApi.getAll(),
        entryApi.getAll(),
        paymentApi.getTotalPaidPenalties()
      ])
      
      // Set total paid penalties
      setTotalPaidPenalties(penaltiesRes.data.totalPaidPenalties || 0)
      
      // Map entries for quick lookup
      const entriesMap = new Map<string, Entry>()
      entriesRes.data.forEach(entry => entriesMap.set(entry.entryId, entry))
      
      // Combine payments with their entry info (use backend-provided entryId or fallback to matching)
      const paymentsWithEntries: PaymentWithEntry[] = paymentsRes.data.map(payment => {
        // First try to use entryId from backend DTO
        let matchedEntry: Entry | undefined = payment.entryId 
          ? entriesMap.get(payment.entryId) 
          : undefined
        
        // Fallback: find entry by checking payments array
        if (!matchedEntry) {
          for (const entry of entriesRes.data) {
            if (entry.payments?.some(p => p.paymentId === payment.paymentId)) {
              matchedEntry = entry
              break
            }
          }
        }
        
        return {
          ...payment,
          entry: matchedEntry,
          entryId: matchedEntry?.entryId || payment.entryId,
          entryName: matchedEntry?.entryName || payment.entryName,
          entryReferenceId: matchedEntry?.referenceId || payment.entryReferenceId,
        }
      })
      
      // Sort by date descending (most recent first)
      paymentsWithEntries.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )
      
      setPayments(paymentsWithEntries)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = [...payments]
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.payeePersonName.toLowerCase().includes(search) ||
        p.entry?.lenderPersonName?.toLowerCase().includes(search) ||
        p.entryName?.toLowerCase().includes(search) ||
        p.entryReferenceId?.toLowerCase().includes(search) ||
        p.notes?.toLowerCase().includes(search)
      )
    }
    
    if (dateFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.paymentDate)
        switch (dateFilter) {
          case 'today':
            return paymentDate.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return paymentDate >= weekAgo
          case 'month':
            return paymentDate.getMonth() === now.getMonth() && 
                   paymentDate.getFullYear() === now.getFullYear()
          case 'year':
            return paymentDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })
    }
    
    setFilteredPayments(filtered)
  }

  const viewPaymentDetails = (payment: PaymentWithEntry) => {
    setSelectedPayment(payment)
    setShowDetailModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-dark-400">Loading payment history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-dark-50">Payment History</h1>
        <p className="mt-1 text-dark-400">View all payment transactions across your entries.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Total Payments</p>
              <p className="text-xl font-display font-bold text-dark-100">{totalPayments}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-dark-400">Total Amount</p>
              <p className="text-xl font-display font-bold text-accent-400">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              {totalPaidPenalties > 0 && (
                <p className="text-xs text-dark-500 mt-1">
                  (includes ₱{totalPaidPenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in late fees)
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">This Month</p>
              <p className="text-xl font-display font-bold text-dark-100">{thisMonthPayments.length} payments</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Month Total</p>
              <p className="text-xl font-display font-bold text-teal-400">₱{thisMonthAmount.toLocaleString()}</p>
            </div>
          </div>
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
                placeholder="Search by payee, lender, entry name, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          {/* Date Filter */}
          <div className="w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="select-field pl-10"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-dark-400">
        <span>Showing {filteredPayments.length} of {payments.length} payments</span>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <Receipt className="w-8 h-8 text-dark-500" />
          </div>
          <p className="text-dark-400 mb-4">
            {payments.length === 0 
              ? "No payments recorded yet. Payments will appear here once you make them." 
              : "No payments match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount Paid</th>
                  <th>Change</th>
                  <th>Payee (Borrower)</th>
                  <th>Lender</th>
                  <th>Entry</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr 
                    key={payment.paymentId} 
                    className="stagger-item cursor-pointer hover:bg-dark-800/50" 
                    style={{ animationDelay: `${index * 0.03}s` }}
                    onClick={() => viewPaymentDetails(payment)}
                  >
                    <td>
                      <div className="flex items-center gap-2 text-dark-300">
                        <Calendar className="w-4 h-4 text-dark-500" />
                        {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-bold text-accent-400">
                        +₱{payment.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        let effectiveChange = payment.changeAmount || 0
                        // Calculate change retroactively if not stored
                        if (effectiveChange === 0 && payment.entry && payment.entry.status === 'PAID' && payment.entry.amountRemaining === 0) {
                          if (payment.paymentAmount > payment.entry.amountBorrowed) {
                            effectiveChange = Number((payment.paymentAmount - payment.entry.amountBorrowed).toFixed(2))
                          }
                        }
                        return effectiveChange > 0 ? (
                          <span className="font-mono font-bold text-amber-400">
                            ₱{effectiveChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-dark-500">-</span>
                        )
                      })()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-500" />
                        <span className="text-dark-200">{payment.payeePersonName}</span>
                      </div>
                    </td>
                    <td>
                      {payment.entry?.lenderPersonName ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary-500" />
                          <span className="text-primary-300">{payment.entry.lenderPersonName}</span>
                        </div>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td>
                      {payment.entry ? (
                        <div className="flex flex-col">
                          <Link 
                            to={`/entries/${payment.entry.entryId}`}
                            className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {payment.entry.entryName}
                          </Link>
                          <code className="text-xs text-dark-500 font-mono">
                            {payment.entry.referenceId}
                          </code>
                        </div>
                      ) : (
                        <span className="text-dark-500">-</span>
                      )}
                    </td>
                    <td className="text-dark-400 max-w-[200px] truncate">
                      {payment.notes || '-'}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          viewPaymentDetails(payment)
                        }}
                        className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-dark-400 hover:text-primary-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-lg w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-dark-50">Payment Details</h2>
                  <p className="text-sm text-dark-400">Transaction information</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Calculate effective change - use stored value or calculate from entry data */}
              {(() => {
                let effectiveChange = selectedPayment.changeAmount || 0
                
                // Calculate change retroactively if not stored but entry shows overpayment
                if (effectiveChange === 0 && selectedPayment.entry) {
                  const entry = selectedPayment.entry
                  // If entry is PAID and total payments exceed amount borrowed
                  if (entry.status === 'PAID' && entry.amountRemaining === 0) {
                    // For entries with single payment or calculate from total paid
                    const totalPaid = entry.amountBorrowed - entry.amountRemaining + 
                      (entry.payments?.reduce((sum, p) => sum + p.paymentAmount, 0) || selectedPayment.paymentAmount)
                    
                    // Simple calculation: if this payment exceeds what was needed
                    const amountNeeded = entry.amountBorrowed
                    if (selectedPayment.paymentAmount > amountNeeded) {
                      effectiveChange = Number((selectedPayment.paymentAmount - amountNeeded).toFixed(2))
                    }
                  }
                }
                
                return (
                  <>
                    {/* Amount */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                        <p className="text-sm text-dark-400 mb-1">Amount Paid</p>
                        <p className="text-2xl font-display font-bold text-accent-400">
                          ₱{selectedPayment.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                        <p className="text-sm text-dark-400 mb-1">Change to Return</p>
                        {effectiveChange > 0 ? (
                          <p className="text-2xl font-display font-bold text-amber-400">
                            ₱{effectiveChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        ) : (
                          <p className="text-2xl font-display font-bold text-dark-500">
                            ₱0.00
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Change Alert */}
                    {effectiveChange > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-amber-400" />
                        </div>
                        <p className="text-sm text-amber-300">
                          <strong>Overpayment:</strong> The lender needs to return <strong>₱{effectiveChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> as change to the borrower.
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-dark-500 mb-1">Payment Date</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <Calendar className="w-4 h-4 text-dark-400" />
                    {format(new Date(selectedPayment.paymentDate), 'MMMM dd, yyyy')}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-dark-500 mb-1">Payee (Borrower)</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <User className="w-4 h-4 text-dark-400" />
                    {selectedPayment.payeePersonName}
                  </div>
                </div>
                
                {selectedPayment.entry?.lenderPersonName && (
                  <div className="col-span-2">
                    <p className="text-sm text-dark-500 mb-1">Lender</p>
                    <div className="flex items-center gap-2 text-primary-300">
                      <User className="w-4 h-4 text-primary-400" />
                      {selectedPayment.entry.lenderPersonName}
                    </div>
                  </div>
                )}
              </div>

              {/* Related Entry */}
              {selectedPayment.entry && (
                <div className="p-4 bg-dark-800/30 rounded-xl">
                  <p className="text-sm text-dark-500 mb-2">Related Entry</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-dark-200">{selectedPayment.entry.entryName}</p>
                      <code className="text-xs text-dark-500 font-mono">
                        {selectedPayment.entry.referenceId}
                      </code>
                    </div>
                    <Link
                      to={`/entries/${selectedPayment.entry.entryId}`}
                      className="btn-secondary text-sm"
                      onClick={() => setShowDetailModal(false)}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Entry
                    </Link>
                  </div>
                  
                  {/* Entry Summary */}
                  <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-dark-500">Total</p>
                      <p className="font-mono text-sm text-dark-200">
                        ₱{selectedPayment.entry.amountBorrowed.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500">Remaining</p>
                      <p className="font-mono text-sm text-amber-400">
                        ₱{selectedPayment.entry.amountRemaining.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-500">Status</p>
                      <span className={`text-sm font-medium ${
                        selectedPayment.entry.status === 'PAID' ? 'text-accent-400' :
                        selectedPayment.entry.status === 'PARTIALLY_PAID' ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {selectedPayment.entry.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPayment.notes && (
                <div>
                  <p className="text-sm text-dark-500 mb-2">Notes</p>
                  <p className="text-dark-300 bg-dark-800/30 p-3 rounded-lg">
                    {selectedPayment.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end pt-4 border-t border-dark-800">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

