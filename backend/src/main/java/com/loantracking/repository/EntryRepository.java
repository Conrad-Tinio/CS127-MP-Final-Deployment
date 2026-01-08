package com.loantracking.repository;

import com.loantracking.model.Entry;
import com.loantracking.model.TransactionType;
import com.loantracking.model.PaymentStatus;
import org.springframework.data.domain.Pageable;
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
    
    // Optimized queries for dashboard - filter at database level
    @Query("SELECT e FROM Entry e LEFT JOIN FETCH e.lenderPerson LEFT JOIN FETCH e.borrowerPerson LEFT JOIN FETCH e.borrowerGroup " +
           "WHERE e.lenderPerson.personId = :personId OR e.borrowerPerson.personId = :personId " +
           "OR e.borrowerGroup.groupId IN (SELECT gm.group.groupId FROM GroupMember gm WHERE gm.person.personId = :personId) " +
           "ORDER BY e.createdAt DESC")
    List<Entry> findEntriesForUser(@Param("personId") UUID personId);
    
    // Get recent entries with limit (for dashboard)
    @Query("SELECT e FROM Entry e LEFT JOIN FETCH e.lenderPerson LEFT JOIN FETCH e.borrowerPerson LEFT JOIN FETCH e.borrowerGroup " +
           "WHERE e.lenderPerson.personId = :personId OR e.borrowerPerson.personId = :personId " +
           "OR e.borrowerGroup.groupId IN (SELECT gm.group.groupId FROM GroupMember gm WHERE gm.person.personId = :personId) " +
           "ORDER BY e.createdAt DESC")
    List<Entry> findRecentEntriesForUser(@Param("personId") UUID personId, Pageable pageable);
    
    // Count entries by status for a user (efficient aggregation)
    @Query("SELECT e.status, COUNT(e) FROM Entry e " +
           "WHERE e.lenderPerson.personId = :personId OR e.borrowerPerson.personId = :personId " +
           "OR e.borrowerGroup.groupId IN (SELECT gm.group.groupId FROM GroupMember gm WHERE gm.person.personId = :personId) " +
           "GROUP BY e.status")
    List<Object[]> countEntriesByStatusForUser(@Param("personId") UUID personId);
    
    // Sum amounts for a user (efficient aggregation)
    @Query("SELECT COALESCE(SUM(e.amountBorrowed), 0), COALESCE(SUM(e.amountRemaining), 0) FROM Entry e " +
           "WHERE e.lenderPerson.personId = :personId OR e.borrowerPerson.personId = :personId " +
           "OR EXISTS (SELECT 1 FROM GroupMember gm WHERE gm.group.groupId = e.borrowerGroup.groupId AND gm.person.personId = :personId)")
    Object[] sumAmountsForUser(@Param("personId") UUID personId);
}






