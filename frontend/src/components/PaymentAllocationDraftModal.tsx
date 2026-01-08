import { useEffect, useMemo, useState } from 'react'
import type { Group, Person } from '../types'
import { Loader2, Plus, Save, X } from 'lucide-react'

export type AllocationDraftMode = 'equal' | 'percent' | 'amount'

export interface AllocationDraftItem {
  personId: string
  personName: string
  description: string
  amount: number
  percent?: number
  notes?: string
}

export interface AllocationDraftSubmitItem {
  personId: string
  description: string
  amount: number
  notes?: string
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function nearlyEqual(a: number, b: number, eps = 0.01) {
  return Math.abs(a - b) <= eps
}

export default function PaymentAllocationDraftModal({
  totalAmount,
  entryName,
  group,
  mode,
  existingDraft,
  onClose,
  onSubmit,
  onError,
}: {
  totalAmount: number
  entryName: string
  group: Group
  mode: AllocationDraftMode
  existingDraft?: AllocationDraftItem[]
  onClose: () => void
  onSubmit: (allocations: AllocationDraftSubmitItem[], draft: AllocationDraftItem[]) => void
  onError: (error: string) => void
}) {
  const [allocationItems, setAllocationItems] = useState<AllocationDraftItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Eligible persons: ONLY group members (lender should NOT be included as they are lending, not borrowing)
  const eligiblePersons = useMemo(() => {
    return [...(group?.members || [])]
  }, [group])

  useEffect(() => {
    if (initialized) return

    // If we have an existing draft, prefer it for percent mode edits.
    if (existingDraft && existingDraft.length > 0 && mode === 'percent') {
      setAllocationItems(existingDraft)
      setInitialized(true)
      return
    }

    const allPeople: Person[] = eligiblePersons
    if (allPeople.length === 0) {
      setAllocationItems([])
      setInitialized(true)
      return
    }

    if (mode === 'equal') {
      const baseAmountPerPerson = totalAmount / allPeople.length
      const roundedAmountPerPerson = round2(baseAmountPerPerson)
      
      // Calculate the total of all rounded amounts
      const totalRounded = roundedAmountPerPerson * allPeople.length
      const difference = round2(totalAmount - totalRounded)
      
      // Create allocation items, adjusting the last person's amount to compensate for rounding
      const items = allPeople.map((person, index) => ({
        personId: person.personId,
        personName: person.fullName,
        description: entryName || 'Expense',
        amount: index === allPeople.length - 1 
          ? round2(roundedAmountPerPerson + difference)
          : roundedAmountPerPerson,
        notes: '',
      }))
      
      setAllocationItems(items)
    } else if (mode === 'percent') {
      const percentPerPerson = 100 / allPeople.length
      const baseAmountPerPerson = (totalAmount * percentPerPerson) / 100
      const roundedAmountPerPerson = round2(baseAmountPerPerson)
      
      // Calculate the total of all rounded amounts
      const totalRounded = roundedAmountPerPerson * allPeople.length
      const difference = round2(totalAmount - totalRounded)
      
      // Create allocation items, adjusting the last person's amount to compensate for rounding
      const items = allPeople.map((person, index) => ({
        personId: person.personId,
        personName: person.fullName,
        description: entryName || 'Expense',
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
          description: entryName || 'Expense',
          amount: 0,
          notes: '',
        }))
      )
    }

    setInitialized(true)
  }, [eligiblePersons, entryName, existingDraft, initialized, mode, totalAmount])

  const updateItem = (index: number, updates: Partial<AllocationDraftItem>) => {
    const newItems = [...allocationItems]
    newItems[index] = { ...newItems[index], ...updates }

    // Only update the amount if percent is changed, or vice versa - no auto-balancing
    if (updates.percent !== undefined && mode === 'percent') {
      // Round percent to 2 decimal places for cleaner display
      const roundedPercent = round2(updates.percent)
      newItems[index].percent = roundedPercent
      // Calculate amount from percent
      newItems[index].amount = round2((totalAmount * roundedPercent) / 100)
    }

    if (updates.amount !== undefined && mode === 'amount') {
      // Round amount to 2 decimal places
      newItems[index].amount = round2(updates.amount)
      // Optionally calculate percent for display consistency (but don't store it)
      if (totalAmount > 0) {
        newItems[index].percent = round2((updates.amount / totalAmount) * 100)
      }
    }

    // If amount changed in percent mode, update percent accordingly
    if (updates.amount !== undefined && mode === 'percent') {
      const roundedAmount = round2(updates.amount)
      newItems[index].amount = roundedAmount
      if (totalAmount > 0) {
        newItems[index].percent = round2((roundedAmount / totalAmount) * 100)
      }
    }

    setAllocationItems(newItems)
  }

