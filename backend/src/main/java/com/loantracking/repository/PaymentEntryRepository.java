package com.loantracking.repository;

import com.loantracking.model.PaymentEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentEntryRepository extends JpaRepository<PaymentEntry, UUID> {
    List<PaymentEntry> findByEntry_EntryId(UUID entryId);
    List<PaymentEntry> findByPayment_PaymentId(UUID paymentId);
    boolean existsByPayment_PaymentIdAndEntry_EntryId(UUID paymentId, UUID entryId);
}






