package com.loantracking.dto;

import com.loantracking.model.PaymentMethod;
import com.loantracking.model.PaymentStatus;
import com.loantracking.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntryDTO {
    private UUID entryId;
    private String entryName;
    private String description;
    private TransactionType transactionType;
    private LocalDate dateBorrowed;
    private LocalDate dateFullyPaid;
    private UUID borrowerPersonId;
    private String borrowerPersonName;
    private UUID borrowerGroupId;
    private String borrowerGroupName;
    private UUID lenderPersonId;
    private String lenderPersonName;
    private BigDecimal amountBorrowed;
    private BigDecimal amountRemaining;
    private PaymentStatus status;
    private PaymentMethod paymentMethod;
    private String notes;
    private String paymentNotes;
    private String referenceId;
    private List<PaymentDTO> payments;
    private InstallmentPlanDTO installmentPlan;
    private List<PaymentAllocationDTO> paymentAllocations;
    private String userRole; // "LENDER" or "BORROWER" - indicates current user's role for this entry
}






