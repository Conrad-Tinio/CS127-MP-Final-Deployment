package com.loantracking.dto;

import com.loantracking.model.InstallmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentTermDTO {
    private UUID termId;
    private UUID installmentId;
    private Integer termNumber;
    private LocalDate dueDate;
    private InstallmentStatus termStatus;
    private BigDecimal penaltyApplied; // Penalty applied when term was skipped
}






