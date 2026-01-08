export enum TransactionType {
  STRAIGHT_EXPENSE = 'STRAIGHT_EXPENSE',
  INSTALLMENT_EXPENSE = 'INSTALLMENT_EXPENSE',
  GROUP_EXPENSE = 'GROUP_EXPENSE',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum InstallmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  SKIPPED = 'SKIPPED',
  DELINQUENT = 'DELINQUENT',
}

export enum PaymentAllocationStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum PaymentFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
}

export interface Person {
  personId: string
  fullName: string
}

export interface Group {
  groupId: string
  groupName: string
  members: Person[]
}

export interface Entry {
  entryId: string
  entryName: string
  description?: string
  transactionType: TransactionType
  dateBorrowed?: string
  dateFullyPaid?: string
  borrowerPersonId?: string
  borrowerPersonName?: string
  borrowerGroupId?: string
  borrowerGroupName?: string
  lenderPersonId: string
  lenderPersonName: string
  amountBorrowed: number
  amountRemaining: number
  status: PaymentStatus
  paymentMethod?: PaymentMethod
  notes?: string
  paymentNotes?: string
  referenceId: string
  payments?: Payment[]
  installmentPlan?: InstallmentPlan
  paymentAllocations?: PaymentAllocation[]
  userRole?: 'LENDER' | 'BORROWER' // Current user's role for this entry
}

export interface Payment {
  paymentId: string
  paymentDate: string
  paymentAmount: number
  changeAmount?: number
  payeePersonId: string
  payeePersonName: string
  notes?: string
  entryId?: string
  entryName?: string
  entryReferenceId?: string
  proofUrl?: string
  hasProof?: boolean // Indicates if payment has proof/attachment
}

export interface PaymentAllocation {
  allocationId: string
  entryId: string
  personId: string
  personName: string
  paymentAllocationStatus: PaymentAllocationStatus // Computed, not stored in DB
  description: string // Required
  amount: number
  percentageOfTotal?: number // Computed, not stored in DB
  notes?: string
}

export interface InstallmentPlan {
  installmentId: string
  entryId: string
  startDate: string
  paymentFrequency: PaymentFrequency
  paymentFrequencyDay?: string // Day of month (1-28) for MONTHLY, or day of week (SUNDAY-SATURDAY) for WEEKLY
  paymentTerms: number
  amountPerTerm: number
  notes?: string
  installmentTerms?: InstallmentTerm[]
}

export interface InstallmentTerm {
  termId: string
  installmentId: string
  termNumber: number
  dueDate: string
  termStatus: InstallmentStatus
  penaltyApplied?: number
}

export interface CreateEntryRequest {
  entryName: string
  description?: string
  transactionType: TransactionType
  dateBorrowed?: string
  borrowerPersonId?: string
  borrowerGroupId?: string
  lenderPersonId: string
  amountBorrowed: number
  notes?: string
  paymentNotes?: string
  paymentMethod?: PaymentMethod
  installmentStartDate?: string
  paymentFrequency?: string
  paymentFrequencyDay?: string // Day of month (1-28) for MONTHLY, or day of week (SUNDAY-SATURDAY) for WEEKLY
  paymentTerms?: number
  amountPerTerm?: number
}

export interface CreatePaymentRequest {
  entryId: string
  paymentDate?: string
  paymentAmount: number
  payeePersonId: string
  notes?: string
  allocationId?: string // Optional: for group expenses, link payment to specific allocation
}