  const getTotal = () => {
    if (mode === 'percent') {
      return allocationItems.reduce((sum, item) => sum + (item.percent || 0), 0)
    }
    return allocationItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const normalizePercentages = () => {
    if (mode !== 'percent') return
    
    // If no items, nothing to do
    if (allocationItems.length === 0) return
    
    // Find indices of items with input (non-zero) and without input (zero/blank)
    const indicesWithInput: number[] = []
    const indicesWithoutInput: number[] = []
    allocationItems.forEach((item, index) => {
      if ((item.percent || 0) > 0) {
        indicesWithInput.push(index)
      } else {
        indicesWithoutInput.push(index)
      }
    })

    // If no items have input, equal distribute among all
    if (indicesWithInput.length === 0) {
      const percentPerItem = 100 / allocationItems.length
      setAllocationItems(
        allocationItems.map(item => ({
          ...item,
          percent: round2(percentPerItem),
          amount: round2((totalAmount * percentPerItem) / 100),
        }))
      )
      return
    }

    // Calculate current total from items with input
    const totalPercent = indicesWithInput.reduce((sum, i) => sum + (allocationItems[i].percent || 0), 0)
    
    // Calculate remainder to distribute among blank items
    const remainder = 100 - totalPercent
    
    const normalizedItems = [...allocationItems]
    
    if (indicesWithoutInput.length > 0 && remainder > 0) {
      // There are blank items AND there's a positive remainder to distribute
      // Keep items with input at their typed values, distribute remainder among blank items
      let distributedTotal = 0
      
      if (indicesWithoutInput.length === 1) {
        // Single blank item: gets all the remainder
        const newPercent = round2(remainder)
        normalizedItems[indicesWithoutInput[0]] = {
          ...normalizedItems[indicesWithoutInput[0]],
          percent: newPercent,
          amount: round2((totalAmount * newPercent) / 100)
        }
      } else {
        // Multiple blank items: distribute equally, last gets remainder for exact 100%
        const percentPerBlank = round2(remainder / indicesWithoutInput.length)
        
        indicesWithoutInput.slice(0, -1).forEach((index) => {
          distributedTotal += percentPerBlank
          normalizedItems[index] = {
            ...normalizedItems[index],
            percent: percentPerBlank,
            amount: round2((totalAmount * percentPerBlank) / 100)
          }
        })
        
        // Last blank item gets the remainder
        const lastBlankIndex = indicesWithoutInput[indicesWithoutInput.length - 1]
        const lastPercent = round2(remainder - distributedTotal)
        normalizedItems[lastBlankIndex] = {
          ...normalizedItems[lastBlankIndex],
          percent: lastPercent,
          amount: round2((totalAmount * lastPercent) / 100)
        }
      }
    } else if (indicesWithoutInput.length === 0 && !nearlyEqual(totalPercent, 100)) {
      // All items have input but total doesn't match - scale proportionally
      let distributedTotal = 0
      
      if (indicesWithInput.length === 1) {
        // Single item: set to 100%
        normalizedItems[indicesWithInput[0]] = {
          ...normalizedItems[indicesWithInput[0]],
          percent: 100,
          amount: round2(totalAmount)
        }
      } else {
        // Multiple items with input: scale proportionally
        indicesWithInput.slice(0, -1).forEach((index) => {
          const item = allocationItems[index]
          const proportion = (item.percent || 0) / totalPercent
          const normalizedPercent = round2(100 * proportion)
          distributedTotal += normalizedPercent
          normalizedItems[index] = {
            ...item,
            percent: normalizedPercent,
            amount: round2((totalAmount * normalizedPercent) / 100),
          }
        })
        
        // Last item gets the remainder
        const lastInputIndex = indicesWithInput[indicesWithInput.length - 1]
        const lastPercent = round2(100 - distributedTotal)
        normalizedItems[lastInputIndex] = {
          ...normalizedItems[lastInputIndex],
          percent: lastPercent,
          amount: round2((totalAmount * lastPercent) / 100),
        }
      }
    } else if (remainder < 0) {
      // Over 100%: scale down items with input proportionally
      let distributedTotal = 0
      
      indicesWithInput.slice(0, -1).forEach((index) => {
        const item = allocationItems[index]
        const proportion = (item.percent || 0) / totalPercent
        const normalizedPercent = round2(100 * proportion)
        distributedTotal += normalizedPercent
        normalizedItems[index] = {
          ...item,
          percent: normalizedPercent,
          amount: round2((totalAmount * normalizedPercent) / 100),
        }
      })
      
      // Last item with input gets the remainder
      const lastInputIndex = indicesWithInput[indicesWithInput.length - 1]
      const lastPercent = round2(100 - distributedTotal)
      normalizedItems[lastInputIndex] = {
        ...normalizedItems[lastInputIndex],
        percent: Math.max(0, lastPercent),
        amount: round2((totalAmount * Math.max(0, lastPercent)) / 100),
      }
    }
    
    setAllocationItems(normalizedItems)
  }

  const balanceAmounts = () => {
    if (mode !== 'amount') return
    
    // If no items, nothing to do
    if (allocationItems.length === 0) return
    
    // Find indices of items with input (non-zero) and without input (zero/blank)
    const indicesWithInput: number[] = []
    const indicesWithoutInput: number[] = []
    allocationItems.forEach((item, index) => {
      if (item.amount > 0) {
        indicesWithInput.push(index)
      } else {
        indicesWithoutInput.push(index)
      }
    })
    
    // If no items have input, equal distribute among all
    if (indicesWithInput.length === 0) {
      const baseAmountPerItem = totalAmount / allocationItems.length
      const roundedAmountPerItem = round2(baseAmountPerItem)
      
      // Calculate the total of all rounded amounts
      const totalRounded = roundedAmountPerItem * allocationItems.length
      const difference = round2(totalAmount - totalRounded)
      
      // Adjust the last item's amount to compensate for rounding
      const items = allocationItems.map((item, index) => ({
        ...item,
        amount: index === allocationItems.length - 1 
          ? round2(roundedAmountPerItem + difference)
          : roundedAmountPerItem,
      }))
      
      setAllocationItems(items)
      return
    }

    // Calculate current total from items with input
    const currentTotal = indicesWithInput.reduce((sum, i) => sum + allocationItems[i].amount, 0)
    
    // Calculate remainder to distribute among blank items
    const remainder = totalAmount - currentTotal
    
    const normalizedItems = [...allocationItems]
    
    if (indicesWithoutInput.length > 0 && remainder > 0) {
      // There are blank items AND there's a positive remainder to distribute
      // Keep items with input at their typed values, distribute remainder among blank items
      let distributedTotal = 0
      
      if (indicesWithoutInput.length === 1) {
        // Single blank item: gets all the remainder
        normalizedItems[indicesWithoutInput[0]] = {
          ...normalizedItems[indicesWithoutInput[0]],
          amount: round2(remainder)
        }
      } else {
        // Multiple blank items: distribute equally, last gets remainder for exact total
        const amountPerBlank = round2(remainder / indicesWithoutInput.length)
        
        indicesWithoutInput.slice(0, -1).forEach((index) => {
          distributedTotal += amountPerBlank
          normalizedItems[index] = {
            ...normalizedItems[index],
            amount: amountPerBlank
          }
        })
        
        // Last blank item gets the remainder
        const lastBlankIndex = indicesWithoutInput[indicesWithoutInput.length - 1]
        const lastAmount = round2(remainder - distributedTotal)
        normalizedItems[lastBlankIndex] = {
          ...normalizedItems[lastBlankIndex],
          amount: lastAmount
        }
      }
    } else if (indicesWithoutInput.length === 0 && !nearlyEqual(currentTotal, totalAmount)) {
      // All items have input but total doesn't match - scale proportionally
      let distributedTotal = 0
      
      if (indicesWithInput.length === 1) {
        // Single item: set to total
        normalizedItems[indicesWithInput[0]] = {
          ...normalizedItems[indicesWithInput[0]],
          amount: round2(totalAmount)
        }
      } else {
        // Multiple items with input: scale proportionally
        indicesWithInput.slice(0, -1).forEach((index) => {
          const item = allocationItems[index]
          const proportion = item.amount / currentTotal
          const normalizedAmount = round2(totalAmount * proportion)
          distributedTotal += normalizedAmount
          normalizedItems[index] = {
            ...item,
            amount: normalizedAmount
          }
        })
        
        // Last item gets the remainder
        const lastInputIndex = indicesWithInput[indicesWithInput.length - 1]
        const lastAmount = round2(totalAmount - distributedTotal)
        normalizedItems[lastInputIndex] = {
          ...normalizedItems[lastInputIndex],
          amount: lastAmount
        }
      }
    } else if (remainder < 0) {
      // Overspent: scale down items with input proportionally
      let distributedTotal = 0
      
      indicesWithInput.slice(0, -1).forEach((index) => {
        const item = allocationItems[index]
        const proportion = item.amount / currentTotal
        const normalizedAmount = round2(totalAmount * proportion)
        distributedTotal += normalizedAmount
        normalizedItems[index] = {
          ...item,
          amount: normalizedAmount
        }
      })
      
      // Last item with input gets the remainder
      const lastInputIndex = indicesWithInput[indicesWithInput.length - 1]
      const lastAmount = round2(totalAmount - distributedTotal)
      normalizedItems[lastInputIndex] = {
        ...normalizedItems[lastInputIndex],
        amount: Math.max(0, lastAmount)
      }
    }
    
    setAllocationItems(normalizedItems)
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

  const handleSubmit = () => {
    if (submitting) return

    if (allocationItems.length === 0) {
      onError('No allocation items to save.')
      return
    }

    if (mode === 'percent') {
      const totalPercent = allocationItems.reduce((sum, item) => sum + (item.percent || 0), 0)
      if (!nearlyEqual(totalPercent, 100)) {
        onError(`Total percentage must equal 100%. Current: ${totalPercent.toFixed(2)}%`)
        return
      }
    } else if (mode === 'amount') {
      const total = allocationItems.reduce((sum, item) => sum + item.amount, 0)
      if (!nearlyEqual(total, totalAmount)) {
        onError(`Total amount must equal ₱${totalAmount.toLocaleString()}. Current: ₱${total.toLocaleString()}`)
        return
      }
    }

    if (allocationItems.some(item => !item.description.trim())) {
      onError('All items must have a description')
      return
    }

    // Normalize personName in case personId changed.
    const normalizedDraft: AllocationDraftItem[] = allocationItems.map(item => {
      const person = eligiblePersons.find(p => p.personId === item.personId)
      return {
        ...item,
        personName: person?.fullName || item.personName,
        description: item.description,
        amount: round2(item.amount),
        percent: item.percent,
        notes: item.notes,
      }
    })

    const submitAllocations: AllocationDraftSubmitItem[] = normalizedDraft.map(item => ({
      personId: item.personId,
      description: item.description.trim(),
      amount: round2(item.amount),
      notes: item.notes?.trim() || undefined,
    }))

    setSubmitting(true)
    try {
      onSubmit(submitAllocations, normalizedDraft)
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'equal' ? 'Divide Equally' : mode === 'percent' ? 'Divide by Percent' : 'Divide by Amount'

  const totalDisplay =
    mode === 'percent' ? `${getTotal().toFixed(2)}%` : `₱${getTotal().toLocaleString()}`

  const totalOk =
    mode === 'percent'
      ? nearlyEqual(getTotal(), 100)
      : mode === 'amount'
        ? nearlyEqual(getTotal(), totalAmount)
        : true

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="glass-card p-6 max-w-4xl w-full my-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-dark-50">{title}</h2>
              <p className="mt-1 text-dark-400">Allocate expense among group members and lender</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <div className="p-4 bg-dark-800/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-400">Total Expense:</span>
                <span className="font-mono font-bold text-dark-100">₱{totalAmount.toLocaleString()}</span>
              </div>
              {(mode === 'percent' || mode === 'amount') && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">{mode === 'percent' ? 'Total Percentage:' : 'Total Allocated:'}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold ${totalOk ? 'text-accent-400' : 'text-rose-400'}`}
                      >
                        {totalDisplay}
                      </span>
                      <div className="flex items-center gap-2">
                        {totalOk && (
                          <span className="text-xs text-accent-400">✓ Valid</span>
                        )}
                        {mode === 'percent' ? (
                          <button
                            onClick={normalizePercentages}
                            className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded hover:bg-primary-500/30 transition-colors"
                          >
                            Balance to 100%
                          </button>
                        ) : mode === 'amount' ? (
                          <button
                            onClick={balanceAmounts}
                            className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded hover:bg-primary-500/30 transition-colors"
                          >
                            Balance to Total
                          </button>
                        ) : null}
                      </div>
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
            <button onClick={addItem} className="btn-secondary text-sm" disabled={submitting}>
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="btn-secondary" disabled={submitting}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Allocations
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


