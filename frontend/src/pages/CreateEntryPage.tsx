import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { entryApi, paymentAllocationApi } from '../services/api'
import type { TransactionType, Person, Group, PaymentMethod } from '../types'
import PersonSelector from '../components/PersonSelector'
import GroupSelector from '../components/GroupSelector'
import { parseCurrencyToNumber, formatCurrencyInput } from '../utils/currency'
import PaymentAllocationDraftModal, { type AllocationDraftItem, type AllocationDraftMode, type AllocationDraftSubmitItem } from '../components/PaymentAllocationDraftModal'
import Toast, { type ToastType } from '../components/Toast'
import { 
  ArrowLeft, 
  Save, 
  User, 
  Users, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Loader2,
  Info,
  Edit,
  AlertCircle,
  X
} from 'lucide-react'

export default function CreateEntryPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const [allocationMode, setAllocationMode] = useState<AllocationDraftMode | null>(null)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [draftAllocations, setDraftAllocations] = useState<AllocationDraftItem[] | null>(null)

  const [formData, setFormData] = useState({
    entryName: '',
    description: '',
    transactionType: 'STRAIGHT_EXPENSE' as TransactionType,
    dateBorrowed: '',
    borrowerPerson: null as Person | null,
    borrowerGroup: null as Group | null,
    lenderPerson: null as Person | null,
    amountBorrowed: '',
    notes: '',
    paymentNotes: '',
    paymentMethod: 'CASH' as PaymentMethod,
    installmentStartDate: '',
    paymentFrequency: 'MONTHLY',
    paymentFrequencyDay: '1', // Default to 1st of month for monthly, or 'SUNDAY' for weekly
    paymentTerms: '',
  })

  const amountValue = useMemo(() => parseCurrencyToNumber(formData.amountBorrowed), [formData.amountBorrowed])

  const canUseAllocations =
    formData.transactionType === 'GROUP_EXPENSE' &&
    !!formData.borrowerGroup &&
    !!formData.lenderPerson &&
    amountValue > 0

  const allocationTotal = useMemo(() => {
    if (!draftAllocations) return 0
    return draftAllocations.reduce((sum, a) => sum + (a.amount || 0), 0)
  }, [draftAllocations])

  const allocationIsValid = useMemo(() => {
    if (!canUseAllocations) return true
    if (!draftAllocations || draftAllocations.length === 0) return false
    return Math.abs(allocationTotal - amountValue) <= 0.01
  }, [allocationTotal, amountValue, canUseAllocations, draftAllocations])

  // Clear lender if they are a member of the selected borrower group
  useEffect(() => {
    const currentBorrowerGroup = formData.borrowerGroup
    const currentLenderPerson = formData.lenderPerson
    
    if (currentBorrowerGroup && currentLenderPerson && currentBorrowerGroup.members && currentBorrowerGroup.members.length > 0) {
      const lenderIsGroupMember = currentBorrowerGroup.members.some(
        member => member.personId === currentLenderPerson.personId
      )
      if (lenderIsGroupMember) {
        setFormData(prev => {
          // Only update if lender is still the same (avoid race conditions)
          if (prev.lenderPerson?.personId === currentLenderPerson.personId) {
            return { ...prev, lenderPerson: null }
          }
          return prev
        })
        setToast({
          message: 'Lender cannot be a member of the borrower group. Please select a different lender.',
          type: 'error'
        })
      }
    }
  }, [formData.borrowerGroup, formData.lenderPerson])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (!formData.lenderPerson) {
        setFormError('Please select or create a lender')
        return
      }

      if (formData.transactionType !== 'GROUP_EXPENSE' && !formData.borrowerPerson) {
        setFormError('Please select or create a borrower')
        return
      }

      if (formData.transactionType === 'GROUP_EXPENSE' && !formData.borrowerGroup) {
        setFormError('Please select or create a borrower group')
        return
      }

      const lenderPersonId = formData.lenderPerson.personId

      let borrowerPersonId: string | undefined = undefined
      let borrowerGroupId: string | undefined = undefined
      
      if (formData.transactionType !== 'GROUP_EXPENSE') {
        borrowerPersonId = formData.borrowerPerson!.personId
        
        // Validate that borrower and lender are not the same person
        if (borrowerPersonId === lenderPersonId) {
          setToast({
            message: 'Borrower and lender cannot be the same person. Please select different people for the borrower and lender.',
            type: 'error'
          })
          setSubmitting(false)
          return
        }
      } else {
        borrowerGroupId = formData.borrowerGroup!.groupId
        
        // Validate that lender is not a member of the borrower group
        const lenderIsGroupMember = formData.borrowerGroup!.members.some(
          member => member.personId === lenderPersonId
        )
        if (lenderIsGroupMember) {
          setToast({
            message: 'Lender cannot be a member of the borrower group. Please select a lender who is not in the group.',
            type: 'error'
          })
          setSubmitting(false)
          return
        }
      }

      if (!formData.amountBorrowed || amountValue <= 0) {
        setFormError('Please enter a valid amount borrowed')
        return
      }

      // If we're creating a group expense and allocations were set, validate the draft totals.
      // (We also allow creating without allocations, but we surface a clear warning/error here.)
      if (formData.transactionType === 'GROUP_EXPENSE' && draftAllocations && draftAllocations.length > 0) {
        const draftTotal = draftAllocations.reduce((sum, a) => sum + (a.amount || 0), 0)
        if (Math.abs(draftTotal - amountValue) > 0.01) {
          setFormError(`Payment allocation total must equal ₱${amountValue.toLocaleString()}. Current: ₱${draftTotal.toLocaleString()}`)
          return
        }
      }

      const request: any = {
        entryName: formData.entryName,
        transactionType: formData.transactionType,
        lenderPersonId: lenderPersonId,
        amountBorrowed: amountValue,
      }

      if (formData.description?.trim()) {
        request.description = formData.description.trim()
      }
      if (formData.dateBorrowed) {
        request.dateBorrowed = formData.dateBorrowed
      }
      if (borrowerPersonId) {
        request.borrowerPersonId = borrowerPersonId
      }
      if (borrowerGroupId) {
        request.borrowerGroupId = borrowerGroupId
      }
      if (formData.notes?.trim()) {
        request.notes = formData.notes.trim()
      }
      if (formData.paymentNotes?.trim()) {
        request.paymentNotes = formData.paymentNotes.trim()
      }
      if (formData.paymentMethod) {
        request.paymentMethod = formData.paymentMethod
      }

      if (formData.transactionType === 'INSTALLMENT_EXPENSE') {
        if (formData.installmentStartDate) {
          request.installmentStartDate = formData.installmentStartDate
        }
        if (formData.paymentFrequency) {
          request.paymentFrequency = formData.paymentFrequency
        }
        if (formData.paymentFrequencyDay) {
          request.paymentFrequencyDay = formData.paymentFrequencyDay
        }
        if (formData.paymentTerms) {
          request.paymentTerms = parseInt(formData.paymentTerms)
        }
      }

      const response = proofFile
        ? await entryApi.createWithProof(request, proofFile)
        : await entryApi.create(request)

      console.log('Entry creation response:', response.data)

      // Verify entry was created and has entryId
      if (!response?.data?.entryId) {
        console.error('Entry creation response missing entryId:', response)
        throw new Error('Entry creation succeeded but no entryId was returned in the response')
      }

      const createdEntryId = response.data.entryId
      console.log('Created entry ID:', createdEntryId)

      // Add a small delay to ensure entry is fully persisted and transaction is committed
      // This helps avoid race conditions where the backend might not see the entry yet
      await new Promise(resolve => setTimeout(resolve, 200))

      // Persist allocations after entry is created (same endpoint used in Entry Detail).
      if (formData.transactionType === 'GROUP_EXPENSE' && draftAllocations && draftAllocations.length > 0) {
        const allocations: AllocationDraftSubmitItem[] = draftAllocations.map(a => ({
          personId: a.personId,
          description: a.description.trim(),
          amount: a.amount,
          notes: a.notes?.trim() || undefined,
        }))
        
        try {
          console.log('Creating payment allocations for entry:', createdEntryId)
          console.log('Allocations:', allocations)
          
          await paymentAllocationApi.create(createdEntryId, allocations)
          console.log('Payment allocations created successfully')
          
          // Add a small delay to ensure allocations are fully persisted before navigation
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error: any) {
          console.error('Error creating payment allocations:', error)
          console.error('Entry ID:', createdEntryId)
          console.error('Error response:', error?.response)
          console.error('Error details:', error?.response?.data)
          
          // Entry is created; show warning but continue to entry detail page
          const errorMessage = error?.response?.data?.error || 
                              error?.response?.data?.message || 
                              error?.message || 
                              'Unknown error'
          
          // Show toast notification instead of browser alert
          setToast({
            message: `Entry created successfully, but payment allocations failed to save: ${errorMessage}. You can add them manually on the entry detail page.`,
            type: 'error'
          })
          
          // Still navigate to the entry page so user can fix allocations there
          navigate(`/entries/${createdEntryId}`)
          return
        }
      }

      // Verify entry exists before navigating (retry logic for GROUP_EXPENSE and INSTALLMENT_EXPENSE entries)
      if (formData.transactionType === 'GROUP_EXPENSE' || formData.transactionType === 'INSTALLMENT_EXPENSE') {
        let verified = false
        let retries = 3
        
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`Verifying entry exists before navigation (attempt ${attempt}/${retries}):`, createdEntryId)
            await entryApi.getById(createdEntryId)
            console.log('Entry verified, navigating...')
            verified = true
            break
          } catch (verifyError: any) {
            console.error(`Attempt ${attempt} failed:`, verifyError?.response?.data)
            
            if (attempt < retries) {
              // Wait a bit longer before retrying
              await new Promise(resolve => setTimeout(resolve, 300 * attempt))
            } else {
              // Last attempt failed
              const verifyErrorMsg = verifyError?.response?.data?.error || 
                                     verifyError?.response?.data?.message || 
                                     verifyError?.message || 
                                     'Entry not found'
              
              setToast({
                message: `Entry was created (ID: ${createdEntryId}) but could not be verified after ${retries} attempts: ${verifyErrorMsg}. The entry may be available in the entries list.`,
                type: 'error'
              })
              
              console.error('Entry ID that failed verification after all retries:', createdEntryId)
              
              // Navigate to entries list instead so user can find their entry
              navigate('/entries')
              return
            }
          }
        }
        
        if (!verified) {
          // Should not reach here, but just in case
          navigate('/entries')
          return
        }
      }

      navigate(`/entries/${createdEntryId}`)
    } catch (error: any) {
      console.error('Error creating entry:', error)
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          'Error creating entry. Please check the console for details.'
      
      // Show toast for borrower/lender validation error, otherwise use form error
      if (errorMessage.includes('Borrower and lender cannot be the same person') || 
          errorMessage.includes('borrower and lender')) {
        setToast({
          message: 'Borrower and lender cannot be the same person. Please select different people for the borrower and lender.',
          type: 'error'
        })
      } else {
        setFormError(errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getTransactionTypeDescription = (type: TransactionType) => {
    switch (type) {
      case 'STRAIGHT_EXPENSE':
        return 'A simple one-time loan or expense between two people.'
      case 'INSTALLMENT_EXPENSE':
        return 'A loan paid back in multiple scheduled payments.'
      case 'GROUP_EXPENSE':
        return 'A shared expense split among group members.'
    }
  }

  return (
    <div className="page-enter max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/entries')}
          className="btn-ghost mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Entries
        </button>
        <h1 className="font-display text-3xl font-bold text-dark-50">Create New Entry</h1>
        <p className="mt-1 text-dark-400">Add a new loan or expense to track.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="glass-card p-4 border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-rose-300">{formError}</p>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="p-1 hover:bg-rose-500/10 rounded"
              title="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <X className="w-4 h-4 text-rose-300" />
            </button>
          </div>
        )}

        {/* Basic Information */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-100">Basic Information</h2>
              <p className="text-sm text-dark-500">Entry details and description</p>
            </div>
          </div>

          <div>
            <label className="label">Entry Name *</label>
            <input
              type="text"
              required
              value={formData.entryName}
              onChange={(e) => setFormData({ ...formData, entryName: e.target.value })}
              placeholder="e.g., Office Supplies Purchase"
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Add any additional details..."
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="label">Transaction Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['STRAIGHT_EXPENSE', 'INSTALLMENT_EXPENSE', 'GROUP_EXPENSE'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    // Reset payment method to CASH when switching to STRAIGHT_EXPENSE
                    const newPaymentMethod = type === 'STRAIGHT_EXPENSE' ? 'CASH' as PaymentMethod : formData.paymentMethod
                    setFormData({ ...formData, transactionType: type, paymentMethod: newPaymentMethod })
                    setDraftAllocations(null)
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.transactionType === type
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-600 bg-dark-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {type === 'GROUP_EXPENSE' ? (
                      <Users className={`w-5 h-5 ${formData.transactionType === type ? 'text-primary-400' : 'text-dark-400'}`} />
                    ) : type === 'INSTALLMENT_EXPENSE' ? (
                      <Clock className={`w-5 h-5 ${formData.transactionType === type ? 'text-primary-400' : 'text-dark-400'}`} />
                    ) : (
                      <DollarSign className={`w-5 h-5 ${formData.transactionType === type ? 'text-primary-400' : 'text-dark-400'}`} />
                    )}
                    <span className={`font-medium ${formData.transactionType === type ? 'text-dark-100' : 'text-dark-300'}`}>
                      {type.replace('_EXPENSE', '').replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-dark-500 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {getTransactionTypeDescription(formData.transactionType)}
            </p>
          </div>

          <div>
            <label className="label">Date Borrowed</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="date"
                value={formData.dateBorrowed}
                onChange={(e) => setFormData({ ...formData, dateBorrowed: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* People Information */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-100">People</h2>
              <p className="text-sm text-dark-500">Borrower and lender information</p>
            </div>
          </div>

          {formData.transactionType !== 'GROUP_EXPENSE' ? (
            <PersonSelector
              label="Borrower (Person) *"
              value={formData.borrowerPerson?.personId || ''}
              onChange={(person: Person | null) => {
                setFormData({ ...formData, borrowerPerson: person, borrowerGroup: null })
                setDraftAllocations(null)
              }}
              placeholder="Search for borrower or create new"
              required
            />
          ) : (
            <GroupSelector
              label="Borrower (Group) *"
              value={formData.borrowerGroup?.groupId || ''}
              onChange={(group: Group | null) => {
                let updatedFormData = { ...formData, borrowerGroup: group, borrowerPerson: null }
                // If lender is a member of the selected group, clear the lender
                if (group && formData.lenderPerson) {
                  const lenderIsGroupMember = group.members.some(
                    member => member.personId === formData.lenderPerson!.personId
                  )
                  if (lenderIsGroupMember) {
                    updatedFormData.lenderPerson = null
                    setToast({
                      message: 'Lender cannot be a member of the borrower group. Please select a different lender.',
                      type: 'error'
                    })
                  }
                }
                setFormData(updatedFormData)
                setDraftAllocations(null)
              }}
              placeholder="Search for group or create new"
              required
            />
          )}

          <PersonSelector
            label="Lender (Person) *"
            value={formData.lenderPerson?.personId || ''}
            onChange={(person: Person | null) => {
              // If a borrower group is selected, check if the selected person is a member
              if (formData.borrowerGroup && person) {
                const personIsGroupMember = formData.borrowerGroup.members.some(
                  member => member.personId === person.personId
                )
                if (personIsGroupMember) {
                  setToast({
                    message: 'Lender cannot be a member of the borrower group. Please select a different lender.',
                    type: 'error'
                  })
                  return // Don't set the lender
                }
              }
              setFormData({ ...formData, lenderPerson: person })
              setDraftAllocations(null)
            }}
            placeholder="Search for lender or create new"
            required
            excludedPersons={formData.borrowerGroup?.members || []}
          />
        </div>

        {/* Amount Information */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-100">Amount</h2>
              <p className="text-sm text-dark-500">Financial details</p>
            </div>
          </div>

          <div>
            <label className="label">Amount Borrowed *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 font-medium">₱</span>
              <input
                type="text"
                required
                value={formData.amountBorrowed}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.,]/g, '')
                  setFormData({ ...formData, amountBorrowed: raw })
                }}
                onBlur={(e) => {
                  const formatted = formatCurrencyInput(e.target.value)
                  setFormData({ ...formData, amountBorrowed: formatted })
                }}
                placeholder="0.00"
                className="input-field pl-8 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="label">Payment Method *</label>
            {formData.transactionType === 'STRAIGHT_EXPENSE' ? (
              <div className="p-4 rounded-xl border-2 border-primary-500 bg-primary-500/10">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-400" />
                  <span className="font-medium text-dark-100">Cash</span>
                </div>
                <p className="mt-2 text-sm text-dark-500">Straight payments only allow cash as payment method.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['CASH', 'CREDIT_CARD'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: method })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentMethod === method
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600 bg-dark-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-5 h-5 ${formData.paymentMethod === method ? 'text-primary-400' : 'text-dark-400'}`} />
                      <span className={`font-medium ${formData.paymentMethod === method ? 'text-dark-100' : 'text-dark-300'}`}>
                        {method === 'CASH' ? 'Cash' : 'Credit Card'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expense Allocation (Group Expense) */}
        {formData.transactionType === 'GROUP_EXPENSE' && (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-dark-100">Expense Allocation</h2>
                <p className="text-sm text-dark-500">Set payment allocation during entry creation</p>
              </div>
              {draftAllocations && draftAllocations.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAllocationMode('percent')
                    setShowAllocationModal(true)
                  }}
                  className="btn-secondary text-sm"
                  title="Modify existing allocations by percent"
                  disabled={!canUseAllocations}
                >
                  <Edit className="w-4 h-4" />
                  Modify by %
                </button>
              )}
            </div>

            {!canUseAllocations ? (
              <div className="p-4 rounded-xl bg-dark-800/40 text-sm text-dark-400">
                Select a <strong>Borrower Group</strong>, a <strong>Lender</strong>, and enter a valid <strong>Amount</strong> to configure allocations.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('equal')
                      setShowAllocationModal(true)
                    }}
                    className="btn-secondary text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Divide Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('percent')
                      setShowAllocationModal(true)
                    }}
                    className="btn-secondary text-sm"
                  >
                    Divide by %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('amount')
                      setShowAllocationModal(true)
                    }}
                    className="btn-secondary text-sm"
                  >
                    Divide by Amount
                  </button>
                </div>

                {draftAllocations && draftAllocations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table-modern">
                      <thead>
                        <tr>
                          <th>Person</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftAllocations.map((a, idx) => (
                          <tr key={`${a.personId}-${idx}`}>
                            <td className="text-dark-200">{a.personName}</td>
                            <td className="text-dark-300">{a.description}</td>
                            <td className="font-mono font-medium text-dark-100">
                              ₱{a.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-dark-400">
                              {amountValue > 0 ? ((a.amount / amountValue) * 100).toFixed(2) : '0.00'}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-dark-500">
                        Total allocated: <span className={`font-mono font-bold ${allocationIsValid ? 'text-accent-400' : 'text-rose-400'}`}>
                          ₱{allocationTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                      {!allocationIsValid && (
                        <span className="text-rose-300">
                          Must equal ₱{amountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-dark-800/40 text-sm text-dark-400">
                    No allocations set yet. Use the buttons above to create them now.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Installment Options */}
        {formData.transactionType === 'INSTALLMENT_EXPENSE' && (
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-dark-100">Installment Plan</h2>
                <p className="text-sm text-dark-500">Payment schedule configuration</p>
              </div>
            </div>

            <div>
              <label className="label">Start Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="date"
                  required
                  value={formData.installmentStartDate}
                  onChange={(e) => setFormData({ ...formData, installmentStartDate: e.target.value })}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Payment Frequency *</label>
                <select
                  required
                  value={formData.paymentFrequency}
                  onChange={(e) => {
                    const newFrequency = e.target.value
                    // Reset day when frequency changes
                    const defaultDay = newFrequency === 'WEEKLY' ? 'SUNDAY' : '1'
                    setFormData({ ...formData, paymentFrequency: newFrequency, paymentFrequencyDay: defaultDay })
                  }}
                  className="select-field"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
                <p className="text-xs text-dark-500 mt-1">
                  For installment transaction types only. Works in conjunction with Start Date and Installment Status.
                </p>
              </div>
              
              <div>
                <label className="label">
                  {formData.paymentFrequency === 'MONTHLY' ? 'Day of Month *' : 'Day of Week *'}
                </label>
                {formData.paymentFrequency === 'MONTHLY' ? (
                  <select
                    required
                    value={formData.paymentFrequencyDay}
                    onChange={(e) => setFormData({ ...formData, paymentFrequencyDay: e.target.value })}
                    className="select-field"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={formData.paymentFrequencyDay}
                    onChange={(e) => setFormData({ ...formData, paymentFrequencyDay: e.target.value })}
                    className="select-field"
                  >
                    <option value="SUNDAY">Sunday</option>
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                  </select>
                )}
                <p className="text-xs text-dark-500 mt-1">
                  {formData.paymentFrequency === 'MONTHLY' 
                    ? 'Supported values: 1st - 28th of the month'
                    : 'Supported values: Sundays to Saturdays'}
                </p>
              </div>
              
              <div>
                <label className="label">Number of Terms *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., 12"
                  className="input-field"
                />
              </div>
            </div>

            {formData.amountBorrowed && formData.paymentTerms && (
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-sm text-dark-400">Estimated Amount Per Term</p>
                <p className="text-2xl font-display font-bold text-dark-100 mt-1">
                  ₱{(() => {
                    const amount = parseCurrencyToNumber(formData.amountBorrowed)
                    const terms = parseInt(formData.paymentTerms)
                    const perTerm = Math.round((amount / terms) * 100) / 100
                    return perTerm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  })()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-dark-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-100">Notes</h2>
              <p className="text-sm text-dark-500">Additional information (optional)</p>
            </div>
          </div>

          <div>
            <label className="label">General Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about this entry..."
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="label">Payment Notes</label>
            <textarea
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              rows={3}
              placeholder="Notes about payment arrangements..."
              className="input-field resize-none"
            />
          </div>
        </div>

        {/* Proof of Loan (optional) */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-dark-800">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-dark-100">Proof of Loan</h2>
              <p className="text-sm text-dark-500">Upload a document or image as proof (optional)</p>
            </div>
          </div>
          <div>
            <label className="label">Upload File</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.heic,.webp"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30 input-field cursor-pointer"
            />
            {proofFile && (
              <p className="mt-2 text-sm text-dark-400">Selected: {proofFile.name}</p>
            )}
            <p className="mt-2 text-xs text-dark-500">Max 10MB. Accepted: JPG, PNG, PDF, HEIC, WEBP.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/entries')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Entry
              </>
            )}
          </button>
        </div>
      </form>

      {showAllocationModal &&
        allocationMode &&
        formData.borrowerGroup &&
        formData.lenderPerson &&
        amountValue > 0 && (
          <PaymentAllocationDraftModal
            totalAmount={amountValue}
            entryName={formData.entryName || 'Expense'}
            group={formData.borrowerGroup}
            mode={allocationMode}
            existingDraft={draftAllocations || undefined}
            onClose={() => {
              setShowAllocationModal(false)
              setAllocationMode(null)
            }}
            onError={(msg) => setFormError(msg)}
            onSubmit={(_allocations, draft) => {
              setDraftAllocations(draft)
              setShowAllocationModal(false)
              setAllocationMode(null)
            }}
          />
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
