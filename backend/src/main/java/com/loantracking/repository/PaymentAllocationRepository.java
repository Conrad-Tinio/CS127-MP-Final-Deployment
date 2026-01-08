package com.loantracking.repository;

import com.loantracking.model.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, UUID> {
    List<PaymentAllocation> findByEntry_EntryId(UUID entryId);
    List<PaymentAllocation> findByPerson_PersonId(UUID personId);
}

