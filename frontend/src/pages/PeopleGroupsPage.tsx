import { useEffect, useState } from 'react'
import { personApi, groupApi } from '../services/api'
import type { Person, Group } from '../types'
import Toast, { type ToastType } from '../components/Toast'
import { 
  User, 
  Users, 
  Plus, 
  Search,
  UserPlus,
  Loader2,
  X,
  Check,
  Edit,
  Trash2
} from 'lucide-react'

export default function PeopleGroupsPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'people' | 'groups'>('people')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreatePerson, setShowCreatePerson] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembersForNewGroup, setSelectedMembersForNewGroup] = useState<string[]>([])
  const [showAddMembersModal, setShowAddMembersModal] = useState<string | null>(null)
  const [showAddToGroupModal, setShowAddToGroupModal] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editPersonName, setEditPersonName] = useState('')
  const [editGroupName, setEditGroupName] = useState('')
  const [updatingPerson, setUpdatingPerson] = useState(false)
  const [updatingGroup, setUpdatingGroup] = useState(false)
  const [removingMember, setRemovingMember] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [deletingPerson, setDeletingPerson] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    show: boolean
    type: 'person' | 'group'
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [personsRes, groupsRes] = await Promise.all([
        personApi.getAll(),
        groupApi.getAll()
      ])
      setPersons(personsRes.data)
      setGroups(groupsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setToast({ message: 'Please enter a group name', type: 'error' })
      return
    }

    setCreatingGroup(true)
    try {
      // Create group with selected members
      const membersToAdd = selectedMembersForNewGroup.map(personId => 
        persons.find(p => p.personId === personId)!
      )
      await groupApi.create({ 
        groupName: newGroupName.trim(), 
        members: membersToAdd 
      })
      
      setNewGroupName('')
      setSelectedMembersForNewGroup([])
      setShowCreateGroup(false)
      setToast({ message: 'Group created successfully', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Error creating group:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating group. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) {
      setToast({ message: 'Please enter a person name', type: 'error' })
      return
    }

    setCreatingPerson(true)
    try {
      await personApi.create({ fullName: newPersonName.trim() })
      setNewPersonName('')
      setShowCreatePerson(false)
      setToast({ message: 'Person created successfully', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Error creating person:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating person. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setCreatingPerson(false)
    }
  }

  const filteredPersons = persons.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGroups = groups.filter(g => 
    g.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddMemberToGroup = async (groupId: string, personId: string) => {
    setAddingMember(true)
    try {
      await groupApi.addMember(groupId, personId)
      // Reload the group if we're editing it
      if (editingGroup && editingGroup.groupId === groupId) {
        const updatedGroup = await groupApi.getById(groupId)
        setEditingGroup(updatedGroup.data)
      }
      loadData()
      setShowAddMembersModal(null)
      setToast({ message: 'Member added successfully', type: 'success' })
    } catch (error: any) {
      console.error('Error adding member:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error adding member. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setAddingMember(false)
    }
  }

  const handleAddPersonToGroup = async (personId: string, groupId: string) => {
    setAddingMember(true)
    try {
      await groupApi.addMember(groupId, personId)
      loadData()
      setShowAddToGroupModal(null)
      setToast({ message: 'Person added to group successfully', type: 'success' })
    } catch (error: any) {
      console.error('Error adding person to group:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error adding person to group. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setAddingMember(false)
    }
  }

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person)
    setEditPersonName(person.fullName)
  }

  const handleUpdatePerson = async () => {
    if (!editingPerson || !editPersonName.trim()) {
      setToast({ message: 'Please enter a person name', type: 'error' })
      return
    }

    setUpdatingPerson(true)
    try {
      await personApi.update(editingPerson.personId, { fullName: editPersonName.trim() })
      setEditingPerson(null)
      setEditPersonName('')
      setToast({ message: 'Person updated successfully', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Error updating person:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating person. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setUpdatingPerson(false)
    }
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group)
    setEditGroupName(group.groupName)
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editGroupName.trim()) {
      setToast({ message: 'Please enter a group name', type: 'error' })
      return
    }

    setUpdatingGroup(true)
    try {
      await groupApi.update(editingGroup.groupId, { 
        groupName: editGroupName.trim(),
        members: editingGroup.members 
      })
      setEditingGroup(null)
      setEditGroupName('')
      setToast({ message: 'Group updated successfully', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Error updating group:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating group. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setUpdatingGroup(false)
    }
  }

  const handleDeletePerson = async (personId: string) => {
    const person = persons.find(p => p.personId === personId)
    if (!person) return
    
    setConfirmDelete({
      show: true,
      type: 'person',
      id: personId,
      name: person.fullName
    })
  }

  const confirmDeletePerson = async () => {
    if (!confirmDelete || confirmDelete.type !== 'person') return
    
    setDeletingPerson(true)
    try {
      await personApi.delete(confirmDelete.id)
      setToast({ message: 'Person deleted successfully', type: 'success' })
      setConfirmDelete(null)
      loadData()
    } catch (error: any) {
      console.error('Error deleting person:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting person. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setDeletingPerson(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.groupId === groupId)
    if (!group) return
    
    setConfirmDelete({
      show: true,
      type: 'group',
      id: groupId,
      name: group.groupName
    })
  }

  const confirmDeleteGroup = async () => {
    if (!confirmDelete || confirmDelete.type !== 'group') return
    
    setDeletingGroup(true)
    try {
      await groupApi.delete(confirmDelete.id)
      setToast({ message: 'Group deleted successfully', type: 'success' })
      setConfirmDelete(null)
      loadData()
    } catch (error: any) {
      console.error('Error deleting group:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting group. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setDeletingGroup(false)
    }
  }

  const handleRemoveMemberFromGroup = async (groupId: string, personId: string) => {
    setRemovingMember(true)
    try {
      await groupApi.removeMember(groupId, personId)
      // Reload the group if we're editing it
      if (editingGroup && editingGroup.groupId === groupId) {
        const updatedGroup = await groupApi.getById(groupId)
        setEditingGroup(updatedGroup.data)
      }
      setToast({ message: 'Member removed successfully', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Error removing member:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error removing member. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setRemovingMember(false)
    }
  }

  const toggleMemberSelection = (personId: string) => {
    setSelectedMembersForNewGroup(prev => 
      prev.includes(personId) 
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-dark-400">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-50">People & Groups</h1>
          <p className="mt-1 text-dark-400">Manage your contacts and groups.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card p-2 inline-flex gap-2">
        <button
          onClick={() => setActiveTab('people')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'people'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
          }`}
        >
          <User className="w-5 h-5" />
          People ({persons.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'groups'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
          }`}
        >
          <Users className="w-5 h-5" />
          Groups ({groups.length})
        </button>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        {activeTab === 'people' ? (
          <button
            onClick={() => setShowCreatePerson(true)}
            className="btn-primary"
          >
            <UserPlus className="w-5 h-5" />
            Add Person
          </button>
        ) : (
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        )}
      </div>

      {/* Create Person Modal */}
      {showCreatePerson && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-dark-100">Add New Person</h3>
            <button
              onClick={() => setShowCreatePerson(false)}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter person's full name"
                className="input-field pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleCreatePerson()}
                autoFocus
              />
            </div>
            <button
              onClick={handleCreatePerson}
              disabled={creatingPerson || !newPersonName.trim()}
              className="btn-primary"
            >
              {creatingPerson ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Add'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-dark-100">Create New Group</h3>
            <button
              onClick={() => {
                setShowCreateGroup(false)
                setSelectedMembersForNewGroup([])
              }}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="input-field pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className="btn-primary"
              >
                {creatingGroup ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
            
            {/* Add Members Section */}
            <div className="border-t border-dark-800 pt-4">
              <p className="text-sm font-medium text-dark-300 mb-3">Add Members (Optional)</p>
              {persons.length === 0 ? (
                <p className="text-sm text-dark-500 italic">No people available. Create a person first.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {persons.map((person) => {
                    const isSelected = selectedMembersForNewGroup.includes(person.personId)
                    return (
                      <button
                        key={person.personId}
                        onClick={() => toggleMemberSelection(person.personId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-primary-500/20 border border-primary-500/30'
                            : 'bg-dark-800/50 border border-transparent hover:bg-dark-800'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xs font-bold text-dark-950">
                          {person.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left text-sm text-dark-200">{person.fullName}</span>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'people' ? (
        <div className="space-y-3">
          {filteredPersons.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <User className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400 mb-4">
                {persons.length === 0 
                  ? "No people added yet. Add someone to get started!" 
                  : "No people match your search."}
              </p>
              {persons.length === 0 && (
                <button onClick={() => setShowCreatePerson(true)} className="btn-primary">
                  <UserPlus className="w-5 h-5" />
                  Add Your First Person
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPersons.map((person, index) => (
                <div 
                  key={person.personId} 
                  className="glass-card p-4 flex items-center gap-4 hover:border-dark-600 transition-all stagger-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold text-white">
                    {person.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-100 truncate">{person.fullName}</p>
                    <p className="text-sm text-dark-500">Contact</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditPerson(person)}
                      className="p-2 hover:bg-dark-800 rounded-lg transition-colors group"
                      title="Edit Person"
                    >
                      <Edit className="w-5 h-5 text-dark-400 group-hover:text-primary-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => setShowAddToGroupModal(person.personId)}
                      className="p-2 hover:bg-dark-800 rounded-lg transition-colors group"
                      title="Add to Group"
                    >
                      <Plus className="w-5 h-5 text-dark-400 group-hover:text-primary-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => handleDeletePerson(person.personId)}
                      className="p-2 hover:bg-dark-800 rounded-lg transition-colors group"
                      title="Delete Person"
                    >
                      <Trash2 className="w-5 h-5 text-dark-400 group-hover:text-rose-400 transition-colors" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <Users className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-400 mb-4">
                {groups.length === 0 
                  ? "No groups created yet. Create one to get started!" 
                  : "No groups match your search."}
              </p>
              {groups.length === 0 && (
                <button onClick={() => setShowCreateGroup(true)} className="btn-primary">
                  <Plus className="w-5 h-5" />
                  Create Your First Group
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group, index) => (
              <div 
                key={group.groupId} 
                className="glass-card p-6 stagger-item"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-dark-100">{group.groupName}</h3>
                      <p className="text-sm text-dark-500">{group.members.length} members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="btn-secondary text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowAddMembersModal(group.groupId)}
                      className="btn-secondary text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Members
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.groupId)}
                      className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors group border border-transparent hover:border-rose-500/30"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4 text-dark-400 group-hover:text-rose-400 transition-colors" />
                    </button>
                  </div>
                </div>
                
                {group.members.length === 0 ? (
                  <p className="text-dark-500 text-sm italic">No members yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <div 
                        key={member.personId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-800/50 rounded-lg text-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xs font-bold text-dark-950">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-dark-300">{member.fullName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Members to Group Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-dark-100">Add Members to Group</h3>
              <button
                onClick={() => setShowAddMembersModal(null)}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            {persons.length === 0 ? (
              <p className="text-sm text-dark-500 italic">No people available. Create a person first.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {persons
                  .filter(person => {
                    const group = groups.find(g => g.groupId === showAddMembersModal)
                    return group && !group.members.some(m => m.personId === person.personId)
                  })
                  .map((person) => (
                    <button
                      key={person.personId}
                      onClick={() => handleAddMemberToGroup(showAddMembersModal, person.personId)}
                      disabled={addingMember}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 border border-transparent hover:bg-dark-800 hover:border-dark-600 transition-all disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-sm font-bold text-dark-950">
                        {person.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left text-sm text-dark-200">{person.fullName}</span>
                      {addingMember ? (
                        <Loader2 className="w-4 h-4 text-dark-400 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-dark-400" />
                      )}
                    </button>
                  ))}
                {persons.filter(person => {
                  const group = groups.find(g => g.groupId === showAddMembersModal)
                  return group && !group.members.some(m => m.personId === person.personId)
                }).length === 0 && (
                  <p className="text-sm text-dark-500 italic text-center py-4">All people are already members of this group.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Person to Group Modal */}
      {showAddToGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-dark-100">Add to Group</h3>
              <button
                onClick={() => setShowAddToGroupModal(null)}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            {(() => {
              const person = persons.find(p => p.personId === showAddToGroupModal)
              if (!person) return null
              
              return (
                <>
                  <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-sm font-bold text-dark-950">
                      {person.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-dark-200">{person.fullName}</span>
                  </div>
                  
                  {groups.length === 0 ? (
                    <p className="text-sm text-dark-500 italic">No groups available. Create a group first.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {groups
                        .filter(group => !group.members.some(m => m.personId === showAddToGroupModal))
                        .map((group) => (
                          <button
                            key={group.groupId}
                            onClick={() => handleAddPersonToGroup(showAddToGroupModal, group.groupId)}
                            disabled={addingMember}
                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 border border-transparent hover:bg-dark-800 hover:border-dark-600 transition-all disabled:opacity-50"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center">
                              <Users className="w-5 h-5 text-dark-950" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-dark-200">{group.groupName}</p>
                              <p className="text-xs text-dark-500">{group.members.length} members</p>
                            </div>
                            {addingMember ? (
                              <Loader2 className="w-4 h-4 text-dark-400 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 text-dark-400" />
                            )}
                          </button>
                        ))}
                      {groups.filter(group => !group.members.some(m => m.personId === showAddToGroupModal)).length === 0 && (
                        <p className="text-sm text-dark-500 italic text-center py-4">This person is already a member of all groups.</p>
                      )}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {editingPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-dark-100">Edit Person</h3>
              <button
                onClick={() => {
                  setEditingPerson(null)
                  setEditPersonName('')
                }}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={editPersonName}
                  onChange={(e) => setEditPersonName(e.target.value)}
                  placeholder="Enter person's full name"
                  className="input-field pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdatePerson()}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingPerson(null)
                    setEditPersonName('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePerson}
                  disabled={updatingPerson || !editPersonName.trim()}
                  className="btn-primary flex-1"
                >
                  {updatingPerson ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-dark-100">Edit Group</h3>
              <button
                onClick={() => {
                  setEditingGroup(null)
                  setEditGroupName('')
                }}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="input-field pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateGroup()}
                  autoFocus
                />
              </div>

              {/* Members Section */}
              <div className="border-t border-dark-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-dark-300">Members ({editingGroup.members.length})</p>
                  <button
                    onClick={() => setShowAddMembersModal(editingGroup.groupId)}
                    className="btn-secondary text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Members
                  </button>
                </div>
                {editingGroup.members.length === 0 ? (
                  <p className="text-sm text-dark-500 italic">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {editingGroup.members.map((member) => (
                      <div
                        key={member.personId}
                        className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-xs font-bold text-dark-950">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-dark-200">{member.fullName}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMemberFromGroup(editingGroup.groupId, member.personId)}
                          disabled={removingMember}
                          className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors group"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4 text-dark-400 group-hover:text-rose-400 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-dark-800">
                <button
                  onClick={() => {
                    setEditingGroup(null)
                    setEditGroupName('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroup}
                  disabled={updatingGroup || !editGroupName.trim()}
                  className="btn-primary flex-1"
                >
                  {updatingGroup ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-md w-full animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-dark-100">
                Delete {confirmDelete.type === 'person' ? 'Person' : 'Group'}?
              </h3>
              <button
                onClick={() => setConfirmDelete(null)}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                disabled={deletingPerson || deletingGroup}
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-dark-300 mb-2">
                Are you sure you want to delete <span className="font-semibold text-dark-100">"{confirmDelete.name}"</span>?
              </p>
              {confirmDelete.type === 'person' && (
                <p className="text-sm text-rose-400">
                  This will remove the person from all groups and may affect related entries.
                </p>
              )}
              {confirmDelete.type === 'group' && (
                <p className="text-sm text-rose-400">
                  This will delete the group and remove all members from it. Related entries may be affected.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingPerson || deletingGroup}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete.type === 'person' ? confirmDeletePerson : confirmDeleteGroup}
                disabled={deletingPerson || deletingGroup}
                className="btn-primary bg-rose-500 hover:bg-rose-600 flex-1"
              >
                {(deletingPerson || deletingGroup) ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Delete'
                )}
              </button>
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
