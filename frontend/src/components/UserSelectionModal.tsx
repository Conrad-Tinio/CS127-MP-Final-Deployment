import { useEffect, useState } from 'react'
import { personApi } from '../services/api'
import type { Person } from '../types'
import { useUser } from '../contexts/UserContext'
import { X, User, Loader2 } from 'lucide-react'

interface UserSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserSelectionModal({ isOpen, onClose }: UserSelectionModalProps) {
  const { selectedUser, setSelectedUser } = useUser()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadPeople()
    }
  }, [isOpen])

  const loadPeople = async () => {
    try {
      const response = await personApi.getAll()
      setPeople(response.data)
    } catch (error) {
      console.error('Error loading people:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = (person: Person) => {
    setSelectedUser(person)
    onClose()
    // Reload the page to refresh all data with new user
    window.location.reload()
  }

  const filteredPeople = people.filter(person =>
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md border border-dark-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-dark-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-dark-100">Change User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-dark-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          </div>
        </div>

        {/* People List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="p-8 text-center text-dark-400">
              {searchTerm ? 'No people found' : 'No people available'}
            </div>
          ) : (
            <div className="p-2">
              {filteredPeople.map((person) => (
                <button
                  key={person.personId}
                  onClick={() => handleSelectUser(person)}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    selectedUser?.personId === person.personId
                      ? 'bg-primary-500/10 border border-primary-500/30'
                      : 'hover:bg-dark-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-sm font-bold text-dark-950">
                      {person.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-200 truncate">
                        {person.fullName}
                      </p>
                    </div>
                    {selectedUser?.personId === person.personId && (
                      <div className="w-2 h-2 rounded-full bg-primary-400"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
