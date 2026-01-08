package com.loantracking.repository;

import com.loantracking.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {
    Optional<Group> findByGroupName(String groupName);
    boolean existsByGroupName(String groupName);
}






