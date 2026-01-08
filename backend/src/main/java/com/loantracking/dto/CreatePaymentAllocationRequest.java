package com.loantracking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentAllocationRequest {
    private UUID entryId;
    private List<PaymentAllocationItem> allocations;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentAllocationItem {
        private UUID personId;
        private String description;
        private BigDecimal amount;
        private String notes;
    }
}






