package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "installment_plan")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "installment_id")
    private UUID installmentId;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false, unique = true)
    private Entry entry;
    
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_frequency", nullable = false)
    private PaymentFrequency paymentFrequency;
    
    @Column(name = "payment_terms", nullable = false)
    private Integer paymentTerms;
    
    @Column(name = "amount_per_term", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPerTerm;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "installmentPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InstallmentTerm> installmentTerms;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}






