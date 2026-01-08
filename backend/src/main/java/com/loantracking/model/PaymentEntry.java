package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_entry", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"payment_id", "entry_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentEntry {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "payment_entry_id")
    private UUID paymentEntryId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private Entry entry;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}






