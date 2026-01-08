package com.loantracking.repository;

import com.loantracking.model.Entry;
import com.loantracking.model.TransactionType;
import com.loantracking.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EntryRepository extends JpaRepository<Entry, UUID> {
    Optional<Entry> findByReferenceId(String referenceId);
    List<Entry> findByBorrowerPerson_PersonId(UUID personId);
    List<Entry> findByBorrowerGroup_GroupId(UUID groupId);
    List<Entry> findByLenderPerson_PersonId(UUID personId);
    List<Entry> findByTransactionType(TransactionType transactionType);
    List<Entry> findByStatus(PaymentStatus status);
    boolean existsByReferenceId(String referenceId);
    
    @Query("SELECT e FROM Entry e WHERE e.lenderPerson.personId = :personId OR e.borrowerPerson.personId = :personId")
    List<Entry> findByPersonAsLenderOrBorrower(@Param("personId") UUID personId);
}






