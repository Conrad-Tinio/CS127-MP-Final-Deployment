import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { entryApi, paymentApi, paymentAllocationApi, groupApi, installmentApi } from '../services/api'
import api from '../services/api'
import type { Entry, Payment, Person, CreatePaymentRequest, PaymentAllocation, Group, InstallmentTerm } from '../types'
import PersonSelector from '../components/PersonSelector'
import Toast, { type ToastType } from '../components/Toast'
import { format } from 'date-fns'
import { parseCurrencyToNumber, formatCurrencyInput } from '../utils/currency'
import {
  ArrowLeft,
  Calendar,
  User,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Hash,
  Banknote,
  TrendingUp,
  X,
  Loader2,
  Save,
  Edit,
  Trash2,
  SkipForward,
  CreditCard,
  Eye,
  Receipt
} from 'lucide-react'

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([])
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocationMode, setAllocationMode] = useState<'equal' | 'percent' | 'amount' | null>(null)
  const [editingAllocation, setEditingAllocation] = useState<PaymentAllocation | null>(null)
  const [showEditAllocationModal, setShowEditAllocationModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ show: false, title: '', message: '', onConfirm: () => {} })
  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: '',
    paymentAmount: '',
    payeePerson: null as Person | null,
    proof: null as File | null,
    notes: '',
    allocationId: undefined as string | undefined, // For linking payment to specific allocation
  })
  const [showInstallmentPaymentModal, setShowInstallmentPaymentModal] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<InstallmentTerm | null>(null)
  const [skippingTerm, setSkippingTerm] = useState<string | null>(null)
  const [loadingPenalty, setLoadingPenalty] = useState(false)
  const [includedLateFees, setIncludedLateFees] = useState(0) // Track late fees included in current payment
  const [showPaymentDetailModal, setShowPaymentDetailModal] = useState(false)
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<Payment | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [loadingProof, setLoadingProof] = useState(false)

  useEffect(() => {
    if (id) {
      loadEntry()
      loadPayments()
    }
  }, [id])

  useEffect(() => {
    if (entry?.transactionType === 'GROUP_EXPENSE' && entry.borrowerGroupId) {
      loadPaymentAllocations()
      loadGroup()
    }
  }, [entry])

  const loadEntry = async () => {
    if (!id) return
    try {
      const response = await entryApi.getById(id)
      setEntry(response.data)
      
      // Update delinquent terms for installment entries
      // (Backend already does this, but this ensures real-time updates)
      if (response.data.transactionType === 'INSTALLMENT_EXPENSE') {
        try {
          await installmentApi.updateDelinquent()
          // Reload entry to get updated term statuses
          const updatedResponse = await entryApi.getById(id)
          setEntry(updatedResponse.data)
        } catch (error) {
          // Silently fail - backend already updates on getEntryById
          console.debug('Delinquent update check failed (may already be updated):', error)
        }
      }
    } catch (error: any) {
      console.error('Error loading entry:', error)
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Entry not found'
      setToast({
        message: `Error loading entry: ${errorMessage}. The entry may not exist or you may not have permission to view it.`,
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = async () => {
    if (!id) return
    try {
      const response = await paymentApi.getByEntry(id)
      setPayments(response.data)
    } catch (error) {
      console.error('Error loading payments:', error)
    }
  }

  const loadPaymentAllocations = async () => {
    if (!id) return
    try {
      const response = await paymentAllocationApi.getByEntry(id)
      setPaymentAllocations(response.data)
    } catch (error) {
      console.error('Error loading payment allocations:', error)
    }
  }

  const loadGroup = async () => {
    if (!entry?.borrowerGroupId) return
    try {
      const response = await groupApi.getById(entry.borrowerGroupId)
      setGroup(response.data)
      
      // If there's a selected payee that's not in the group members, clear it
      if (paymentFormData.payeePerson && response.data?.members) {
        const isMember = response.data.members.some(
          member => member.personId === paymentFormData.payeePerson?.personId
        )
        if (!isMember) {
          setPaymentFormData({ ...paymentFormData, payeePerson: null })
        }
      }
    } catch (error) {
      console.error('Error loading group:', error)
    }
  }

  const handleSkipTerm = async (termId: string) => {
    setSkippingTerm(termId)
    try {
      await installmentApi.skipTerm(termId)
      setToast({ message: 'Term skipped successfully!', type: 'success' })
      await loadEntry() // Reload to get updated term status
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Error skipping term'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setSkippingTerm(null)
    }
  }

  const viewPaymentDetails = async (payment: Payment) => {
    setSelectedPaymentDetail(payment)
    setShowPaymentDetailModal(true)
    setPaymentProofUrl(null)
    
    // Load payment proof if available
    if (payment.hasProof) {
      setLoadingProof(true)
      try {
        const response = await api.get(`/payments/${payment.paymentId}/proof`, {
          responseType: 'blob'
        })
        const blob = new Blob([response.data])
        const url = URL.createObjectURL(blob)
        setPaymentProofUrl(url)
      } catch (error) {
        console.error('Error loading payment proof:', error)
        setPaymentProofUrl(null)
      } finally {
        setLoadingProof(false)
      }
    }
  }
  
  const handlePayTerm = (term: InstallmentTerm, termLateFee: number = 0) => {
    setSelectedTerm(term)
    // Pre-fill amount with amount per term plus late fees
    if (entry?.installmentPlan) {
      const baseAmount = entry.installmentPlan!.amountPerTerm
      
      // Calculate penalties from the immediately preceding SKIPPED term only (not all skipped terms)
      // Late fee from a skipped term should only be added to the next term's payment
      const currentTermNumber = term.termNumber
      const sortedTerms = [...(entry.installmentPlan!.installmentTerms || [])].sort((a, b) => a.termNumber - b.termNumber)
      let skippedTermPenalty = 0
      
      // Check only the immediately preceding term
      if (currentTermNumber > 1) {
        const prevTerm = sortedTerms[currentTermNumber - 2] // -2 because array is 0-indexed and we want previous term
        if (prevTerm && prevTerm.termStatus === 'SKIPPED' && prevTerm.penaltyApplied && prevTerm.penaltyApplied > 0) {
          skippedTermPenalty = prevTerm.penaltyApplied
        }
      }
      
      // Total late fees = delinquent term's late fee + penalty from immediately preceding skipped term
      const totalLateFees = termLateFee + skippedTermPenalty
      const totalAmount = baseAmount + totalLateFees
      
      setIncludedLateFees(totalLateFees)
      setPaymentFormData(prev => ({
        ...prev,
        paymentAmount: totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        paymentDate: new Date().toISOString().split('T')[0],
      }))
    }
    setShowInstallmentPaymentModal(true)
  }

  const handleInstallmentPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entry || !selectedTerm) return
    
    setSubmittingPayment(true)
    try {
      // Get the borrower as the default payee for installment payments
      let payeeId = paymentFormData.payeePerson?.personId || entry.borrowerPersonId
      if (!payeeId) {
        setToast({ message: 'Please select a payee', type: 'error' })
        setSubmittingPayment(false)
        return
      }

      const paymentRequest: CreatePaymentRequest = {
        entryId: entry.entryId,
        paymentDate: paymentFormData.paymentDate || undefined,
        paymentAmount: parseCurrencyToNumber(paymentFormData.paymentAmount),
        payeePersonId: payeeId,
        notes: paymentFormData.notes || `Payment for Term ${selectedTerm.termNumber}`,
      }

      if (paymentFormData.proof) {
        await paymentApi.createWithProof(paymentRequest, paymentFormData.proof)
      } else {
        await paymentApi.create(paymentRequest)
      }

      // Update term status to PAID
      await installmentApi.updateTermStatus(selectedTerm.termId, 'PAID')

      setShowInstallmentPaymentModal(false)
      setSelectedTerm(null)
      setIncludedLateFees(0)
      setPaymentFormData({
        paymentDate: '',
        paymentAmount: '',
        payeePerson: null,
        proof: null,
        notes: '',
        allocationId: undefined,
      })

      // Reload data
      await Promise.all([loadEntry(), loadPayments()])
      setToast({ message: 'Payment recorded and term marked as paid!', type: 'success' })
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Error recording payment'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setSubmittingPayment(false)
    }
  }

  const getTermStatusBadge = (status: string, isCompletedEarly: boolean = false) => {
    // If entry is fully paid and term is still pending, show as completed early
    if (isCompletedEarly) {
      return <span className="badge bg-teal-500/20 text-teal-400 border border-teal-500/30">Completed Early</span>
    }
    
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success">Paid</span>
      case 'SKIPPED':
        return <span className="badge bg-dark-600 text-dark-300">Skipped</span>
      case 'DELINQUENT':
        return <span className="badge badge-danger">Delinquent</span>
      case 'NOT_STARTED':
        return <span className="badge bg-dark-700 text-dark-400">Not Started</span>
      default:
        return <span className="badge badge-warning">Unpaid</span>
    }
  }

  // Set default payee when modal opens
  useEffect(() => {
    if (showPaymentModal && entry) {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0]
      
      // For STRAIGHT transactions, pre-fill payment amount with full amount borrowed
      const defaultAmount = entry.transactionType === 'STRAIGHT_EXPENSE' 
        ? entry.amountBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ''
      
      // If entry has a borrower person (not a group), set it as default payee
      if (entry.borrowerPersonId && !entry.borrowerGroupId && entry.borrowerPersonName) {
        // Create person object from entry data
        const defaultPayee: Person = {
          personId: entry.borrowerPersonId,
          fullName: entry.borrowerPersonName
        }
        setPaymentFormData({
          paymentDate: today,
          paymentAmount: defaultAmount,
          payeePerson: defaultPayee,
          proof: null,
          notes: '',
          allocationId: undefined,
        })
      } else {
        // If it's a group or no borrower, clear the payee
        setPaymentFormData({
          paymentDate: today,
          paymentAmount: defaultAmount,
          payeePerson: null,
          proof: null,
          notes: '',
          allocationId: undefined,
        })
      }
    }
  }, [showPaymentModal, entry])

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !entry) return

    if (!paymentFormData.payeePerson) {
      setToast({ message: 'Please select a payee', type: 'error' })
      return
    }

    const amountValue = parseCurrencyToNumber(paymentFormData.paymentAmount)
    if (!paymentFormData.paymentAmount || amountValue <= 0) {
      setToast({ message: 'Please enter a valid payment amount', type: 'error' })
      return
    }

    // For STRAIGHT transactions, payment must equal the full amount borrowed
    if (entry.transactionType === 'STRAIGHT_EXPENSE') {
      const fullAmount = entry.amountBorrowed
      const tolerance = 0.01 // Allow small floating point differences
      if (Math.abs(amountValue - fullAmount) > tolerance) {
        setToast({ 
          message: `For Straight transactions, you must pay the full amount borrowed (₱${fullAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, 
          type: 'error' 
        })
        return
      }
    }

    setSubmittingPayment(true)
    try {
      const request: CreatePaymentRequest = {
        entryId: id,
        paymentDate: paymentFormData.paymentDate || new Date().toISOString().split('T')[0],
        paymentAmount: amountValue,
        payeePersonId: paymentFormData.payeePerson.personId,
        notes: paymentFormData.notes?.trim() || undefined,
        allocationId: paymentFormData.allocationId,
      }

      if (paymentFormData.proof) {
        await paymentApi.createWithProof(request, paymentFormData.proof)
      } else {
        await paymentApi.create(request)
      }
      
      // Reset form
      setPaymentFormData({
        paymentDate: '',
        paymentAmount: '',
        payeePerson: null,
        proof: null,
        notes: '',
        allocationId: undefined,
      })
      setShowPaymentModal(false)
      
      // Reload entry and payments to reflect updated amounts
      await Promise.all([loadEntry(), loadPayments()])
      if (entry?.transactionType === 'GROUP_EXPENSE') {
        await loadPaymentAllocations()
      }
      setToast({ message: 'Payment created successfully!', type: 'success' })
    } catch (error: any) {
      console.error('Error creating payment:', error)
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Error creating payment. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setSubmittingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-dark-400">Loading entry details...</p>
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 mb-4 rounded-full bg-dark-800 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-dark-500" />
        </div>
        <p className="text-dark-400 mb-4">Entry not found</p>
        <button onClick={() => navigate('/entries')} className="btn-secondary">
          Back to Entries
        </button>
      </div>
    )
  }

  const paymentPercentage = entry.amountBorrowed > 0 
    ? ((entry.amountBorrowed - entry.amountRemaining) / entry.amountBorrowed) * 100 
    : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500/20 text-accent-400 border border-accent-500/30">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Paid</span>
          </span>
        )
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Partially Paid</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Unpaid</span>
          </span>
        )
    }
  }

  const getTypeBadge = (type: string) => {
    const typeLabel = type.replace('_EXPENSE', '').replace('_', ' ')
    return (
      <span className="badge badge-info">
        {typeLabel}
      </span>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/entries')}
          className="btn-ghost mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Entries
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl font-bold text-dark-50">{entry.entryName}</h1>
              {getTypeBadge(entry.transactionType)}
            </div>
            <div className="flex items-center gap-4 text-dark-400">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <code className="text-sm bg-dark-800 px-2 py-0.5 rounded font-mono text-primary-400">
                  {entry.referenceId}
                </code>
              </div>
              {entry.dateBorrowed && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{format(new Date(entry.dateBorrowed), 'MMMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(entry.status)}
            {/* Only show action buttons if user is BORROWER (not LENDER) */}
            {entry.userRole === 'BORROWER' && (
            <div className="flex items-center gap-2">
              {/* Complete Entry Button - Only show if not already paid */}
              {entry.status !== 'PAID' && (
                <button
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: 'Complete Entry',
                      message: `Are you sure you want to mark "${entry.entryName}" as complete?\n\nThis will:\n• Set the status to PAID\n• Set remaining amount to ₱0\n• Record today as the completion date${entry.transactionType === 'INSTALLMENT_EXPENSE' ? '\n• Mark all remaining installment terms as completed' : ''}\n\nThis action is typically used to forgive remaining debt or close an entry early.`,
                      onConfirm: async () => {
                        try {
                          await entryApi.complete(entry.entryId)
                          setToast({ message: 'Entry marked as complete!', type: 'success' })
                          await loadEntry()
                          if (entry.transactionType === 'INSTALLMENT_EXPENSE') {
                            // Reload to show updated installment terms
                            await loadEntry()
                          }
                        } catch (error: any) {
                          const errorMessage = error?.response?.data?.error || error?.message || 'Error completing entry'
                          setToast({ message: errorMessage, type: 'error' })
                        }
                      }
                    })
                  }}
                  className="btn-primary"
                  title="Mark as Complete"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="btn-secondary"
                title="Edit Entry"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                title="Delete Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            )}
            {entry.userRole === 'LENDER' && (
              <span className="text-sm text-dark-400 italic">
                View-only mode: Borrower payment status
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Overview */}
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold text-dark-100 mb-6">Financial Overview</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-dark-400 mb-2">
                  <Banknote className="w-4 h-4" />
                  <span className="text-sm">Amount Borrowed</span>
                </div>
                <p className="text-2xl font-display font-bold text-dark-100">
                  ₱{entry.amountBorrowed.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-dark-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Remaining</span>
                </div>
                <p className="text-2xl font-display font-bold text-amber-400">
                  ₱{entry.amountRemaining.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-dark-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Total Paid</span>
                </div>
                {(() => {
                  // Calculate total penalties from installment terms
                  const totalPenalties = entry.installmentPlan?.installmentTerms
                    ?.filter(t => t.penaltyApplied && t.penaltyApplied > 0)
                    .reduce((sum, t) => sum + (t.penaltyApplied || 0), 0) || 0
                  
                  const basePaid = entry.amountBorrowed - entry.amountRemaining + totalPenalties
                  
                  return (
                    <div>
                      <p className="text-2xl font-display font-bold text-accent-400">
                        ₱{basePaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {totalPenalties > 0 && (
                        <p className="text-xs text-rose-400 mt-1">
                          (includes ₱{totalPenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in late fees)
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-dark-400">Payment Progress</span>
                <span className="text-dark-200 font-medium">{paymentPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Entry Details */}
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold text-dark-100 mb-6">Entry Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-dark-500 mb-1">Borrower</p>
                <div className="flex items-center gap-2 text-dark-200">
                  {entry.borrowerGroupName ? (
                    <Users className="w-5 h-5 text-dark-400" />
                  ) : (
                    <User className="w-5 h-5 text-dark-400" />
                  )}
                  <span className="font-medium">{entry.borrowerPersonName || entry.borrowerGroupName}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-dark-500 mb-1">Lender</p>
                <div className="flex items-center gap-2 text-dark-200">
                  <User className="w-5 h-5 text-dark-400" />
                  <span className="font-medium">{entry.lenderPersonName}</span>
                </div>
              </div>

              {entry.dateBorrowed && (
                <div>
                  <p className="text-sm text-dark-500 mb-1">Date Borrowed</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <Calendar className="w-5 h-5 text-dark-400" />
                    <span className="font-medium">{format(new Date(entry.dateBorrowed), 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              )}

              {entry.dateFullyPaid && (
                <div>
                  <p className="text-sm text-dark-500 mb-1">Date Fully Paid</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <CheckCircle2 className="w-5 h-5 text-accent-400" />
                    <span className="font-medium">{format(new Date(entry.dateFullyPaid), 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              )}

              {entry.paymentMethod && (
                <div>
                  <p className="text-sm text-dark-500 mb-1">Payment Method</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <DollarSign className="w-5 h-5 text-dark-400" />
                    <span className="font-medium">
                      {entry.paymentMethod === 'CASH' ? 'Cash' : 'Credit Card'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {entry.description && (
              <div className="mt-6 pt-6 border-t border-dark-800">
                <p className="text-sm text-dark-500 mb-2">Description</p>
                <p className="text-dark-300">{entry.description}</p>
              </div>
            )}

            {(entry.notes || entry.paymentNotes) && (
              <div className="mt-6 pt-6 border-t border-dark-800 space-y-4">
                {entry.notes && (
                  <div>
                    <p className="text-sm text-dark-500 mb-2">Notes</p>
                    <p className="text-dark-300">{entry.notes}</p>
                  </div>
                )}
                {entry.paymentNotes && (
                  <div>
                    <p className="text-sm text-dark-500 mb-2">Payment Notes</p>
                    <p className="text-dark-300">{entry.paymentNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Allocation Section - Only for GROUP_EXPENSE */}
          {entry.transactionType === 'GROUP_EXPENSE' && (
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-dark-800 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-dark-100">Payment Allocation</h2>
                  <p className="text-sm text-dark-400 mt-1">Payment breakdown per person in this expense</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Only show allocation action buttons if user is BORROWER */}
                  {entry.userRole === 'BORROWER' && (
                  <>
                  {paymentAllocations.length > 0 && (
                    <button
                      onClick={() => {
                        setAllocationMode('percent')
                        setShowAllocationModal(true)
                      }}
                      className="btn-secondary text-sm"
                      title="Modify existing allocations by percent"
                    >
                      <Edit className="w-4 h-4" />
                      Modify by %
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (paymentAllocations.length > 0) {
                        setConfirmModal({
                          show: true,
                          title: 'Replace Allocations',
                          message: 'This will replace all existing allocations. Continue?',
                          onConfirm: () => {
                            Promise.all(paymentAllocations.map(a => paymentAllocationApi.delete(a.allocationId)))
                              .then(() => {
                                setAllocationMode('equal')
                                setShowAllocationModal(true)
                              })
                              .catch((error) => {
                                const errorMessage = error?.response?.data?.error || error?.message || 'Error clearing allocations'
                                setToast({ message: errorMessage, type: 'error' })
                              })
                          }
                        })
                      } else {
                        setAllocationMode('equal')
                        setShowAllocationModal(true)
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Divide Equally
                  </button>
                  <button
                    onClick={() => {
                      if (paymentAllocations.length > 0) {
                        setConfirmModal({
                          show: true,
                          title: 'Replace Allocations',
                          message: 'This will replace all existing allocations. Continue?',
                          onConfirm: () => {
                            Promise.all(paymentAllocations.map(a => paymentAllocationApi.delete(a.allocationId)))
                              .then(() => {
                                setAllocationMode('percent')
                                setShowAllocationModal(true)
                              })
                              .catch((error) => {
                                const errorMessage = error?.response?.data?.error || error?.message || 'Error clearing allocations'
                                setToast({ message: errorMessage, type: 'error' })
                              })
                          }
                        })
                      } else {
                        setAllocationMode('percent')
                        setShowAllocationModal(true)
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Divide by %
                  </button>
                  <button
                    onClick={() => {
                      if (paymentAllocations.length > 0) {
                        setConfirmModal({
                          show: true,
                          title: 'Replace Allocations',
                          message: 'This will replace all existing allocations. Continue?',
                          onConfirm: () => {
                            Promise.all(paymentAllocations.map(a => paymentAllocationApi.delete(a.allocationId)))
                              .then(() => {
                                setAllocationMode('amount')
                                setShowAllocationModal(true)
                              })
                              .catch((error) => {
                                const errorMessage = error?.response?.data?.error || error?.message || 'Error clearing allocations'
                                setToast({ message: errorMessage, type: 'error' })
                              })
                          }
                        })
                      } else {
                        setAllocationMode('amount')
                        setShowAllocationModal(true)
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    Divide by Amount
                  </button>
                  </>
                  )}
                  {entry.userRole === 'LENDER' && (
                    <span className="text-sm text-dark-400 italic">
                      View-only: Borrower payment breakdown
                    </span>
                  )}
                </div>
              </div>

              {paymentAllocations.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                    <Users className="w-8 h-8 text-dark-500" />
                  </div>
                  <p className="text-dark-400 mb-2">No payment allocations created yet.</p>
                  {entry.userRole === 'BORROWER' ? (
                    <p className="text-sm text-dark-500">Use the quick actions above to allocate the expense.</p>
                  ) : (
                    <p className="text-sm text-dark-500">Borrower has not yet allocated payments.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>% of Total</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentAllocations.map((allocation, index) => (
                        <tr key={allocation.allocationId} className="stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                          <td>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-dark-500" />
                              <span className="text-dark-200">{allocation.personName}</span>
                            </div>
                          </td>
                          <td className="text-dark-300">{allocation.description}</td>
                          <td className="font-mono font-medium text-dark-100">
                            ₱{allocation.amount.toLocaleString()}
                          </td>
                          <td className="text-dark-400">
                            {allocation.percentageOfTotal?.toFixed(2) || '0.00'}%
                          </td>
                          <td>
                            {allocation.paymentAllocationStatus === 'PAID' ? (
                              <span className="badge badge-success">Paid</span>
                            ) : allocation.paymentAllocationStatus === 'PARTIALLY_PAID' ? (
                              <span className="badge badge-warning">Partially Paid</span>
                            ) : (
                              <span className="badge badge-danger">Unpaid</span>
                            )}
                          </td>
                          <td>
                            {/* Only show action buttons if user is BORROWER */}
                            {entry.userRole === 'BORROWER' ? (
                            <div className="flex items-center gap-2">
                              {allocation.paymentAllocationStatus !== 'PAID' && (
                                <button
                                  onClick={async () => {
                                    // Find the person for this allocation
                                    const person = group?.members.find(m => m.personId === allocation.personId) || 
                                                   (entry?.lenderPersonId === allocation.personId ? 
                                                     { personId: allocation.personId, fullName: allocation.personName } : null)
                                    if (person) {
                                      setPaymentFormData({
                                        paymentDate: new Date().toISOString().split('T')[0],
                                        paymentAmount: allocation.amount.toFixed(2),
                                        payeePerson: person,
                                        proof: null,
                                        notes: '',
                                        allocationId: allocation.allocationId,
                                      })
                                      setShowPaymentModal(true)
                                    }
                                  }}
                                  className="px-2 py-1 text-xs bg-accent-500/20 text-accent-400 rounded hover:bg-accent-500/30 transition-colors flex items-center gap-1"
                                  title="Pay this allocation"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Pay
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingAllocation(allocation)
                                  setShowEditAllocationModal(true)
                                }}
                                className="p-1 hover:bg-dark-800 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-dark-400 hover:text-primary-400" />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    show: true,
                                    title: 'Delete Allocation',
                                    message: `Are you sure you want to delete the allocation for ${allocation.personName}?`,
                                    onConfirm: async () => {
                                      try {
                                        await paymentAllocationApi.delete(allocation.allocationId)
                                        setToast({ message: 'Allocation deleted successfully!', type: 'success' })
                                        await loadPaymentAllocations()
                                      } catch (error: any) {
                                        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting allocation'
                                        setToast({ message: errorMessage, type: 'error' })
                                      }
                                    }
                                  })
                                }}
                                className="p-1 hover:bg-dark-800 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-dark-400 hover:text-rose-400" />
                              </button>
                            </div>
                            ) : (
                              <span className="text-dark-500 text-sm italic">View-only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Installment Details Section - Only for INSTALLMENT_EXPENSE */}
          {entry.transactionType === 'INSTALLMENT_EXPENSE' && entry.installmentPlan && (
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-dark-800">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-dark-100">Installment Details</h2>
                      <p className="text-sm text-dark-400">Payment schedule and term status</p>
                    </div>
                  </div>
                </div>

                {/* Installment Summary */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                    <p className="text-xs text-dark-500 mb-1">Start Date</p>
                    <p className="text-dark-200 font-medium">
                      {format(new Date(entry.installmentPlan.startDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                    <p className="text-xs text-dark-500 mb-1">Frequency</p>
                    <p className="text-dark-200 font-medium capitalize">
                      {entry.installmentPlan.paymentFrequency.toLowerCase()}
                      {entry.installmentPlan.paymentFrequencyDay && (
                        <span className="text-dark-400 text-xs block mt-1">
                          {entry.installmentPlan.paymentFrequency === 'MONTHLY' 
                            ? `${entry.installmentPlan.paymentFrequencyDay}${entry.installmentPlan.paymentFrequencyDay === '1' ? 'st' : entry.installmentPlan.paymentFrequencyDay === '2' ? 'nd' : entry.installmentPlan.paymentFrequencyDay === '3' ? 'rd' : 'th'} of month`
                            : entry.installmentPlan.paymentFrequencyDay.toLowerCase()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                    <p className="text-xs text-dark-500 mb-1">Total Terms</p>
                    <p className="text-dark-200 font-medium">{entry.installmentPlan.paymentTerms}</p>
                  </div>
                  <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                    <p className="text-xs text-dark-500 mb-1">Amount per Term</p>
                    <p className="text-accent-400 font-mono font-bold">
                      ₱{entry.installmentPlan.amountPerTerm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Total Penalties */}
                {entry.installmentPlan.installmentTerms && (() => {
                  const totalPenalties = entry.installmentPlan.installmentTerms
                    .filter(t => t.penaltyApplied && t.penaltyApplied > 0)
                    .reduce((sum, t) => sum + (t.penaltyApplied || 0), 0)
                  
                  if (totalPenalties > 0) {
                    return (
                      <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                            </div>
                            <div>
                              <p className="text-sm text-rose-300 font-medium">Late Fees Applied</p>
                              <p className="text-xs text-rose-400/70">
                                {entry.installmentPlan!.installmentTerms!.filter(t => t.termStatus === 'SKIPPED').length} term(s) skipped
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-mono font-bold text-rose-400">
                            +₱{totalPenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Paid in Full Early Notice */}
                {entry.status === 'PAID' && entry.installmentPlan.installmentTerms && (() => {
                  const paidTerms = entry.installmentPlan.installmentTerms.filter(t => t.termStatus === 'PAID').length
                  const totalTerms = entry.installmentPlan.paymentTerms
                  const completedEarlyCount = entry.installmentPlan.installmentTerms.filter(
                    t => t.termStatus === 'UNPAID' || t.termStatus === 'NOT_STARTED'
                  ).length
                  
                  if (completedEarlyCount > 0) {
                    return (
                      <div className="mt-4 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-teal-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-teal-300 font-medium">🎉 Paid in Full Early!</p>
                            <p className="text-xs text-teal-400/70 mt-0.5">
                              You completed this loan in {paidTerms} of {totalTerms} terms. 
                              {completedEarlyCount > 0 && ` ${completedEarlyCount} remaining term${completedEarlyCount > 1 ? 's were' : ' was'} automatically completed.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Payment Progress */}
                {entry.installmentPlan.installmentTerms && entry.installmentPlan.installmentTerms.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-dark-400">Payment Progress</p>
                      <p className="text-sm text-dark-300">
                        {entry.status === 'PAID' 
                          ? `Completed (${entry.installmentPlan.installmentTerms.filter(t => t.termStatus === 'PAID').length} terms paid)`
                          : `${entry.installmentPlan.installmentTerms.filter(t => t.termStatus === 'PAID').length} / ${entry.installmentPlan.paymentTerms} terms paid`
                        }
                      </p>
                    </div>
                    <div className="w-full bg-dark-800 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          entry.status === 'PAID' 
                            ? 'bg-gradient-to-r from-teal-500 to-accent-500' 
                            : 'bg-gradient-to-r from-primary-500 to-accent-500'
                        }`}
                        style={{
                          width: entry.status === 'PAID' 
                            ? '100%' 
                            : `${(entry.installmentPlan.installmentTerms.filter(t => t.termStatus === 'PAID').length / entry.installmentPlan.paymentTerms) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Installment Terms Table */}
              {entry.installmentPlan.installmentTerms && entry.installmentPlan.installmentTerms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.installmentPlan.installmentTerms
                        .sort((a, b) => a.termNumber - b.termNumber)
                        .map((term, index) => {
                          // Check if entry is fully paid and this term wasn't explicitly paid/skipped
                          const isEntryFullyPaid = entry.status === 'PAID'
                          const isTermPending = term.termStatus === 'UNPAID' || term.termStatus === 'NOT_STARTED'
                          const isTermDelinquent = term.termStatus === 'DELINQUENT'
                          const isCompletedEarly = isEntryFullyPaid && isTermPending
                          
                          // Compare dates only (not time) - past due only if due date is strictly before today
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const dueDate = new Date(term.dueDate)
                          dueDate.setHours(0, 0, 0, 0)
                          const isPastDue = !isCompletedEarly && dueDate < today && term.termStatus !== 'PAID' && term.termStatus !== 'SKIPPED'
                          // Allow paying if term is pending (UNPAID/NOT_STARTED) or delinquent
                          const canPayTerm = (isTermPending || isTermDelinquent) && !isCompletedEarly
                          
                          return (
                            <tr 
                              key={term.termId} 
                              className={`stagger-item ${isPastDue ? 'bg-rose-500/5' : ''} ${isCompletedEarly ? 'bg-teal-500/5' : ''}`}
                              style={{ animationDelay: `${index * 0.03}s` }}
                            >
                              <td>
                                <span className="font-medium text-dark-200">Term {term.termNumber}</span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2 text-dark-300">
                                  <Calendar className="w-4 h-4 text-dark-500" />
                                  {format(new Date(term.dueDate), 'MMM dd, yyyy')}
                                  {isPastDue && (
                                    <span className="text-xs text-rose-400">(Past Due)</span>
                                  )}
                                  {isCompletedEarly && (
                                    <span className="text-xs text-teal-400">(Paid Early)</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`font-mono font-medium ${isCompletedEarly ? 'text-dark-500 line-through' : 'text-dark-200'}`}>
                                  ₱{entry.installmentPlan!.amountPerTerm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td>
                                <div className="flex flex-col gap-1">
                                  {getTermStatusBadge(term.termStatus, isCompletedEarly)}
                                  {(term.termStatus === 'SKIPPED' || term.termStatus === 'DELINQUENT') && term.penaltyApplied && term.penaltyApplied > 0 && (
                                    <span className="text-xs text-rose-400">
                                      +₱{term.penaltyApplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} late fee
                                    </span>
                                  )}
                                  {term.termStatus === 'DELINQUENT' && (!term.penaltyApplied || term.penaltyApplied === 0) && (
                                    <span className="text-xs text-rose-400">
                                      Late fee will be applied
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {isCompletedEarly ? (
                                  <span className="text-xs text-teal-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    No action needed
                                  </span>
                                ) : canPayTerm ? (
                                  /* Only show Pay Term and Skip buttons if user is BORROWER */
                                  entry.userRole === 'BORROWER' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={async () => {
                                        // If delinquent, show late fee warning and include late fee in payment
                                        if (term.termStatus === 'DELINQUENT') {
                                          setLoadingPenalty(true)
                                          try {
                                            const lateFeeRes = await installmentApi.getDelinquentLateFee(term.termId)
                                            const lateFee = lateFeeRes.data.lateFee
                                            setConfirmModal({
                                              show: true,
                                              title: 'Pay Delinquent Term with Late Fee',
                                              message: `This term is past due. Paying now will incur a late fee of ₱${lateFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (5% of term amount or minimum ₱50).\n\nThe late fee will be automatically added to your payment amount.\n\nDo you want to continue?`,
                                              onConfirm: () => handlePayTerm(term, lateFee)
                                            })
                                          } catch (error: any) {
                                            setToast({ message: 'Error fetching late fee info', type: 'error' })
                                          } finally {
                                            setLoadingPenalty(false)
                                          }
                                        } else {
                                          handlePayTerm(term)
                                        }
                                      }}
                                      className="btn-primary text-xs py-1.5 px-3"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                      Pay Term
                                    </button>
                                    {!isTermDelinquent && (
                                      <button
                                        onClick={async () => {
                                          // Fetch penalty preview first
                                          setLoadingPenalty(true)
                                          try {
                                            const penaltyRes = await installmentApi.getSkipPenalty(term.termId)
                                            const penalty = penaltyRes.data.penalty
                                            setConfirmModal({
                                              show: true,
                                              title: 'Skip Term with Late Fee',
                                              message: `Are you sure you want to skip Term ${term.termNumber}?\n\nA late fee of ₱${penalty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (5% of term amount or minimum ₱50) will be added to your remaining balance.\n\nThis action cannot be undone.`,
                                              onConfirm: () => handleSkipTerm(term.termId)
                                            })
                                          } catch (error: any) {
                                            setToast({ message: 'Error fetching penalty info', type: 'error' })
                                          } finally {
                                            setLoadingPenalty(false)
                                          }
                                        }}
                                        disabled={skippingTerm === term.termId || loadingPenalty}
                                        className="btn-secondary text-xs py-1.5 px-3"
                                      >
                                        {skippingTerm === term.termId || loadingPenalty ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <SkipForward className="w-3.5 h-3.5" />
                                        )}
                                        Skip
                                      </button>
                                    )}
                                  </div>
                                  ) : (
                                    <span className="text-dark-500 text-sm italic">View-only: Borrower payment status</span>
                                  )
                                ) : (
                                  <span className="text-dark-500 text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-dark-500" />
                  </div>
                  <p className="text-dark-400">No installment terms found.</p>
                </div>
              )}

              {/* Installment Notes */}
              {entry.installmentPlan.notes && (
                <div className="p-6 border-t border-dark-800">
                  <p className="text-sm text-dark-500 mb-1">Installment Notes</p>
                  <p className="text-dark-300">{entry.installmentPlan.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Payments History */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-dark-800 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-dark-100">Payment History</h2>
              {/* Only show "Add Payment" button for borrowers on incomplete entries */}
              {entry.userRole === 'BORROWER' && entry.status !== 'PAID' && entry.amountRemaining > 0 && (
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400">No payments recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount Paid</th>
                      <th>Change</th>
                      <th>Payee</th>
                      <th>Notes</th>
                      {/* Only show Actions column if user is LENDER (for viewing) or BORROWER (for editing) */}
                      {(entry.userRole === 'LENDER' || entry.userRole === 'BORROWER') && (
                        <th>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr key={payment.paymentId} className="stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>
                          <div className="flex items-center gap-2 text-dark-300">
                            <Calendar className="w-4 h-4 text-dark-500" />
                            {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="font-mono font-medium text-accent-400">
                          +₱{payment.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          {(() => {
                            let effectiveChange = payment.changeAmount || 0
                            // Calculate change retroactively if not stored
                            if (effectiveChange === 0 && entry && entry.status === 'PAID' && entry.amountRemaining === 0) {
                              if (payment.paymentAmount > entry.amountBorrowed) {
                                effectiveChange = Number((payment.paymentAmount - entry.amountBorrowed).toFixed(2))
                              }
                            }
                            return effectiveChange > 0 ? (
                              <span className="font-mono font-medium text-amber-400">
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
                            {payment.payeePersonName}
                          </div>
                        </td>
                        <td className="text-dark-400">
                          {payment.notes || '-'}
                        </td>
                        {/* Show View button for lenders, or edit/delete for borrowers */}
                        {(entry.userRole === 'LENDER' || entry.userRole === 'BORROWER') && (
                          <td>
                            <div className="flex items-center gap-2">
                              {/* View button - available for lenders and borrowers */}
                              <button
                                onClick={() => viewPaymentDetails(payment)}
                                className="p-2 hover:bg-dark-800 rounded transition-colors"
                                title="View Payment Details"
                              >
                                <Eye className="w-4 h-4 text-dark-400 hover:text-primary-400" />
                              </button>
                              {/* Edit/Delete buttons - only for borrowers */}
                              {entry.userRole === 'BORROWER' && (
                                <>
                                  {/* Add edit/delete functionality here if needed */}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-dark-100 mb-4">Quick Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-dark-400">Transaction Type</span>
                <span className="text-dark-200">{entry.transactionType.replace('_EXPENSE', '').replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-400">Total Payments</span>
                <span className="text-dark-200">{payments.length}</span>
              </div>
              {/* Late Fees - Only show for installments with penalties */}
              {entry.transactionType === 'INSTALLMENT_EXPENSE' && entry.installmentPlan?.installmentTerms && (() => {
                const totalPenalties = entry.installmentPlan.installmentTerms
                  .filter(t => t.penaltyApplied && t.penaltyApplied > 0)
                  .reduce((sum, t) => sum + (t.penaltyApplied || 0), 0)
                
                if (totalPenalties > 0) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">Late Fees</span>
                      <span className="text-rose-400 font-mono">
                        +₱{totalPenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                }
                return null
              })()}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">Progress</span>
                <span className="text-dark-200">{paymentPercentage.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-dark-100 mb-4 text-center">Payment Progress</h3>
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-dark-800"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#detailProgressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${paymentPercentage * 3.52} 352`}
                  />
                  <defs>
                    <linearGradient id="detailProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display font-bold text-dark-50">
                    {paymentPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="glass-card p-6 max-w-2xl w-full my-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-dark-50">Add Payment</h2>
                <p className="mt-1 text-dark-400">Record a new payment for this entry</p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentFormData({
                    paymentDate: '',
                    paymentAmount: '',
                    payeePerson: null,
                    proof: null,
                    notes: '',
                    allocationId: undefined,
                  })
                }}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-6">
              {/* Payment Information */}
              <div className="glass-card p-6 space-y-6 bg-dark-900/50">
                <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-accent-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-dark-100">Payment Details</h3>
                    <p className="text-sm text-dark-500">Enter payment information</p>
                  </div>
                </div>

                <div>
                  <label className="label">Payment Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="date"
                      required
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Payment Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 font-medium">₱</span>
                    <input
                      type="text"
                      required
                      value={paymentFormData.paymentAmount}
                      onChange={(e) => {
                        // For STRAIGHT transactions, don't allow editing - must pay full amount
                        if (entry.transactionType === 'STRAIGHT_EXPENSE') {
                          return
                        }
                        const raw = e.target.value.replace(/[^0-9.,]/g, '')
                        setPaymentFormData({ ...paymentFormData, paymentAmount: raw })
                      }}
                      onBlur={(e) => {
                        if (entry.transactionType === 'STRAIGHT_EXPENSE') {
                          return
                        }
                        const formatted = formatCurrencyInput(e.target.value)
                        setPaymentFormData({ ...paymentFormData, paymentAmount: formatted })
                      }}
                      placeholder="0.00"
                      className={`input-field pl-8 font-mono ${
                        entry.transactionType === 'STRAIGHT_EXPENSE' 
                          ? 'bg-dark-800/50 cursor-not-allowed' 
                          : ''
                      }`}
                      readOnly={entry.transactionType === 'STRAIGHT_EXPENSE'}
                    />
                  </div>
                  {entry && (
                    <>
                      {entry.transactionType === 'STRAIGHT_EXPENSE' ? (
                        <p className="mt-2 text-sm text-amber-400 font-medium">
                          For Straight transactions, you must pay the full amount borrowed: ₱{entry.amountBorrowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-dark-500">
                          Remaining amount: <span className="text-amber-400 font-medium">₱{entry.amountRemaining.toLocaleString()}</span>
                        </p>
                      )}
                    </>
                  )}
                  {/* Overpayment Warning - Only show for non-STRAIGHT transactions */}
                  {entry && entry.transactionType !== 'STRAIGHT_EXPENSE' && paymentFormData.paymentAmount && (() => {
                    const paymentValue = parseFloat(paymentFormData.paymentAmount.replace(/,/g, '')) || 0
                    const changeAmount = Number((paymentValue - entry.amountRemaining).toFixed(2))
                    if (changeAmount > 0) {
                      return (
                        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-amber-400" />
                          </div>
                          <p className="text-sm text-amber-300">
                            <strong>Overpayment:</strong> A change of <strong>₱{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> will need to be returned to the borrower.
                          </p>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>

                <PersonSelector
                  label="Payee (Person) *"
                  value={paymentFormData.payeePerson?.personId || ''}
                  onChange={(person: Person | null) => {
                    setPaymentFormData({ ...paymentFormData, payeePerson: person })
                    // Clear allocationId if person changes and doesn't match the allocation
                    if (person && paymentFormData.allocationId) {
                      const allocation = paymentAllocations.find(a => a.allocationId === paymentFormData.allocationId)
                      if (allocation && allocation.personId !== person.personId) {
                        setPaymentFormData(prev => ({ ...prev, allocationId: undefined }))
                      }
                    }
                  }}
                  placeholder={entry?.borrowerGroupId ? "Select a group member" : "Payee (defaults to borrower)"}
                  required
                  disabled={!entry?.borrowerGroupId && !!entry?.borrowerPersonId}
                  allowedPersons={entry?.borrowerGroupId && group ? group.members : undefined}
                />
                {entry?.transactionType === 'GROUP_EXPENSE' && paymentAllocations.length > 0 && (
                  <div>
                    <label className="label">Allocation (Optional)</label>
                    <select
                      value={paymentFormData.allocationId || ''}
                      onChange={(e) => {
                        const allocationId = e.target.value || undefined
                        const allocation = allocationId ? paymentAllocations.find(a => a.allocationId === allocationId) : null
                        setPaymentFormData({
                          ...paymentFormData,
                          allocationId,
                          payeePerson: allocation ? 
                            (group?.members.find(m => m.personId === allocation.personId) || 
                             { personId: allocation.personId, fullName: allocation.personName }) : 
                            paymentFormData.payeePerson,
                          paymentAmount: allocation ? allocation.amount.toFixed(2) : paymentFormData.paymentAmount,
                        })
                      }}
                      className="input-field"
                    >
                      <option value="">None (General payment)</option>
                      {paymentAllocations.map(allocation => (
                        <option key={allocation.allocationId} value={allocation.allocationId}>
                          {allocation.personName} - ₱{allocation.amount.toLocaleString()} 
                          {allocation.paymentAllocationStatus !== 'UNPAID' && 
                            ` (${allocation.paymentAllocationStatus === 'PAID' ? 'Paid' : 'Partially Paid'})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-dark-500 mt-1">
                      Select an allocation to link this payment to a specific member's share
                    </p>
                  </div>
                )}
                {!entry?.borrowerGroupId && entry?.borrowerPersonId && (
                  <p className="text-sm text-dark-500 italic">
                    Payee is set to the borrower for this entry. For group expenses, you can select a specific payee.
                  </p>
                )}
                {entry?.borrowerGroupId && (
                  <p className="text-sm text-dark-500 italic">
                    Only group members can be selected as payee for group expenses.
                  </p>
                )}
              </div>

              {/* Proof Section */}
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-dark-100">Proof of Payment</h3>
                    <p className="text-sm text-dark-500">Upload a document or image as proof (optional)</p>
                  </div>
                </div>

                <div>
                  <label className="label">Upload File</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.heic,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setPaymentFormData({ ...paymentFormData, proof: file })
                    }}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30 input-field cursor-pointer"
                  />
                  {paymentFormData.proof && (
                    <p className="mt-2 text-sm text-dark-400">Selected: {paymentFormData.proof.name}</p>
                  )}
                  <p className="mt-2 text-xs text-dark-500">Max 10MB. Accepted: JPG, PNG, PDF, HEIC, WEBP.</p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="glass-card p-6 space-y-6 bg-dark-900/50">
                <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
                  <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-dark-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-dark-100">Notes</h3>
                    <p className="text-sm text-dark-500">Additional information (optional)</p>
                  </div>
                </div>

                <div>
                  <label className="label">Payment Notes</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about this payment..."
                    className="input-field resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentFormData({
                      paymentDate: '',
                      paymentAmount: '',
                      payeePerson: null,
                      proof: null,
                      notes: '',
                      allocationId: undefined,
                    })
                  }}
                  className="btn-secondary"
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="btn-primary"
                >
                  {submittingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Create Payment
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-dark-50">Delete Entry</h2>
                <p className="text-sm text-dark-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-dark-300 mb-6">
              Are you sure you want to delete <strong className="text-dark-100">{entry?.entryName}</strong>? 
              This will permanently delete the entry and all associated data from the database.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!id) return
                  setDeleting(true)
                  try {
                    await entryApi.delete(id)
                    navigate('/entries')
                  } catch (error: any) {
                    console.error('Error deleting entry:', error)
                    const errorMessage = error?.response?.data?.error || 
                                        error?.response?.data?.message || 
                                        error?.message || 
                                        'Error deleting entry. Please try again.'
                    setToast({ message: errorMessage, type: 'error' })
                    setDeleting(false)
                  }
                }}
                className="btn-secondary text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && entry && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="glass-card p-6 max-w-2xl w-full my-8 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-dark-50">Edit Entry</h2>
                  <p className="mt-1 text-dark-400">Modify entry details</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Entry Name *</label>
                  <input
                    type="text"
                    value={entry.entryName}
                    onChange={(e) => setEntry({ ...entry, entryName: e.target.value })}
                    className="input-field"
                    placeholder="Enter entry name"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={entry.description || ''}
                    onChange={(e) => setEntry({ ...entry, description: e.target.value })}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date Borrowed</label>
                    <input
                      type="date"
                      value={entry.dateBorrowed ? new Date(entry.dateBorrowed).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEntry({ ...entry, dateBorrowed: e.target.value || undefined })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Amount Borrowed</label>
                    <input
                      type="number"
                      step="0.01"
                      value={entry.amountBorrowed}
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value) || 0
                        setEntry({ 
                          ...entry, 
                          amountBorrowed: newAmount,
                          amountRemaining: Math.max(0, entry.amountRemaining + (newAmount - entry.amountBorrowed))
                        })
                      }}
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={entry.notes || ''}
                    onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Enter notes"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!id || !entry) return
                      try {
                        const updateRequest: any = {
                          entryName: entry.entryName,
                          description: entry.description || undefined,
                          dateBorrowed: entry.dateBorrowed || undefined,
                          amountBorrowed: entry.amountBorrowed,
                          notes: entry.notes || undefined,
                          paymentNotes: entry.paymentNotes || undefined,
                          transactionType: entry.transactionType,
                          borrowerPersonId: entry.borrowerPersonId || undefined,
                          borrowerGroupId: entry.borrowerGroupId || undefined,
                          lenderPersonId: entry.lenderPersonId,
                        }
                        await entryApi.update(id, updateRequest)
                        setShowEditModal(false)
                        await loadEntry()
                        setToast({ message: 'Entry updated successfully!', type: 'success' })
                      } catch (error: any) {
                        console.error('Error updating entry:', error)
                        const errorMessage = error?.response?.data?.error || 
                                            error?.response?.data?.message || 
                                            error?.message || 
                                            'Error updating entry. Please try again.'
                        setToast({ message: errorMessage, type: 'error' })
                      }
                    }}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Single Allocation Modal */}
      {showEditAllocationModal && editingAllocation && entry && (
        <EditAllocationModal
          allocation={editingAllocation}
          allAllocations={paymentAllocations}
          entry={entry}
          group={group}
          onClose={() => {
            setShowEditAllocationModal(false)
            setEditingAllocation(null)
          }}
          onSuccess={async () => {
            await loadPaymentAllocations()
            await loadEntry()
            setShowEditAllocationModal(false)
            setEditingAllocation(null)
            setToast({ message: 'Allocation updated successfully!', type: 'success' })
          }}
        />
      )}

      {/* Payment Allocation Modal */}
      {showAllocationModal && entry && allocationMode && (
        <PaymentAllocationModal
          entry={entry}
          group={group}
          mode={allocationMode}
          existingAllocations={paymentAllocations}
          onClose={() => {
            setShowAllocationModal(false)
            setAllocationMode(null)
          }}
          onSuccess={async () => {
            await loadPaymentAllocations()
            await loadEntry()
            setShowAllocationModal(false)
            setAllocationMode(null)
            setToast({ message: 'Payment allocations updated successfully!', type: 'success' })
          }}
          onError={(error) => {
            setToast({ message: error, type: 'error' })
          }}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-dark-50">{confirmModal.title}</h2>
              </div>
            </div>
            <p className="text-dark-300 mb-6 whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm()
                  setConfirmModal({ ...confirmModal, show: false })
                }}
                className="btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Installment Payment Modal */}
      {showInstallmentPaymentModal && selectedTerm && entry && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="glass-card p-6 max-w-lg w-full my-8 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-dark-50">Pay Installment Term</h2>
                  <p className="mt-1 text-dark-400">Term {selectedTerm.termNumber} - Due: {format(new Date(selectedTerm.dueDate), 'MMM dd, yyyy')}</p>
                </div>
                <button
                  onClick={() => {
                    setShowInstallmentPaymentModal(false)
                    setSelectedTerm(null)
                    setIncludedLateFees(0)
                    setPaymentFormData({
                      paymentDate: '',
                      paymentAmount: '',
                      payeePerson: null,
                      proof: null,
                      notes: '',
                      allocationId: undefined,
                    })
                  }}
                  className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>

              {/* Term Info */}
              <div className="p-4 bg-dark-800/50 rounded-xl mb-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Amount Due</p>
                    <p className="text-xl font-mono font-bold text-accent-400">
                      ₱{((entry.installmentPlan?.amountPerTerm || 0) + includedLateFees).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {includedLateFees > 0 && (
                      <p className="text-xs text-rose-400 mt-1">
                        (includes ₱{includedLateFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} late fees)
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Remaining Balance</p>
                    <p className="text-xl font-mono font-bold text-amber-400">
                      ₱{entry.amountRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInstallmentPaymentSubmit} className="space-y-6">
                <div>
                  <label className="label">Payment Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="date"
                      required
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Payment Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 font-medium">₱</span>
                    <input
                      type="text"
                      required
                      readOnly
                      value={paymentFormData.paymentAmount}
                      className="input-field pl-8 font-mono bg-dark-800/50 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-sm text-dark-500">
                    Amount: <span className="text-accent-400 font-medium">₱{((entry.installmentPlan?.amountPerTerm || 0) + includedLateFees).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {includedLateFees > 0 && (
                      <span className="text-rose-400 ml-1">(+₱{includedLateFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} late fees)</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder={`Payment for Term ${selectedTerm.termNumber}`}
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInstallmentPaymentModal(false)
                      setSelectedTerm(null)
                      setIncludedLateFees(0)
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="btn-primary"
                  >
                    {submittingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        Pay Term
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal - For lenders to view payment details */}
      {showPaymentDetailModal && selectedPaymentDetail && entry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-accent-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-dark-50">Payment Details</h2>
                  <p className="text-sm text-dark-400">Payment information and proof</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPaymentDetailModal(false)
                  setSelectedPaymentDetail(null)
                  if (paymentProofUrl) {
                    URL.revokeObjectURL(paymentProofUrl)
                    setPaymentProofUrl(null)
                  }
                }}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Amount and Change */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                  <p className="text-sm text-dark-400 mb-1">Amount Paid</p>
                  <p className="text-2xl font-display font-bold text-accent-400">
                    ₱{selectedPaymentDetail.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-dark-800/50 rounded-xl text-center">
                  <p className="text-sm text-dark-400 mb-1">Change to Return</p>
                  {selectedPaymentDetail.changeAmount && selectedPaymentDetail.changeAmount > 0 ? (
                    <p className="text-2xl font-display font-bold text-amber-400">
                      ₱{selectedPaymentDetail.changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  ) : (
                    <p className="text-2xl font-display font-bold text-dark-500">₱0.00</p>
                  )}
                </div>
              </div>

              {/* Change Alert */}
              {selectedPaymentDetail.changeAmount && selectedPaymentDetail.changeAmount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-300">
                    <strong>Overpayment:</strong> You need to return <strong>₱{selectedPaymentDetail.changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> as change to the borrower.
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-dark-500 mb-1">Payment Date</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <Calendar className="w-4 h-4 text-dark-400" />
                    {format(new Date(selectedPaymentDetail.paymentDate), 'MMMM dd, yyyy')}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-dark-500 mb-1">Payee (Borrower)</p>
                  <div className="flex items-center gap-2 text-dark-200">
                    <User className="w-4 h-4 text-dark-400" />
                    {selectedPaymentDetail.payeePersonName}
                  </div>
                </div>
                
                {entry.lenderPersonName && (
                  <div className="col-span-2">
                    <p className="text-sm text-dark-500 mb-1">Lender</p>
                    <div className="flex items-center gap-2 text-primary-300">
                      <User className="w-4 h-4 text-primary-400" />
                      {entry.lenderPersonName}
                    </div>
                  </div>
                )}
              </div>

              {/* Related Entry */}
              {selectedPaymentDetail.entryId && entry && (
                <div className="p-4 bg-dark-800/30 rounded-xl">
                  <p className="text-sm text-dark-500 mb-2">Related Entry</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-dark-200">{entry.entryName}</p>
                      <code className="text-xs text-dark-500 font-mono">
                        {entry.referenceId}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedPaymentDetail.notes && (
                <div>
                  <p className="text-sm text-dark-500 mb-2">Notes</p>
                  <p className="text-dark-300 bg-dark-800/30 p-3 rounded-lg">
                    {selectedPaymentDetail.notes}
                  </p>
                </div>
              )}

              {/* Payment Proof */}
              {selectedPaymentDetail.hasProof && (
                <div>
                  <p className="text-sm text-dark-500 mb-2">Proof of Payment</p>
                  {loadingProof ? (
                    <div className="p-8 bg-dark-800/30 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-dark-400 animate-spin" />
                      <span className="ml-3 text-dark-400">Loading proof...</span>
                    </div>
                  ) : paymentProofUrl ? (
                    <div className="space-y-3">
                      <div className="bg-dark-800/30 rounded-xl overflow-hidden">
                        <img 
                          src={paymentProofUrl} 
                          alt="Payment proof" 
                          className="w-full h-auto max-h-96 object-contain"
                          onError={(e) => {
                            // If image fails to load, show download option
                            const target = e.currentTarget as HTMLImageElement
                            target.style.display = 'none'
                            const container = target.parentElement
                            if (container) {
                              container.innerHTML = `
                                <div class="p-8 text-center">
                                  <svg class="w-12 h-12 text-dark-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                  </svg>
                                  <p class="text-dark-400 mb-3">Proof file available</p>
                                  <a href="${paymentProofUrl}" download="payment-proof-${selectedPaymentDetail.paymentId}.jpg" 
                                     class="btn-secondary inline-flex items-center gap-2">
                                    Download Proof
                                  </a>
                                </div>
                              `
                            }
                          }}
                        />
                      </div>
                      <a
                        href={paymentProofUrl}
                        download={`payment-proof-${selectedPaymentDetail.paymentId}.jpg`}
                        className="btn-secondary text-sm inline-flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Download Proof
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 bg-dark-800/30 rounded-xl text-center">
                      <p className="text-dark-400">Proof not available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end pt-4 border-t border-dark-800">
                <button
                  onClick={() => {
                    setShowPaymentDetailModal(false)
                    setSelectedPaymentDetail(null)
                    if (paymentProofUrl) {
                      URL.revokeObjectURL(paymentProofUrl)
                      setPaymentProofUrl(null)
                    }
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// Helper function to round to 2 decimal places
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Payment Allocation Modal Component
function PaymentAllocationModal({
  entry,
  group,
  mode,
  existingAllocations,
  onClose,
  onSuccess,
  onError,
}: {
  entry: Entry
  group: Group | null
  mode: 'equal' | 'percent' | 'amount'
  existingAllocations?: PaymentAllocation[]
  onClose: () => void
  onSuccess: () => void
  onError: (error: string) => void
}) {
  const [allocationItems, setAllocationItems] = useState<Array<{
    personId: string
    personName: string
    description: string
    amount: number
    percent?: number
    notes?: string
  }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Eligible persons: ONLY group members (lender should NOT be included as they are lending, not borrowing)
  const eligiblePersons = (() => {
    return [...(group?.members || [])]
  })()

  useEffect(() => {
    if (!initialized) {
      initializeAllocations()
      setInitialized(true)
    }
  }, [initialized])

  const initializeAllocations = () => {
    if (!group || !entry) return

    if (existingAllocations && existingAllocations.length > 0 && mode === 'percent') {
      setAllocationItems(
        existingAllocations.map(allocation => ({
          personId: allocation.personId,
          personName: allocation.personName,
          description: allocation.description,
          amount: allocation.amount,
          percent: allocation.percentageOfTotal || (allocation.amount / entry.amountBorrowed) * 100,
          notes: allocation.notes || '',
        }))
      )
      return
    }

    // Only group members (lender should NOT be included as they are lending, not borrowing)
    const allPeople: Person[] = [...(group.members || [])]

    if (mode === 'equal') {
      const baseAmountPerPerson = entry.amountBorrowed / allPeople.length
      const roundedAmountPerPerson = round2(baseAmountPerPerson)
      
      // Calculate the total of all rounded amounts
      const totalRounded = roundedAmountPerPerson * allPeople.length
      const difference = round2(entry.amountBorrowed - totalRounded)
      
      // Create allocation items, adjusting the last person's amount to compensate for rounding
      const items = allPeople.map((person, index) => ({
        personId: person.personId,
        personName: person.fullName,
        description: entry.entryName || 'Expense',
        amount: index === allPeople.length - 1 
          ? round2(roundedAmountPerPerson + difference)
          : roundedAmountPerPerson,
        notes: '',
      }))
      
      setAllocationItems(items)
    } else if (mode === 'percent') {
      const percentPerPerson = 100 / allPeople.length
      const baseAmountPerPerson = (entry.amountBorrowed * percentPerPerson) / 100
      const roundedAmountPerPerson = round2(baseAmountPerPerson)
      
      // Calculate the total of all rounded amounts
      const totalRounded = roundedAmountPerPerson * allPeople.length
      const difference = round2(entry.amountBorrowed - totalRounded)
      
      // Create allocation items, adjusting the last person's amount to compensate for rounding
      const items = allPeople.map((person, index) => ({
        personId: person.personId,
        personName: person.fullName,
        description: entry.entryName || 'Expense',
        amount: index === allPeople.length - 1 
          ? round2(roundedAmountPerPerson + difference)
          : roundedAmountPerPerson,
        percent: percentPerPerson,
        notes: '',
      }))
      
      setAllocationItems(items)
    } else if (mode === 'amount') {
      setAllocationItems(
        allPeople.map(person => ({
          personId: person.personId,
          personName: person.fullName,
          description: entry.entryName || 'Expense',
          amount: 0,
          notes: '',
        }))
      )
    }
  }

  const handleSubmit = async () => {
    if (!entry) return

    if (mode === 'percent') {
      const totalPercent = allocationItems.reduce((sum, item) => sum + (item.percent || 0), 0)
      if (Math.abs(totalPercent - 100) > 0.01) {
        onError(`Total percentage must equal 100%. Current: ${totalPercent.toFixed(2)}%`)
        return
      }
    } else if (mode === 'amount') {
      const totalAmount = allocationItems.reduce((sum, item) => sum + item.amount, 0)
      if (Math.abs(totalAmount - entry.amountBorrowed) > 0.01) {
        onError(`Total amount must equal ₱${entry.amountBorrowed.toLocaleString()}. Current: ₱${totalAmount.toLocaleString()}`)
        return
      }
    }

    if (allocationItems.some(item => !item.description.trim())) {
      onError('All items must have a description')
      return
    }

    setSubmitting(true)
    try {
      const allocations = allocationItems.map(item => ({
        personId: item.personId,
        description: item.description.trim(),
        amount: item.amount,
        notes: item.notes?.trim() || undefined,
      }))

      if (existingAllocations && existingAllocations.length > 0) {
        await Promise.all(existingAllocations.map(a => paymentAllocationApi.delete(a.allocationId)))
      }

      await paymentAllocationApi.create(entry.entryId, allocations)
      onSuccess()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating payment allocations'
      onError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const updateItem = (index: number, updates: Partial<typeof allocationItems[0]>) => {
    const newItems = [...allocationItems]
    newItems[index] = { ...newItems[index], ...updates }
    
    if (updates.percent !== undefined && mode === 'percent') {
      newItems[index].amount = (entry.amountBorrowed * updates.percent) / 100
    }
    
    setAllocationItems(newItems)
  }

  const normalizePercentages = () => {
    if (mode !== 'percent') return
    
    const totalPercent = allocationItems.reduce((sum, item) => sum + (item.percent || 0), 0)
    
    if (totalPercent === 0) {
      const percentPerItem = 100 / allocationItems.length
      setAllocationItems(allocationItems.map(item => ({
        ...item,
        percent: percentPerItem,
        amount: (entry.amountBorrowed * percentPerItem) / 100,
      })))
      return
    }
    
    if (Math.abs(totalPercent - 100) > 0.01) {
      const normalizedItems = allocationItems.map(item => {
        const normalizedPercent = ((item.percent || 0) / totalPercent) * 100
        return {
          ...item,
          percent: normalizedPercent,
          amount: (entry.amountBorrowed * normalizedPercent) / 100,
        }
      })
      setAllocationItems(normalizedItems)
    }
  }

  const balanceAmounts = () => {
    if (mode !== 'amount') return
    
    const totalAmount = allocationItems.reduce((sum, item) => sum + item.amount, 0)
    
    if (totalAmount === 0) {
      const amountPerItem = entry.amountBorrowed / allocationItems.length
      setAllocationItems(allocationItems.map(item => ({
        ...item,
        amount: amountPerItem,
      })))
      return
    }
    
    if (Math.abs(totalAmount - entry.amountBorrowed) > 0.01) {
      const normalizedItems = allocationItems.map(item => ({
        ...item,
        amount: (item.amount / totalAmount) * entry.amountBorrowed,
      }))
      setAllocationItems(normalizedItems)
    }
  }

  const addItem = () => {
    if (eligiblePersons.length === 0) return
    setAllocationItems([
      ...allocationItems,
      {
        personId: eligiblePersons[0]?.personId || '',
        personName: eligiblePersons[0]?.fullName || '',
        description: '',
        amount: 0,
        notes: '',
      },
    ])
  }

  const removeItem = (index: number) => {
    setAllocationItems(allocationItems.filter((_, i) => i !== index))
  }

  const getTotal = () => {
    if (mode === 'percent') {
      return allocationItems.reduce((sum, item) => sum + (item.percent || 0), 0)
    }
    return allocationItems.reduce((sum, item) => sum + item.amount, 0)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="glass-card p-6 max-w-4xl w-full my-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-dark-50">
                {mode === 'equal' && 'Divide Equally'}
                {mode === 'percent' && 'Divide by Percent'}
                {mode === 'amount' && 'Divide by Amount'}
              </h2>
              <p className="mt-1 text-dark-400">Allocate expense among group members and lender</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Total Expense:</span>
                <span className="font-mono font-bold text-dark-100">₱{entry.amountBorrowed.toLocaleString()}</span>
              </div>
              {mode === 'percent' && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Total Percentage:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${Math.abs(getTotal() - 100) < 0.01 ? 'text-accent-400' : 'text-rose-400'}`}>
                        {getTotal().toFixed(2)}%
                      </span>
                      {Math.abs(getTotal() - 100) < 0.01 ? (
                        <span className="text-xs text-accent-400">✓ Valid</span>
                      ) : (
                        <button
                          onClick={normalizePercentages}
                          className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded hover:bg-primary-500/30 transition-colors"
                        >
                          Balance to 100%
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {mode === 'amount' && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Total Allocated:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${Math.abs(getTotal() - entry.amountBorrowed) < 0.01 ? 'text-accent-400' : 'text-rose-400'}`}>
                        ₱{getTotal().toLocaleString()}
                      </span>
                      {Math.abs(getTotal() - entry.amountBorrowed) < 0.01 ? (
                        <span className="text-xs text-accent-400">✓ Valid</span>
                      ) : (
                        <button
                          onClick={balanceAmounts}
                          className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded hover:bg-primary-500/30 transition-colors"
                        >
                          Balance to Total
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
            {allocationItems.map((item, index) => (
              <div key={index} className="glass-card p-4 bg-dark-900/50">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-3">
                    <label className="label text-xs">Person</label>
                    <select
                      value={item.personId}
                      onChange={(e) => {
                        const person = eligiblePersons.find(p => p.personId === e.target.value)
                        updateItem(index, {
                          personId: e.target.value,
                          personName: person?.fullName || '',
                        })
                      }}
                      className="input-field text-sm"
                    >
                      {eligiblePersons.map(person => (
                        <option key={person.personId} value={person.personId}>
                          {person.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="label text-xs">Description *</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className="input-field text-sm"
                      placeholder="Item name or description"
                    />
                  </div>
                  {mode === 'percent' ? (
                    <>
                      <div className="col-span-2">
                        <label className="label text-xs">Percent (%) *</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.percent === 0 || !item.percent ? '' : item.percent}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                              const value = Math.max(0, parseFloat(rawValue) || 0)
                              updateItem(index, { percent: value })
                            }}
                            className="input-field text-sm pr-8"
                            placeholder="0.00"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-xs">%</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs">Amount (₱)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">₱</span>
                          <input
                            type="text"
                            value={item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            className="input-field text-sm font-mono pl-8 bg-dark-900/50"
                            disabled
                            readOnly
                          />
                        </div>
                      </div>
                    </>
                  ) : mode === 'amount' ? (
                    <div className="col-span-4">
                      <label className="label text-xs">Amount (₱) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">₱</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.amount === 0 ? '' : item.amount}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                            const value = Math.max(0, parseFloat(rawValue) || 0)
                            updateItem(index, { amount: value })
                          }}
                          className="input-field text-sm font-mono pl-8"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-4">
                      <label className="label text-xs">Amount (₱)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          className="input-field text-sm font-mono pl-8 bg-dark-900/50"
                          disabled
                          readOnly
                        />
                      </div>
                    </div>
                  )}
                  <div className="col-span-1 flex items-end">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 hover:bg-dark-800 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4 text-dark-400 hover:text-rose-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-dark-800">
            <button
              onClick={addItem}
              className="btn-secondary text-sm"
              disabled={submitting}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Allocations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Single Allocation Modal Component - Only shows group members + lender
function EditAllocationModal({
  allocation,
  allAllocations,
  entry,
  group,
  onClose,
  onSuccess,
}: {
  allocation: PaymentAllocation
  allAllocations: PaymentAllocation[]
  entry: Entry
  group: Group | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    description: allocation.description,
    amount: allocation.amount,
    notes: allocation.notes || '',
  })
  const [autoBalance, setAutoBalance] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState(allocation.personId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Only show group members (lender should NOT be included as they are lending, not borrowing)
  const eligiblePersons = (() => {
    return [...(group?.members || [])]
  })()

  const otherAllocations = allAllocations.filter(a => a.allocationId !== allocation.allocationId)
  const otherAllocationsTotal = otherAllocations.reduce((sum, a) => sum + a.amount, 0)
  const newOtherTotal = entry.amountBorrowed - formData.amount
  const willExceedTotal = formData.amount >= entry.amountBorrowed
  const canAutoBalance = otherAllocations.length > 0 && newOtherTotal > 0

  const handleSubmit = async () => {
    setErrorMessage(null)
    
    if (!formData.description.trim()) {
      setErrorMessage('Description is required')
      return
    }

    if (formData.amount <= 0) {
      setErrorMessage('Amount must be greater than 0')
      return
    }

    if (willExceedTotal) {
      setErrorMessage(`Amount cannot exceed total expense (₱${entry.amountBorrowed.toLocaleString()})`)
      return
    }

    setSubmitting(true)
    try {
      await paymentAllocationApi.update(allocation.allocationId, {
        description: formData.description.trim(),
        amount: formData.amount,
        notes: formData.notes?.trim() || undefined,
        personId: selectedPersonId,
      })

      if (autoBalance && canAutoBalance && otherAllocationsTotal > 0) {
        const adjustmentFactor = newOtherTotal / otherAllocationsTotal
        
        const updatePromises = otherAllocations.map(otherAlloc => {
          const newAmount = otherAlloc.amount * adjustmentFactor
          return paymentAllocationApi.update(otherAlloc.allocationId, {
            amount: Math.max(0.01, newAmount),
            description: otherAlloc.description,
            personId: otherAlloc.personId,
            notes: otherAlloc.notes || undefined,
          })
        })
        
        await Promise.all(updatePromises)
      }

      onSuccess()
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || error?.message || 'Error updating allocation'
      setErrorMessage(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-card p-6 max-w-lg w-full animate-slide-up my-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50">Edit Allocation</h2>
            <p className="text-sm text-dark-400">Modify payment allocation details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-start gap-2 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-rose-300">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-rose-500/20 rounded"
            >
              <X className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="label">Person *</label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="input-field"
            >
              {eligiblePersons.map(person => (
                <option key={person.personId} value={person.personId}>
                  {person.fullName}
                </option>
              ))}
            </select>
            <p className="text-xs text-dark-500 mt-1">Only group members are shown (lender is excluded)</p>
          </div>

          <div>
            <label className="label">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              placeholder="Item name or description"
            />
          </div>

          <div>
            <label className="label">Amount (₱) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.amount === 0 ? '' : formData.amount}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                setFormData({ ...formData, amount: parseFloat(rawValue) || 0 })
                setErrorMessage(null)
              }}
              className={`input-field font-mono ${willExceedTotal ? 'border-rose-500' : ''}`}
              placeholder="0.00"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-dark-500">
                Percentage: {((formData.amount / entry.amountBorrowed) * 100).toFixed(2)}%
              </span>
              {willExceedTotal && (
                <span className="text-rose-400">Exceeds total expense!</span>
              )}
            </div>
          </div>

          {otherAllocations.length > 0 && (
            <div className="p-3 bg-dark-900/50 rounded-lg border border-dark-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-dark-200">Auto-balance other allocations</label>
                <button
                  type="button"
                  onClick={() => setAutoBalance(!autoBalance)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${autoBalance ? 'bg-primary-500' : 'bg-dark-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoBalance ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-xs text-dark-400">
                {autoBalance 
                  ? 'Other allocations will be adjusted proportionally to maintain the total expense amount.'
                  : 'Other allocations will not be changed. Total may not equal expense amount.'
                }
              </p>
              
              {autoBalance && canAutoBalance && otherAllocationsTotal > 0 && (
                <div className="mt-3 pt-3 border-t border-dark-700">
                  <p className="text-xs text-dark-300 mb-2">Preview of changes:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {otherAllocations.map(otherAlloc => {
                      const adjustmentFactor = newOtherTotal / otherAllocationsTotal
                      const newAmount = Math.max(0.01, otherAlloc.amount * adjustmentFactor)
                      const change = newAmount - otherAlloc.amount
                      return (
                        <div key={otherAlloc.allocationId} className="flex items-center justify-between text-xs">
                          <span className="text-dark-400">{otherAlloc.personName}</span>
                          <span className={change >= 0 ? 'text-accent-400' : 'text-rose-400'}>
                            ₱{otherAlloc.amount.toFixed(2)} → ₱{newAmount.toFixed(2)}
                            <span className="ml-1">({change >= 0 ? '+' : ''}{change.toFixed(2)})</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-dark-700 flex justify-between text-xs font-medium">
                    <span className="text-dark-300">New Total:</span>
                    <span className="text-accent-400">₱{entry.amountBorrowed.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="input-field resize-none"
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-dark-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || willExceedTotal}
            className="btn-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
