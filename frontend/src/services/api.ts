import axios from 'axios'
import type { 
  Person, 
  Group, 
  Entry, 
  Payment, 
  PaymentAllocation,
  CreateEntryRequest,
  CreatePaymentRequest 
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include selected user in headers
api.interceptors.request.use((config) => {
  const selectedUserId = localStorage.getItem('selectedUserId')
  const selectedUserName = localStorage.getItem('selectedUserName')
  
  if (selectedUserId && selectedUserName) {
    config.headers['X-Selected-User-Id'] = selectedUserId
    config.headers['X-Selected-User-Name'] = selectedUserName
  } else {
    // Default to "tung tung tung sahur"
    config.headers['X-Selected-User-Name'] = 'tung tung tung sahur'
  }
  
  return config
})

// Person API
export const personApi = {
  getAll: () => api.get<Person[]>('/persons'),
  getById: (id: string) => api.get<Person>(`/persons/${id}`),
  search: (name: string) => api.get<Person[]>(`/persons/search?name=${name}`),
  create: (person: Omit<Person, 'personId'>) => api.post<Person>('/persons', person),
  update: (id: string, person: Omit<Person, 'personId'>) => api.put<Person>(`/persons/${id}`, person),
  delete: (id: string) => api.delete(`/persons/${id}`),
}

// Group API
export const groupApi = {
  getAll: () => api.get<Group[]>('/groups'),
  getById: (id: string) => api.get<Group>(`/groups/${id}`),
  create: (group: Omit<Group, 'groupId'>) => api.post<Group>('/groups', group),
  update: (id: string, group: Omit<Group, 'groupId'>) => api.put<Group>(`/groups/${id}`, group),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addMember: (groupId: string, personId: string) => api.post(`/groups/${groupId}/members/${personId}`),
  removeMember: (groupId: string, personId: string) => api.delete(`/groups/${groupId}/members/${personId}`),
}

// Entry API
export const entryApi = {
  getAll: () => api.get<Entry[]>('/entries'),
  getById: (id: string) => api.get<Entry>(`/entries/${id}`),
  create: (entry: CreateEntryRequest) => api.post<Entry>('/entries', entry),
  createWithProof: (entry: CreateEntryRequest, file: File) => {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(entry)], { type: 'application/json' }))
    formData.append('proof', file)
    return api.post<Entry>('/entries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  update: (id: string, entry: CreateEntryRequest) => api.put<Entry>(`/entries/${id}`, entry),
  delete: (id: string) => api.delete(`/entries/${id}`),
  complete: (id: string) => api.post<Entry>(`/entries/${id}/complete`),
  autoComplete: () => api.post<{ completedCount: number; message: string }>('/entries/auto-complete'),
}

// Payment API
export const paymentApi = {
  getAll: () => api.get<Payment[]>('/payments'),
  getById: (id: string) => api.get<Payment>(`/payments/${id}`),
  getByEntry: (entryId: string) => api.get<Payment[]>(`/payments/entry/${entryId}`),
  create: (payment: CreatePaymentRequest) => api.post<Payment>('/payments', payment),
  createWithProof: (payment: CreatePaymentRequest, file: File) => {
    const formData = new FormData()
    formData.append('request', new Blob([JSON.stringify(payment)], { type: 'application/json' }))
    formData.append('proof', file)
    return api.post<Payment>('/payments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  update: (id: string, payment: CreatePaymentRequest) => api.put<Payment>(`/payments/${id}`, payment),
  delete: (id: string) => api.delete(`/payments/${id}`),
}

// Payment Allocation API
export const paymentAllocationApi = {
  getAll: () => api.get<PaymentAllocation[]>('/payment-allocations'),
  getByEntry: (entryId: string) => api.get<PaymentAllocation[]>(`/payment-allocations/entry/${entryId}`),
  getById: (id: string) => api.get<PaymentAllocation>(`/payment-allocations/${id}`),
  create: (entryId: string, allocations: any[]) => 
    api.post<PaymentAllocation[]>('/payment-allocations', { entryId, allocations }),
  update: (id: string, allocation: Partial<PaymentAllocation>) => 
    api.put<PaymentAllocation>(`/payment-allocations/${id}`, allocation),
  delete: (id: string) => api.delete(`/payment-allocations/${id}`),
}

// Installment API
export const installmentApi = {
  skipTerm: (termId: string) => api.post(`/installments/terms/${termId}/skip`),
  getSkipPenalty: (termId: string) => api.get<{ penalty: number }>(`/installments/terms/${termId}/skip-penalty`),
  updateTermStatus: (termId: string, status: string) => 
    api.put(`/installments/terms/${termId}/status?status=${status}`),
  updateDelinquent: () => api.post('/installments/update-delinquent'),
}

export default api






