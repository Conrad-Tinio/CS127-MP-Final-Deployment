import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { groupApi } from '../services/api'
import type { Group } from '../types'
import { Users, Plus, Search, X, Loader2 } from 'lucide-react'

interface GroupSelectorProps {
  value: string // groupId or name
  onChange: (group: Group | null) => void
  placeholder?: string
  required?: boolean
  label?: string
  disabled?: boolean
}

export default function GroupSelector({
  value,
  onChange,
  placeholder = "Search for a group or create new",
  required = false,
  label,
  disabled = false
}: GroupSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load all groups on mount
  useEffect(() => {
    const loadAllGroups = async () => {
      setIsLoadingAll(true)
      try {
        const response = await groupApi.getAll()
        setAllGroups(response.data)
      } catch (error) {
        console.error('Error loading all groups:', error)
      } finally {
        setIsLoadingAll(false)
      }
    }
    loadAllGroups()
  }, [])

  // Load selected group if value is a groupId
  useEffect(() => {
    const loadGroup = async () => {
      if (value && !selectedGroup) {
        // If value looks like a UUID (groupId), fetch the group
        if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          try {
            const response = await groupApi.getById(value)
            setSelectedGroup(response.data)
          } catch (error) {
            // If group not found, treat value as a name
            console.error('Error loading group:', error)
          }
        }
      }
    }
    loadGroup()
  }, [value, selectedGroup])

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
        !(target as Element).closest?.('.group-selector-dropdown')
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group)
    setSearchTerm('')
    setShowDropdown(false)
    onChange(group)
  }

  const handleCreateNewGroup = async () => {
    if (!searchTerm.trim()) return

    setIsCreating(true)
    try {
      const newGroup = await groupApi.create({ groupName: searchTerm.trim(), members: [] })
      setSelectedGroup(newGroup.data)
      setSearchTerm('')
      setShowDropdown(false)
      // Add to allGroups list
      setAllGroups([...allGroups, newGroup.data])
      onChange(newGroup.data)
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error creating group. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedGroup(null)
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

  // Filter groups based on search term (client-side filtering)
  const filteredGroups = searchTerm.trim()
    ? allGroups.filter(group =>
        group.groupName.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : allGroups

  // Check if search term matches any existing group
  const exactMatch = allGroups.find(
    g => g.groupName.toLowerCase() === searchTerm.trim().toLowerCase()
  )
  const canCreateNew = searchTerm.trim() && !exactMatch && !isCreating

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="label">{label}</label>}
      
      {selectedGroup ? (
        // Show selected group
        <div className="relative">
          <div className="input-field pl-10 pr-10 flex items-center gap-2">
            <Users className="w-5 h-5 text-dark-500 flex-shrink-0" />
            <span className="text-dark-100 flex-1">{selectedGroup.groupName}</span>
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
          <p className="mt-2 text-sm text-dark-500">Selected group</p>
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
            {isLoadingAll && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 animate-spin" />
            )}
          </div>

          {/* Dropdown with search results and create option - rendered via portal */}
          {showDropdown && createPortal(
            <div 
              className="group-selector-dropdown fixed bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden"
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
                  <p className="text-sm">Loading groups...</p>
                </div>
              ) : filteredGroups.length > 0 || canCreateNew ? (
                <div className="max-h-64 overflow-y-auto">
                  {/* Existing groups */}
                  {filteredGroups.map((group) => (
                    <button
                      key={group.groupId}
                      type="button"
                      onClick={() => handleSelectGroup(group)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-800 transition-colors border-b border-dark-800 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-accent-400" />
                      </div>
                      <span className="text-dark-100 text-left flex-1">{group.groupName}</span>
                      <span className="text-xs text-dark-500">Click to select</span>
                    </button>
                  ))}
                  
                  {/* Create new group option */}
                  {canCreateNew && (
                    <button
                      type="button"
                      onClick={handleCreateNewGroup}
                      disabled={isCreating}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent-500/10 transition-colors border-t border-dark-800 bg-accent-500/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 text-accent-400" />
                      </div>
                      <span className="text-accent-400 font-medium flex-1 text-left">
                        Create "{searchTerm.trim()}"
                      </span>
                      {isCreating && (
                        <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-dark-500">
                  <p className="text-sm">No groups found</p>
                  {searchTerm.trim() && (
                    <p className="text-xs mt-1">Type to search or create a new group</p>
                  )}
                </div>
              )}
            </div>,
            document.body
          )}
          
          <p className="mt-2 text-sm text-dark-500">
            Search for an existing group or create a new one
          </p>
        </div>
      )}
    </div>
  )
}

