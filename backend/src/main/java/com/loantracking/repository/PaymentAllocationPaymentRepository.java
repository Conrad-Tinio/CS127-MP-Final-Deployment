package com.loantracking.repository;

import com.loantracking.model.PaymentAllocationPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAllocationPaymentRepository extends JpaRepository<PaymentAllocationPayment, UUID> {
    List<PaymentAllocationPayment> findByAllocation_AllocationId(UUID allocationId);
    List<PaymentAllocationPayment> findByPayment_PaymentId(UUID paymentId);
    boolean existsByPayment_PaymentIdAndAllocation_AllocationId(UUID paymentId, UUID allocationId);
}

