import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Person } from '../types'

interface UserContextType {
  selectedUser: Person | null
  setSelectedUser: (user: Person | null) => void
  loading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const STORAGE_KEY = 'selectedUserId'
const DEFAULT_USER_NAME = 'tung tung tung sahur'

export function UserProvider({ children }: { children: ReactNode }) {
  const [selectedUser, setSelectedUserState] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load selected user from localStorage on mount
    const storedUserId = localStorage.getItem(STORAGE_KEY)
    const storedUserName = localStorage.getItem('selectedUserName')
    
    if (storedUserId && storedUserName) {
      setSelectedUserState({
        personId: storedUserId,
        fullName: storedUserName
      })
    } else {
      // Default to "tung tung tung sahur"
      setSelectedUserState({
        personId: '',
        fullName: DEFAULT_USER_NAME
      })
      // Store default in localStorage
      localStorage.setItem('selectedUserName', DEFAULT_USER_NAME)
    }
    setLoading(false)
  }, [])

  const setSelectedUser = (user: Person | null) => {
    setSelectedUserState(user)
    if (user) {
      localStorage.setItem(STORAGE_KEY, user.personId)
      localStorage.setItem('selectedUserName', user.fullName)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('selectedUserName')
    }
  }

  return (
    <UserContext.Provider value={{ selectedUser, setSelectedUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
