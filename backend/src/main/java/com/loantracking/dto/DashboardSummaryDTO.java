package com.loantracking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private int totalEntries;
    private int unpaidCount;
    private int partiallyPaidCount;
    private int paidCount;
    private BigDecimal totalBorrowed;
    private BigDecimal totalRemaining;
    private BigDecimal totalPaidPenalties; // Total paid penalties for accurate payment tracking
    private List<EntryDTO> recentEntries; // Only last 5 entries
}
