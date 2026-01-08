package com.loantracking.service;

import com.loantracking.dto.GroupDTO;
import com.loantracking.dto.PersonDTO;
import com.loantracking.model.Group;
import com.loantracking.model.GroupMember;
import com.loantracking.model.Person;
import com.loantracking.repository.GroupMemberRepository;
import com.loantracking.repository.GroupRepository;
import com.loantracking.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class GroupService {
    
    @Autowired
    private GroupRepository groupRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private GroupMemberRepository groupMemberRepository;
    
    public List<GroupDTO> getAllGroups() {
        return groupRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public GroupDTO getGroupById(UUID id) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group not found with id: " + id));
        return convertToDTO(group);
    }
    
    public GroupDTO createGroup(GroupDTO groupDTO) {
        if (groupRepository.existsByGroupName(groupDTO.getGroupName())) {
            throw new IllegalArgumentException("Group with name '" + groupDTO.getGroupName() + "' already exists");
        }
        
        Group group = new Group();
        group.setGroupName(groupDTO.getGroupName());
        Group saved = groupRepository.save(group);
        
        // Add members if provided
        if (groupDTO.getMembers() != null && !groupDTO.getMembers().isEmpty()) {
            for (PersonDTO memberDTO : groupDTO.getMembers()) {
                Person person = personRepository.findById(memberDTO.getPersonId())
                        .orElseThrow(() -> new IllegalArgumentException("Person not found: " + memberDTO.getPersonId()));
                GroupMember member = new GroupMember();
                member.setGroup(saved);
                member.setPerson(person);
                groupMemberRepository.save(member);
            }
        }
        
        return convertToDTO(saved);
    }
    
    public GroupDTO updateGroup(UUID id, GroupDTO groupDTO) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group not found with id: " + id));
        
        if (!group.getGroupName().equals(groupDTO.getGroupName()) && 
            groupRepository.existsByGroupName(groupDTO.getGroupName())) {
            throw new IllegalArgumentException("Group with name '" + groupDTO.getGroupName() + "' already exists");
        }
        
        group.setGroupName(groupDTO.getGroupName());
        Group updated = groupRepository.save(group);
        return convertToDTO(updated);
    }
    
    public void deleteGroup(UUID id) {
        if (!groupRepository.existsById(id)) {
            throw new IllegalArgumentException("Group not found with id: " + id);
        }
        groupRepository.deleteById(id);
    }
    
    public void addMemberToGroup(UUID groupId, UUID personId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Person not found"));
        
        if (groupMemberRepository.existsByGroup_GroupIdAndPerson_PersonId(groupId, personId)) {
            throw new IllegalArgumentException("Person is already a member of this group");
        }
        
        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setPerson(person);
        groupMemberRepository.save(member);
    }
    
    public void removeMemberFromGroup(UUID groupId, UUID personId) {
        List<GroupMember> members = groupMemberRepository.findByGroup_GroupId(groupId);
        GroupMember member = members.stream()
                .filter(m -> m.getPerson().getPersonId().equals(personId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Person is not a member of this group"));
        groupMemberRepository.delete(member);
    }
    
    private GroupDTO convertToDTO(Group group) {
        List<PersonDTO> members = groupMemberRepository.findByGroup_GroupId(group.getGroupId()).stream()
                .map(gm -> new PersonDTO(gm.getPerson().getPersonId(), gm.getPerson().getFullName()))
                .collect(Collectors.toList());
        return new GroupDTO(group.getGroupId(), group.getGroupName(), members);
    }
}






