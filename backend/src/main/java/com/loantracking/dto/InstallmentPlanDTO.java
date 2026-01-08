package com.loantracking.dto;

import com.loantracking.model.PaymentFrequency;
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
public class InstallmentPlanDTO {
    private UUID installmentId;
    private UUID entryId;
    private LocalDate startDate;
    private PaymentFrequency paymentFrequency;
    private String paymentFrequencyDay; // Day of month (1-28) for MONTHLY, or day of week (SUNDAY-SATURDAY) for WEEKLY
    private Integer paymentTerms;
    private BigDecimal amountPerTerm;
    private String notes;
    private List<InstallmentTermDTO> installmentTerms;
}






