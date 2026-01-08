package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_allocation_payment", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"payment_id", "allocation_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAllocationPayment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "payment_allocation_payment_id")
    private UUID paymentAllocationPaymentId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_id", nullable = false)
    private PaymentAllocation allocation;
    
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

