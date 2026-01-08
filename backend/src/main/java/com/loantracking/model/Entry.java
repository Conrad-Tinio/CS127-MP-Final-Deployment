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
@Table(name = "entry")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Entry {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "entry_id")
    private UUID entryId;
    
    @Column(name = "entry_name", nullable = false)
    private String entryName;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;
    
    @Column(name = "date_borrowed")
    private LocalDate dateBorrowed;
    
    @Column(name = "date_fully_paid")
    private LocalDate dateFullyPaid;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_person_id")
    private Person borrowerPerson;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_group_id")
    private Group borrowerGroup;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lender_person_id", nullable = false)
    private Person lenderPerson;
    
    @Column(name = "amount_borrowed", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountBorrowed;
    
    @Column(name = "amount_remaining", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountRemaining;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentStatus status = PaymentStatus.UNPAID;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;
    
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "payment_notes", columnDefinition = "TEXT")
    private String paymentNotes;
    
    @Column(name = "receipt_or_proof")
    private byte[] receiptOrProof;
    
    @Column(name = "reference_id", nullable = false, unique = true)
    private String referenceId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PaymentAllocation> paymentAllocations;
    
    @OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PaymentEntry> paymentEntries;
    
    @OneToOne(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private InstallmentPlan installmentPlan;
    
    @OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Attachment> attachments;
    
    @PrePersist
    protected void onCreate() {
        if (amountRemaining == null) {
            amountRemaining = amountBorrowed;
        }
        if (status == null) {
            status = PaymentStatus.UNPAID;
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

