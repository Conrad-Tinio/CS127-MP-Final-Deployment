package com.loantracking.controller;

import com.loantracking.dto.InstallmentTermDTO;
import com.loantracking.model.InstallmentStatus;
import com.loantracking.service.InstallmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/installments")
@CrossOrigin(origins = "http://localhost:5173")
public class InstallmentController {
    
    @Autowired
    private InstallmentService installmentService;
    
    @PostMapping("/terms/{termId}/skip")
    public ResponseEntity<InstallmentTermDTO> skipTerm(@PathVariable UUID termId) {
        return ResponseEntity.ok(installmentService.skipTerm(termId));
    }
    
    @GetMapping("/terms/{termId}/skip-penalty")
    public ResponseEntity<Map<String, BigDecimal>> getSkipPenalty(@PathVariable UUID termId) {
        BigDecimal penalty = installmentService.calculateSkipPenalty(termId);
        return ResponseEntity.ok(Map.of("penalty", penalty));
    }
    
    @GetMapping("/terms/{termId}/delinquent-late-fee")
    public ResponseEntity<Map<String, BigDecimal>> getDelinquentLateFee(@PathVariable UUID termId) {
        BigDecimal lateFee = installmentService.calculateDelinquentLateFee(termId);
        return ResponseEntity.ok(Map.of("lateFee", lateFee));
    }
    
    @PutMapping("/terms/{termId}/status")
    public ResponseEntity<InstallmentTermDTO> updateTermStatus(
            @PathVariable UUID termId,
            @RequestParam InstallmentStatus status) {
        return ResponseEntity.ok(installmentService.updateTermStatus(termId, status));
    }
    
    @PostMapping("/update-delinquent")
    public ResponseEntity<Void> updateDelinquentTerms() {
        installmentService.updateDelinquentTerms();
        return ResponseEntity.ok().build();
    }
}






