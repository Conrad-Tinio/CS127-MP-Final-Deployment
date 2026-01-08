package com.loantracking.repository;

import com.loantracking.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByPayeePerson_PersonId(UUID personId);
    List<Payment> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate);
}






