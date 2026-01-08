package com.loantracking.controller;

import com.loantracking.dto.CreatePaymentRequest;
import com.loantracking.dto.PaymentDTO;
import com.loantracking.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:5173")
public class PaymentController {
    
    @Autowired
    private PaymentService paymentService;
    
    @GetMapping
    public ResponseEntity<List<PaymentDTO>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<PaymentDTO> getPaymentById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }
    
    @GetMapping("/entry/{entryId}")
    public ResponseEntity<List<PaymentDTO>> getPaymentsByEntry(@PathVariable UUID entryId) {
        return ResponseEntity.ok(paymentService.getPaymentsByEntry(entryId));
    }
    
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PaymentDTO> createPayment(@RequestPart("request") CreatePaymentRequest request,
                                                    @RequestPart(value = "proof", required = false) MultipartFile proof) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(request, proof));
    }
    
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PaymentDTO> createPayment(@RequestBody CreatePaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.createPayment(request, null));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<PaymentDTO> updatePayment(@PathVariable UUID id, @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.updatePayment(id, request));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable UUID id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/{id}/proof")
    public ResponseEntity<byte[]> getPaymentProof(@PathVariable UUID id) {
        PaymentService.PaymentProofInfo proofInfo = paymentService.getPaymentProofWithInfo(id);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(proofInfo.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.IMAGE_JPEG; // Default fallback
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(proofInfo.getProof());
    }
    
    @GetMapping("/total-paid-penalties")
    public ResponseEntity<Map<String, BigDecimal>> getTotalPaidPenalties() {
        BigDecimal totalPaidPenalties = paymentService.getTotalPaidPenalties();
        Map<String, BigDecimal> response = new HashMap<>();
        response.put("totalPaidPenalties", totalPaidPenalties);
        return ResponseEntity.ok(response);
    }
}






