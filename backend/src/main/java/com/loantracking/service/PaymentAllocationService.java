package com.loantracking.service;

import com.loantracking.dto.CreatePaymentAllocationRequest;
import com.loantracking.dto.PaymentAllocationDTO;
import com.loantracking.model.Entry;
import com.loantracking.model.PaymentAllocation;
import com.loantracking.model.PaymentAllocationStatus;
import com.loantracking.model.PaymentEntry;
import com.loantracking.model.Person;
import com.loantracking.repository.EntryRepository;
import com.loantracking.repository.PaymentAllocationRepository;
import com.loantracking.repository.PaymentAllocationPaymentRepository;
import com.loantracking.repository.PaymentEntryRepository;
import com.loantracking.repository.PersonRepository;
import com.loantracking.model.PaymentAllocationPayment;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentAllocationService {
    
    @Autowired
    private PaymentAllocationRepository paymentAllocationRepository;
    
    @Autowired
    private EntryRepository entryRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private PaymentEntryRepository paymentEntryRepository;
    
    @Autowired
    private PaymentAllocationPaymentRepository paymentAllocationPaymentRepository;
    
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
    
    public List<PaymentAllocationDTO> getAllPaymentAllocations() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        return paymentAllocationRepository.findAll().stream()
                .filter(allocation -> {
                    Entry entry = allocation.getEntry();
                    return isEntryRelatedToParentUser(entry, currentUserId);
                })
                .map(allocation -> {
                    Entry entry = allocation.getEntry();
                    return convertToDTO(allocation, entry);
                })
                .collect(Collectors.toList());
    }
    
    public List<PaymentAllocationDTO> getPaymentAllocationsByEntry(UUID entryId) {
        Entry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        
        // Allow access to allocations for any entry by direct entry ID, regardless of user involvement
        // This enables viewing allocations immediately after entry creation, even if the creator
        // is not involved in the entry. The getAllPaymentAllocations() method still filters
        // to only show allocations for entries where the user is involved.
        return paymentAllocationRepository.findByEntry_EntryId(entryId).stream()
                .map(allocation -> convertToDTO(allocation, entry))
                .collect(Collectors.toList());
    }
    
    public PaymentAllocationDTO getPaymentAllocationById(UUID id) {
        PaymentAllocation allocation = paymentAllocationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment allocation not found with id: " + id));
        Entry entry = allocation.getEntry();
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Payment allocation not found with id: " + id);
        }
        
        return convertToDTO(allocation, entry);
    }
    
    public List<PaymentAllocationDTO> createPaymentAllocations(CreatePaymentAllocationRequest request) {
        Entry entry = entryRepository.findById(request.getEntryId())
                .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
        
        // Allow creating allocations for any entry by direct entry ID, regardless of user involvement
        // This enables creating allocations immediately after entry creation, even if the creator
        // is not involved in the entry.
        
        List<PaymentAllocationDTO> created = request.getAllocations().stream()
                .map(item -> {
                    Person person = personRepository.findById(item.getPersonId())
                            .orElseThrow(() -> new IllegalArgumentException("Person not found: " + item.getPersonId()));
                    
                    PaymentAllocation allocation = new PaymentAllocation();
                    allocation.setEntry(entry);
                    allocation.setPerson(person);
                    allocation.setDescription(item.getDescription());
                    allocation.setAmount(item.getAmount());
                    allocation.setNotes(item.getNotes());
                    
                    PaymentAllocation saved = paymentAllocationRepository.save(allocation);
                    return convertToDTO(saved, entry);
                })
                .collect(Collectors.toList());
        
        return created;
    }
    
    public PaymentAllocationDTO updatePaymentAllocation(UUID id, PaymentAllocationDTO dto) {
        PaymentAllocation allocation = paymentAllocationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment allocation not found with id: " + id));
        
        Entry entry = allocation.getEntry();
        
        // Allow updating allocations for any entry by direct allocation ID, regardless of user involvement
        // This enables editing allocations immediately after entry creation, even if the creator
        // is not involved in the entry. This matches the behavior of getPaymentAllocationsByEntry.
        
        // Update person if provided
        if (dto.getPersonId() != null && !dto.getPersonId().equals(allocation.getPerson().getPersonId())) {
            Person newPerson = personRepository.findById(dto.getPersonId())
                    .orElseThrow(() -> new IllegalArgumentException("Person not found: " + dto.getPersonId()));
            allocation.setPerson(newPerson);
        }
        
        // Update other fields
        if (dto.getDescription() != null) {
            allocation.setDescription(dto.getDescription());
        }
        if (dto.getAmount() != null) {
            allocation.setAmount(dto.getAmount());
        }
        if (dto.getNotes() != null) {
            allocation.setNotes(dto.getNotes());
        }
        
        PaymentAllocation updated = paymentAllocationRepository.save(allocation);
        return convertToDTO(updated, entry);
    }
    
    public void deletePaymentAllocation(UUID id) {
        // Check if allocation exists
        if (!paymentAllocationRepository.existsById(id)) {
            throw new IllegalArgumentException("Payment allocation not found with id: " + id);
        }
        
        // Allow deleting allocations for any entry by direct allocation ID, regardless of user involvement
        // This enables deleting allocations immediately after entry creation, even if the creator
        // is not involved in the entry. This matches the behavior of getPaymentAllocationsByEntry.
        
        // Delete all related payment_allocation_payment records first to avoid foreign key constraint violation
        List<PaymentAllocationPayment> linkedPayments = paymentAllocationPaymentRepository.findByAllocation_AllocationId(id);
        if (!linkedPayments.isEmpty()) {
            paymentAllocationPaymentRepository.deleteAll(linkedPayments);
        }
        
        paymentAllocationRepository.deleteById(id);
    }
    
    private PaymentAllocationDTO convertToDTO(PaymentAllocation allocation, Entry entry) {
        PaymentAllocationDTO dto = new PaymentAllocationDTO();
        dto.setAllocationId(allocation.getAllocationId());
        dto.setEntryId(allocation.getEntry().getEntryId());
        dto.setPersonId(allocation.getPerson().getPersonId());
        dto.setPersonName(allocation.getPerson().getFullName());
        dto.setDescription(allocation.getDescription());
        dto.setAmount(allocation.getAmount());
        dto.setNotes(allocation.getNotes());
        
        // Compute status based on payments made for this allocation
        dto.setPaymentAllocationStatus(computeStatus(allocation, entry));
        
        // Compute percentage of total
        if (entry.getAmountBorrowed().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal percentage = allocation.getAmount()
                    .divide(entry.getAmountBorrowed(), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            dto.setPercentageOfTotal(percentage);
        } else {
            dto.setPercentageOfTotal(BigDecimal.ZERO);
        }
        
        return dto;
    }
    
    /**
     * Compute payment allocation status based on payments made
     * UNPAID: No payments made for this allocation
     * PARTIALLY_PAID: Some payments made, but less than allocated amount
     * PAID: Payments made equal or exceed allocated amount, OR entry is marked as PAID (completed)
     */
    private PaymentAllocationStatus computeStatus(PaymentAllocation allocation, Entry entry) {
        // If the entry is marked as PAID (completed), all allocations are considered PAID
        if (entry.getStatus() == com.loantracking.model.PaymentStatus.PAID) {
            return PaymentAllocationStatus.PAID;
        }
        
        // First, try to use linked allocation payments (more precise tracking)
        List<com.loantracking.model.PaymentAllocationPayment> linkedPayments = 
            paymentAllocationPaymentRepository.findByAllocation_AllocationId(allocation.getAllocationId());
        
        if (!linkedPayments.isEmpty()) {
            // Use linked payments - sum amounts specifically allocated to this allocation
            BigDecimal totalPaid = linkedPayments.stream()
                    .map(com.loantracking.model.PaymentAllocationPayment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Compare with allocated amount
            if (totalPaid.compareTo(BigDecimal.ZERO) == 0) {
                return PaymentAllocationStatus.UNPAID;
            } else if (totalPaid.compareTo(allocation.getAmount()) >= 0) {
                return PaymentAllocationStatus.PAID;
            } else {
                return PaymentAllocationStatus.PARTIALLY_PAID;
            }
        }
        
        // Fallback: If no linked payments, use the old method (sum all payments by person for this entry)
        // This maintains backward compatibility with existing payments
        List<PaymentEntry> paymentEntries = paymentEntryRepository.findByEntry_EntryId(entry.getEntryId());
        
        // Calculate total payments made by this person for this entry
        BigDecimal totalPaid = paymentEntries.stream()
                .filter(pe -> pe.getPayment().getPayeePerson().getPersonId().equals(allocation.getPerson().getPersonId()))
                .map(pe -> pe.getPayment().getPaymentAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Compare with allocated amount
        if (totalPaid.compareTo(BigDecimal.ZERO) == 0) {
            return PaymentAllocationStatus.UNPAID;
        } else if (totalPaid.compareTo(allocation.getAmount()) >= 0) {
            return PaymentAllocationStatus.PAID;
        } else {
            return PaymentAllocationStatus.PARTIALLY_PAID;
        }
    }
}

