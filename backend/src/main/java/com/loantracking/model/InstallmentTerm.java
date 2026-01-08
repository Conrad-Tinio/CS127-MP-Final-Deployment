package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "installment_term", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"installment_id", "term_number"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentTerm {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "term_id")
    private UUID termId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installment_id", nullable = false)
    private InstallmentPlan installmentPlan;
    
    @Column(name = "term_number", nullable = false)
    private Integer termNumber;
    
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "term_status", nullable = false)
    private InstallmentStatus termStatus = InstallmentStatus.NOT_STARTED;
    
    @Column(name = "penalty_applied", precision = 15, scale = 2)
    private BigDecimal penaltyApplied;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (termStatus == null) {
            termStatus = InstallmentStatus.NOT_STARTED;
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}






