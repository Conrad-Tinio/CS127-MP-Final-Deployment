import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { personApi } from '../services/api'
import type { Person } from '../types'
import { User, Plus, Search, X, Loader2 } from 'lucide-react'

interface PersonSelectorProps {
  value: string // personId or name
  onChange: (person: Person | null) => void
  placeholder?: string
  required?: boolean
  label?: string
  disabled?: boolean
  allowedPersons?: Person[] // Optional: restrict to specific persons only
  excludedPersons?: Person[] // Optional: exclude specific persons from selection
}

export default function PersonSelector({
  value,
  onChange,
  placeholder = "Search for a person or create new",
  required = false,
  label,
  disabled = false,
  allowedPersons,
  excludedPersons
}: PersonSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [allPersons, setAllPersons] = useState<Person[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load all persons on mount
  useEffect(() => {
    const loadAllPersons = async () => {
      setIsLoadingAll(true)
      try {
        const response = await personApi.getAll()
        setAllPersons(response.data)
      } catch (error) {
        console.error('Error loading all persons:', error)
      } finally {
        setIsLoadingAll(false)
      }
    }
    loadAllPersons()
  }, [])

  // Clear selection if current person is in excludedPersons
  useEffect(() => {
    if (selectedPerson && excludedPersons && excludedPersons.length > 0) {
      const isExcluded = excludedPersons.some(excluded => excluded.personId === selectedPerson.personId)
      if (isExcluded) {
        setSelectedPerson(null)
        onChange(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludedPersons])

  // Load selected person if value is a personId
  useEffect(() => {
    const loadPerson = async () => {
      if (value && !selectedPerson) {
        // If value looks like a UUID (personId), fetch the person
        if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          try {
            const response = await personApi.getById(value)
            setSelectedPerson(response.data)
          } catch (error) {
            // If person not found, treat value as a name
            console.error('Error loading person:', error)
          }
        }
      }
    }
    loadPerson()
  }, [value, selectedPerson])

  // Search for persons when search term changes
  useEffect(() => {
    const searchPersons = async () => {
      if (searchTerm.trim().length > 0) {
        setIsSearching(true)
        try {
          const response = await personApi.search(searchTerm.trim())
          setSearchResults(response.data)
          setShowDropdown(true)
        } catch (error) {
          console.error('Error searching persons:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        // When search term is empty, show all persons
        setSearchResults([])
        // Don't hide dropdown if it's already shown (user clicked to see options)
      }
    }

    const debounceTimer = setTimeout(searchPersons, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  // Update dropdown position when shown
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current && showDropdown) {
        const rect = inputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 8, // 8px gap
          left: rect.left,
          width: rect.width
        })
      }
    }

    if (showDropdown) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        wrapperRef.current && 
        !wrapperRef.current.contains(target) &&
        !(target as Element).closest?.('.person-selector-dropdown')
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person)
    setSearchTerm('')
    setShowDropdown(false)
    onChange(person)
  }

  const handleCreateNewPerson = async () => {
    if (!searchTerm.trim()) return

    setIsCreating(true)
    try {
      const newPerson = await personApi.create({ fullName: searchTerm.trim() })
      setSelectedPerson(newPerson.data)
      setSearchTerm('')
      setShowDropdown(false)
      // Add to allPersons list
      setAllPersons([...allPersons, newPerson.data])
      onChange(newPerson.data)
    } catch (error) {
      console.error('Error creating person:', error)
      alert('Error creating person. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedPerson(null)
    setSearchTerm('')
    setShowDropdown(false)
    onChange(null)
  }

  const handleInputFocus = () => {
    // Update position when focusing
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      })
    }
    setShowDropdown(true)
  }

  // Determine which persons to show - filter by allowedPersons and excludedPersons if provided
  const getFilteredPersons = (persons: Person[]) => {
    let filtered = persons
    
    // First, filter by allowedPersons if provided
    if (allowedPersons && allowedPersons.length > 0) {
      filtered = filtered.filter(p => allowedPersons.some(allowed => allowed.personId === p.personId))
    }
    
    // Then, exclude excludedPersons if provided
    if (excludedPersons && excludedPersons.length > 0) {
      filtered = filtered.filter(p => !excludedPersons.some(excluded => excluded.personId === p.personId))
    }
    
    return filtered
  }

  const personsToShow = searchTerm.trim() 
    ? getFilteredPersons(searchResults)
    : getFilteredPersons(allPersons)

  // Check if search term matches any existing person (within allowed persons)
  const exactMatch = getFilteredPersons(searchResults).find(
    p => p.fullName.toLowerCase() === searchTerm.trim().toLowerCase()
  )
  // Only allow creating new if no allowedPersons restriction (or if creating is explicitly needed)
  const canCreateNew = searchTerm.trim() && !exactMatch && !isCreating && !allowedPersons

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="label">{label}</label>}
      
      {selectedPerson ? (
        // Show selected person
        <div className="relative">
          <div className="input-field pl-10 pr-10 flex items-center gap-2">
            <User className="w-5 h-5 text-dark-500 flex-shrink-0" />
            <span className="text-dark-100 flex-1">{selectedPerson.fullName}</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-dark-400" />
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-dark-500">Selected person</p>
        </div>
      ) : (
        // Show search input
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              ref={inputRef}
              type="text"
              required={required}
              disabled={disabled}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className="input-field pl-10"
            />
            {(isSearching || isLoadingAll) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 animate-spin" />
            )}
          </div>

          {/* Dropdown with search results and create option - rendered via portal */}
          {showDropdown && createPortal(
            <div 
              className="person-selector-dropdown fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 9999
              }}
            >
              {isLoadingAll && !searchTerm.trim() ? (
                <div className="p-4 text-center text-dark-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading persons...</p>
                </div>
              ) : isSearching ? (
                <div className="p-4 text-center text-dark-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : personsToShow.length > 0 || canCreateNew ? (
                <div className="max-h-64 overflow-y-auto">
                  {/* Existing persons */}
                  {personsToShow.map((person) => (
                    <button
                      key={person.personId}
                      type="button"
                      onClick={() => handleSelectPerson(person)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-800 transition-colors border-b border-dark-800 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-400" />
                      </div>
                      <span className="text-dark-100 text-left flex-1">{person.fullName}</span>
                      <span className="text-xs text-dark-500">Click to select</span>
                    </button>
                  ))}
                  
                  {/* Create new person option */}
                  {canCreateNew && (
                    <button
                      type="button"
                      onClick={handleCreateNewPerson}
                      disabled={isCreating}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary-500/10 transition-colors border-t border-dark-800 bg-primary-500/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-primary-400" />
                      </div>
                      <span className="text-primary-400 font-medium flex-1 text-left">
                        Create "{searchTerm.trim()}"
                      </span>
                      {isCreating && (
                        <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-dark-500">
                  <p className="text-sm">No persons found</p>
                  {searchTerm.trim() && (
                    <p className="text-xs mt-1">Type to search or create a new person</p>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}
          
          <p className="mt-2 text-sm text-dark-500">
            Search for an existing person or create a new one
          </p>
        </div>
      )}
    </div>
  )
}

