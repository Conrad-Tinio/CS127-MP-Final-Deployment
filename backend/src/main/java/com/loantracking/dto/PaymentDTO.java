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
public class PaymentDTO {
    private UUID paymentId;
    private LocalDate paymentDate;
    private BigDecimal paymentAmount;
    private BigDecimal changeAmount;
    private UUID payeePersonId;
    private String payeePersonName;
    private String notes;
    private UUID entryId;
    private String entryName;
    private String entryReferenceId;
    private boolean hasProof; // Indicates if payment has proof/attachment
}






