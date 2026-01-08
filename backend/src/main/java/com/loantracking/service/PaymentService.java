package com.loantracking.service;

import com.loantracking.dto.CreatePaymentRequest;
import com.loantracking.dto.PaymentDTO;
import com.loantracking.model.Attachment;
import com.loantracking.model.Entry;
import com.loantracking.model.Payment;
import com.loantracking.model.PaymentEntry;
import com.loantracking.model.PaymentStatus;
import com.loantracking.model.Person;
import com.loantracking.repository.AttachmentRepository;
import com.loantracking.repository.EntryRepository;
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
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Entry not found");
        }
        
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
        Entry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + entryId));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Entry not found with id: " + entryId);
        }
        
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
}

