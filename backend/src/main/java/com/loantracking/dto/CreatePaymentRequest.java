package com.loantracking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    private UUID entryId;
    private LocalDate paymentDate;
    private BigDecimal paymentAmount;
    private UUID payeePersonId;
    private String notes;
    private UUID allocationId; // Optional: for group expenses, link payment to specific allocation
}






