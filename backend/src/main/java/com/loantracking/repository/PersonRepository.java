package com.loantracking.repository;

import com.loantracking.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {
    Optional<Person> findByFullName(String fullName);
    List<Person> findByFullNameContainingIgnoreCase(String name);
}






