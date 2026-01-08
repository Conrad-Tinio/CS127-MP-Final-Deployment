package com.loantracking.dto;

import com.loantracking.model.PaymentAllocationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAllocationDTO {
    private UUID allocationId;
    private UUID entryId;
    private UUID personId;
    private String personName;
    private PaymentAllocationStatus paymentAllocationStatus; // Computed, not stored in DB
    private String description;
    private BigDecimal amount;
    private BigDecimal percentageOfTotal; // Computed, not stored in DB
    private String notes;
}

