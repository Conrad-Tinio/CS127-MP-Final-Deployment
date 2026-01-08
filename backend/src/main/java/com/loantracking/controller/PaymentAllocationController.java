package com.loantracking.controller;

import com.loantracking.dto.CreatePaymentAllocationRequest;
import com.loantracking.dto.PaymentAllocationDTO;
import com.loantracking.service.PaymentAllocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment-allocations")
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentAllocationController {
    
    @Autowired
    private PaymentAllocationService paymentAllocationService;
    
    @GetMapping
    public ResponseEntity<List<PaymentAllocationDTO>> getAllPaymentAllocations() {
        return ResponseEntity.ok(paymentAllocationService.getAllPaymentAllocations());
    }
    
    @GetMapping("/entry/{entryId}")
    public ResponseEntity<List<PaymentAllocationDTO>> getPaymentAllocationsByEntry(@PathVariable UUID entryId) {
        return ResponseEntity.ok(paymentAllocationService.getPaymentAllocationsByEntry(entryId));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<PaymentAllocationDTO> getPaymentAllocationById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentAllocationService.getPaymentAllocationById(id));
    }
    
    @PostMapping
    public ResponseEntity<List<PaymentAllocationDTO>> createPaymentAllocations(@RequestBody CreatePaymentAllocationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentAllocationService.createPaymentAllocations(request));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<PaymentAllocationDTO> updatePaymentAllocation(@PathVariable UUID id, @RequestBody PaymentAllocationDTO dto) {
        return ResponseEntity.ok(paymentAllocationService.updatePaymentAllocation(id, dto));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePaymentAllocation(@PathVariable UUID id) {
        paymentAllocationService.deletePaymentAllocation(id);
        return ResponseEntity.noContent().build();
    }
}






