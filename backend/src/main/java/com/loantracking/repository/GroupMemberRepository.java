package com.loantracking.repository;

import com.loantracking.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    List<GroupMember> findByGroup_GroupId(UUID groupId);
    List<GroupMember> findByPerson_PersonId(UUID personId);
    boolean existsByGroup_GroupIdAndPerson_PersonId(UUID groupId, UUID personId);
}






