package com.loantracking.dto;

import com.loantracking.model.PaymentMethod;
import com.loantracking.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateEntryRequest {
    private String entryName;
    private String description;
    private TransactionType transactionType;
    private LocalDate dateBorrowed;
    private UUID borrowerPersonId;
    private UUID borrowerGroupId;
    private UUID lenderPersonId;
    private BigDecimal amountBorrowed;
    private String notes;
    private String paymentNotes;
    private PaymentMethod paymentMethod;
    // Installment plan details (if transaction type is INSTALLMENT_EXPENSE)
    private LocalDate installmentStartDate;
    private String paymentFrequency; // "WEEKLY" or "MONTHLY"
    private String paymentFrequencyDay; // Day of month (1-28) for MONTHLY, or day of week (SUNDAY-SATURDAY) for WEEKLY
    private Integer paymentTerms;
    private BigDecimal amountPerTerm;
}






