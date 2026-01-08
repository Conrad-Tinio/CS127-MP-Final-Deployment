package com.loantracking.service;

import com.loantracking.dto.CreatePaymentRequest;
import com.loantracking.dto.PaymentDTO;
import com.loantracking.model.Attachment;
import com.loantracking.model.Entry;
import com.loantracking.model.Payment;
import com.loantracking.model.PaymentEntry;
import com.loantracking.model.PaymentStatus;
import com.loantracking.model.Person;
import com.loantracking.model.TransactionType;
import com.loantracking.model.InstallmentTerm;
import com.loantracking.model.InstallmentStatus;
import com.loantracking.repository.AttachmentRepository;
import com.loantracking.repository.EntryRepository;
import com.loantracking.repository.InstallmentPlanRepository;
import com.loantracking.repository.InstallmentTermRepository;
import com.loantracking.repository.PaymentEntryRepository;
import com.loantracking.repository.PaymentRepository;
import com.loantracking.repository.PersonRepository;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentService {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private EntryRepository entryRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private PaymentEntryRepository paymentEntryRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;
    
    @Autowired
    private com.loantracking.repository.PaymentAllocationRepository paymentAllocationRepository;
    
    @Autowired
    private com.loantracking.repository.PaymentAllocationPaymentRepository paymentAllocationPaymentRepository;
    
    @Autowired
    private InstallmentService installmentService;
    
    @Autowired
    private InstallmentPlanRepository installmentPlanRepository;
    
    @Autowired
    private InstallmentTermRepository installmentTermRepository;
    
    private Person getOrCreateCurrentUser() {
        String userName = UserContext.getCurrentUserName();
        return personRepository.findByFullName(userName)
                .orElseGet(() -> {
                    Person user = new Person();
                    user.setFullName(userName);
                    return personRepository.save(user);
                });
    }
    
    private boolean isEntryRelatedToParentUser(Entry entry, UUID parentUserId) {
        boolean isLender = entry.getLenderPerson() != null && 
                          entry.getLenderPerson().getPersonId().equals(parentUserId);
        boolean isBorrower = entry.getBorrowerPerson() != null && 
                            entry.getBorrowerPerson().getPersonId().equals(parentUserId);
        
        if (entry.getBorrowerGroup() != null) {
            return isLender;
        }
        
        return isLender != isBorrower; // XOR: exactly one must be true
    }
    
    private boolean isPaymentRelatedToParentUser(Payment payment, UUID parentUserId) {
        List<PaymentEntry> paymentEntries = paymentEntryRepository.findByPayment_PaymentId(payment.getPaymentId());
        return paymentEntries.stream()
                .anyMatch(pe -> isEntryRelatedToParentUser(pe.getEntry(), parentUserId));
    }
    
    public List<PaymentDTO> getAllPayments() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        return paymentRepository.findAll().stream()
                .filter(payment -> isPaymentRelatedToParentUser(payment, currentUserId))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public PaymentDTO getPaymentById(UUID id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isPaymentRelatedToParentUser(payment, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment not found with id: " + id);
        }
        
        return convertToDTO(payment);
    }
    
    public PaymentDTO createPayment(CreatePaymentRequest request, MultipartFile proof) {
        Entry entry = entryRepository.findById(request.getEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        
        // Allow creating payments for any entry by direct entry ID, regardless of user involvement
        // This enables creating payments immediately after entry creation, even if the creator
        // is not involved in the entry. This matches the behavior of getEntryById and
        // getPaymentAllocationsByEntry.
        
        Person payee = personRepository.findById(request.getPayeePersonId())
                .orElseThrow(() -> new IllegalArgumentException("Payee not found"));
        
        // Calculate change amount if payment exceeds remaining balance
        BigDecimal changeAmount = BigDecimal.ZERO;
        if (request.getPaymentAmount().compareTo(entry.getAmountRemaining()) > 0) {
            changeAmount = request.getPaymentAmount().subtract(entry.getAmountRemaining());
        }
        
        Payment payment = new Payment();
        payment.setPaymentDate(request.getPaymentDate());
        payment.setPaymentAmount(request.getPaymentAmount());
        payment.setChangeAmount(changeAmount);
        payment.setPayeePerson(payee);
        payment.setNotes(request.getNotes());
        
        // Attach proof if provided
        if (proof != null && !proof.isEmpty()) {
            try {
                payment.setProof(proof.getBytes());
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to read proof file", e);
            }
        }
        
        Payment saved = paymentRepository.save(payment);

        // Save proof to attachment table as well (if provided)
        if (proof != null && !proof.isEmpty()) {
            try {
                Attachment attachment = new Attachment();
                attachment.setPayment(saved);
                attachment.setEntry(entry);
                attachment.setUploadedLocation("DATABASE");
                attachment.setOriginalFilename(proof.getOriginalFilename());
                attachment.setContentType(proof.getContentType());
                attachment.setFileSize(proof.getSize());
                attachment.setFileData(proof.getBytes());
                attachmentRepository.save(attachment);
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to store proof attachment", e);
            }
        }
        
        // Link payment to entry
        PaymentEntry paymentEntry = new PaymentEntry();
        paymentEntry.setPayment(saved);
        paymentEntry.setEntry(entry);
        paymentEntryRepository.save(paymentEntry);
        
        // Link payment to specific allocation if provided (for group expenses)
        if (request.getAllocationId() != null) {
            com.loantracking.model.PaymentAllocation allocation = paymentAllocationRepository.findById(request.getAllocationId())
                    .orElseThrow(() -> new IllegalArgumentException("Payment allocation not found"));
            
            // Validate that the allocation belongs to this entry
            if (!allocation.getEntry().getEntryId().equals(entry.getEntryId())) {
                throw new IllegalArgumentException("Payment allocation does not belong to this entry");
            }
            
            // Validate that the payee matches the allocation person
            if (!allocation.getPerson().getPersonId().equals(request.getPayeePersonId())) {
                throw new IllegalArgumentException("Payee must match the person in the payment allocation");
            }
            
            // Create the link
            com.loantracking.model.PaymentAllocationPayment allocationPayment = new com.loantracking.model.PaymentAllocationPayment();
            allocationPayment.setPayment(saved);
            allocationPayment.setAllocation(allocation);
            allocationPayment.setAmount(request.getPaymentAmount()); // Full payment amount applied to this allocation
            paymentAllocationPaymentRepository.save(allocationPayment);
        }
        
        // Update entry amount remaining and status
        updateEntryAfterPayment(entry, request.getPaymentAmount());
        
        // Update delinquent terms for installment entries after payment
        if (entry.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE) {
            installmentService.updateDelinquentTermsForEntry(entry.getEntryId());
        }
        
        return convertToDTO(saved);
    }
    
    private void updateEntryAfterPayment(Entry entry, BigDecimal paymentAmount) {
        BigDecimal newRemaining = entry.getAmountRemaining().subtract(paymentAmount);
        
        if (newRemaining.compareTo(BigDecimal.ZERO) < 0) {
            newRemaining = BigDecimal.ZERO;
        }
        
        entry.setAmountRemaining(newRemaining);
        
        // Update status
        if (newRemaining.compareTo(BigDecimal.ZERO) == 0) {
            entry.setStatus(PaymentStatus.PAID);
            entry.setDateFullyPaid(java.time.LocalDate.now());
        } else if (entry.getAmountRemaining().compareTo(entry.getAmountBorrowed()) < 0) {
            entry.setStatus(PaymentStatus.PARTIALLY_PAID);
        }
        
        entryRepository.save(entry);
    }
    
    public PaymentDTO updatePayment(UUID id, CreatePaymentRequest request) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isPaymentRelatedToParentUser(payment, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment not found with id: " + id);
        }
        
        BigDecimal oldAmount = payment.getPaymentAmount();
        
        payment.setPaymentDate(request.getPaymentDate());
        payment.setPaymentAmount(request.getPaymentAmount());
        payment.setNotes(request.getNotes());
        
        if (request.getPayeePersonId() != null) {
            Person payee = personRepository.findById(request.getPayeePersonId())
                    .orElseThrow(() -> new IllegalArgumentException("Payee not found"));
            payment.setPayeePerson(payee);
        }
        
        Payment saved = paymentRepository.save(payment);
        
        // Update entry if payment amount changed
        if (oldAmount.compareTo(request.getPaymentAmount()) != 0) {
            Entry entry = entryRepository.findById(request.getEntryId())
                    .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
            BigDecimal difference = request.getPaymentAmount().subtract(oldAmount);
            updateEntryAfterPayment(entry, difference);
        }
        
        return convertToDTO(saved);
    }
    
    public void deletePayment(UUID id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isPaymentRelatedToParentUser(payment, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment not found with id: " + id);
        }
        
        paymentRepository.deleteById(id);
    }
    
    public List<PaymentDTO> getPaymentsByEntry(UUID entryId) {
        // Check if entry exists
        if (!entryRepository.existsById(entryId)) {
            throw new IllegalArgumentException("Entry not found with id: " + entryId);
        }
        
        // Allow viewing payments for any entry by direct entry ID, regardless of user involvement
        // This enables viewing payments immediately after entry creation, even if the creator
        // is not involved in the entry. This matches the behavior of getEntryById and
        // getPaymentAllocationsByEntry.
        
        return paymentEntryRepository.findByEntry_EntryId(entryId).stream()
                .map(pe -> convertToDTO(pe.getPayment()))
                .collect(Collectors.toList());
    }
    
    private PaymentDTO convertToDTO(Payment payment) {
        PaymentDTO dto = new PaymentDTO();
        dto.setPaymentId(payment.getPaymentId());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setPaymentAmount(payment.getPaymentAmount());
        dto.setChangeAmount(payment.getChangeAmount());
        if (payment.getPayeePerson() != null) {
            dto.setPayeePersonId(payment.getPayeePerson().getPersonId());
            dto.setPayeePersonName(payment.getPayeePerson().getFullName());
        }
        dto.setNotes(payment.getNotes());
        
        // Check if payment has proof
        boolean hasProof = payment.getProof() != null && payment.getProof().length > 0;
        if (!hasProof) {
            // Also check attachments table
            List<Attachment> attachments = attachmentRepository.findByPayment_PaymentId(payment.getPaymentId());
            hasProof = !attachments.isEmpty();
        }
        dto.setHasProof(hasProof);
        
        // Get related entry information
        List<PaymentEntry> paymentEntries = paymentEntryRepository.findByPayment_PaymentId(payment.getPaymentId());
        if (!paymentEntries.isEmpty()) {
            Entry entry = paymentEntries.get(0).getEntry();
            dto.setEntryId(entry.getEntryId());
            dto.setEntryName(entry.getEntryName());
            dto.setEntryReferenceId(entry.getReferenceId());
        }
        
        return dto;
    }
    
    /**
     * Gets payment proof image as byte array for viewing/downloading.
     * Returns proof from payment.proof field or from attachments table.
     */
    public byte[] getPaymentProof(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + paymentId));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isPaymentRelatedToParentUser(payment, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment not found with id: " + paymentId);
        }
        
        // First try to get from payment.proof field
        if (payment.getProof() != null && payment.getProof().length > 0) {
            return payment.getProof();
        }
        
        // Fallback to attachments table
        List<Attachment> attachments = attachmentRepository.findByPayment_PaymentId(paymentId);
        if (!attachments.isEmpty()) {
            Attachment attachment = attachments.get(0);
            if (attachment.getFileData() != null && attachment.getFileData().length > 0) {
                return attachment.getFileData();
            }
        }
        
        throw new IllegalArgumentException("Payment proof not found");
    }
    
    /**
     * Gets payment proof with content type information.
     * Returns proof from payment.proof field or from attachments table.
     */
    public PaymentProofInfo getPaymentProofWithInfo(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with id: " + paymentId));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isPaymentRelatedToParentUser(payment, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment not found with id: " + paymentId);
        }
        
        // First try to get from payment.proof field
        if (payment.getProof() != null && payment.getProof().length > 0) {
            return new PaymentProofInfo(payment.getProof(), "image/jpeg"); // Default for proof field
        }
        
        // Fallback to attachments table
        List<Attachment> attachments = attachmentRepository.findByPayment_PaymentId(paymentId);
        if (!attachments.isEmpty()) {
            Attachment attachment = attachments.get(0);
            if (attachment.getFileData() != null && attachment.getFileData().length > 0) {
                String contentType = attachment.getContentType();
                if (contentType == null || contentType.trim().isEmpty()) {
                    contentType = "image/jpeg"; // Default
                }
                return new PaymentProofInfo(attachment.getFileData(), contentType);
            }
        }
        
        throw new IllegalArgumentException("Payment proof not found");
    }
    
    /**
     * Calculates the total amount of penalties that have been paid for entries related to the current user.
     * A penalty is considered "paid" when:
     * 1. The installment term status is PAID (the term has been paid, which includes the penalty)
     * 2. OR the entry status is PAID (the entire entry is paid, so all penalties are considered paid)
     * 
     * @return The total amount of paid penalties
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalPaidPenalties() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        // Get all entries related to the user
        List<Entry> userEntries = entryRepository.findEntriesForUser(currentUserId);
        
        AtomicReference<BigDecimal> totalPaidPenalties = new AtomicReference<>(BigDecimal.ZERO);
        
        for (Entry entry : userEntries) {
            // Only process installment entries
            if (entry.getTransactionType() != TransactionType.INSTALLMENT_EXPENSE) {
                continue;
            }
            
            // If entry is fully paid, all penalties are considered paid
            if (entry.getStatus() == PaymentStatus.PAID) {
                installmentPlanRepository.findByEntry_EntryId(entry.getEntryId())
                    .ifPresent(plan -> {
                        List<InstallmentTerm> terms = installmentTermRepository
                            .findByInstallmentPlan_InstallmentId(plan.getInstallmentId());
                        for (InstallmentTerm term : terms) {
                            if (term.getPenaltyApplied() != null && 
                                term.getPenaltyApplied().compareTo(BigDecimal.ZERO) > 0) {
                                totalPaidPenalties.updateAndGet(
                                    current -> current.add(term.getPenaltyApplied())
                                );
                            }
                        }
                    });
            } else {
                // Entry is not fully paid, only count penalties from terms that are PAID
                installmentPlanRepository.findByEntry_EntryId(entry.getEntryId())
                    .ifPresent(plan -> {
                        List<InstallmentTerm> paidTerms = installmentTermRepository
                            .findByInstallmentPlan_InstallmentIdAndTermStatus(
                                plan.getInstallmentId(), 
                                InstallmentStatus.PAID
                            );
                        for (InstallmentTerm term : paidTerms) {
                            if (term.getPenaltyApplied() != null && 
                                term.getPenaltyApplied().compareTo(BigDecimal.ZERO) > 0) {
                                totalPaidPenalties.updateAndGet(
                                    current -> current.add(term.getPenaltyApplied())
                                );
                            }
                        }
                    });
            }
        }
        
        return totalPaidPenalties.get();
    }
    
    /**
     * Inner class to hold payment proof data and content type.
     */
    public static class PaymentProofInfo {
        private final byte[] proof;
        private final String contentType;
        
        public PaymentProofInfo(byte[] proof, String contentType) {
            this.proof = proof;
            this.contentType = contentType;
        }
        
        public byte[] getProof() {
            return proof;
        }
        
        public String getContentType() {
            return contentType;
        }
    }
}

