package com.loantracking.service;

import com.loantracking.dto.InstallmentTermDTO;
import com.loantracking.model.Entry;
import com.loantracking.model.InstallmentPlan;
import com.loantracking.model.InstallmentStatus;
import com.loantracking.model.InstallmentTerm;
import com.loantracking.model.Person;
import com.loantracking.repository.EntryRepository;
import com.loantracking.repository.InstallmentTermRepository;
import com.loantracking.repository.PersonRepository;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

@Service
@Transactional
public class InstallmentService {
    
    // Late fee configuration
    private static final BigDecimal LATE_FEE_PERCENTAGE = new BigDecimal("0.05"); // 5% of term amount
    private static final BigDecimal MINIMUM_LATE_FEE = new BigDecimal("50.00"); // Minimum ₱50 late fee
    
    @Autowired
    private InstallmentTermRepository installmentTermRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private EntryRepository entryRepository;
    
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
    
    private void validateTermAccess(InstallmentTerm term) {
        Person currentUser = getOrCreateCurrentUser();
        Entry entry = term.getInstallmentPlan().getEntry();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Installment term not found");
        }
    }
    
    public InstallmentTermDTO skipTerm(UUID termId) {
        InstallmentTerm term = installmentTermRepository.findById(termId)
                .orElseThrow(() -> new IllegalArgumentException("Installment term not found with id: " + termId));
        
        validateTermAccess(term);
        
        // Calculate late fee penalty
        InstallmentPlan plan = term.getInstallmentPlan();
        BigDecimal termAmount = plan.getAmountPerTerm();
        BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal penalty = percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
        
        // Update term with penalty and status
        term.setTermStatus(InstallmentStatus.SKIPPED);
        term.setPenaltyApplied(penalty);
        InstallmentTerm updated = installmentTermRepository.save(term);
        
        // Add penalty to entry's remaining balance
        Entry entry = plan.getEntry();
        BigDecimal newRemaining = entry.getAmountRemaining().add(penalty);
        entry.setAmountRemaining(newRemaining);
        entryRepository.save(entry);
        
        return convertToDTO(updated);
    }
    
    /**
     * Calculate the penalty that would be applied if a term is skipped.
     * Used for preview purposes in the frontend.
     */
    public BigDecimal calculateSkipPenalty(UUID termId) {
        InstallmentTerm term = installmentTermRepository.findById(termId)
                .orElseThrow(() -> new IllegalArgumentException("Installment term not found with id: " + termId));
        
        InstallmentPlan plan = term.getInstallmentPlan();
        BigDecimal termAmount = plan.getAmountPerTerm();
        BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
        return percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
    }
    
    public InstallmentTermDTO updateTermStatus(UUID termId, InstallmentStatus status) {
        InstallmentTerm term = installmentTermRepository.findById(termId)
                .orElseThrow(() -> new IllegalArgumentException("Installment term not found with id: " + termId));
        
        validateTermAccess(term);
        
        term.setTermStatus(status);
        InstallmentTerm updated = installmentTermRepository.save(term);
        
        return convertToDTO(updated);
    }
    
    public void updateDelinquentTerms() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        LocalDate today = LocalDate.now();
        installmentTermRepository.findAll().stream()
                .filter(term -> {
                    Entry entry = term.getInstallmentPlan().getEntry();
                    return isEntryRelatedToParentUser(entry, currentUserId);
                })
                .filter(term -> term.getDueDate().isBefore(today) && 
                               term.getTermStatus() == InstallmentStatus.UNPAID)
                .forEach(term -> {
                    term.setTermStatus(InstallmentStatus.DELINQUENT);
                    installmentTermRepository.save(term);
                });
    }
    
    private InstallmentTermDTO convertToDTO(InstallmentTerm term) {
        InstallmentTermDTO dto = new InstallmentTermDTO();
        dto.setTermId(term.getTermId());
        dto.setInstallmentId(term.getInstallmentPlan().getInstallmentId());
        dto.setTermNumber(term.getTermNumber());
        dto.setDueDate(term.getDueDate());
        dto.setTermStatus(term.getTermStatus());
        dto.setPenaltyApplied(term.getPenaltyApplied());
        return dto;
    }
}






