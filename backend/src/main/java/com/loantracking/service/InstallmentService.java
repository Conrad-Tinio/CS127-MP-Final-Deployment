package com.loantracking.service;

import com.loantracking.dto.InstallmentTermDTO;
import com.loantracking.model.Entry;
import com.loantracking.model.InstallmentPlan;
import com.loantracking.model.InstallmentStatus;
import com.loantracking.model.InstallmentTerm;
import com.loantracking.model.Person;
import com.loantracking.model.TransactionType;
import com.loantracking.repository.EntryRepository;
import com.loantracking.repository.InstallmentPlanRepository;
import com.loantracking.repository.InstallmentTermRepository;
import com.loantracking.repository.PersonRepository;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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
    
    @Autowired
    private InstallmentPlanRepository installmentPlanRepository;
    
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
    
    /**
     * Updates term status. If paying a DELINQUENT term, automatically calculates and applies late fee.
     */
    public InstallmentTermDTO updateTermStatus(UUID termId, InstallmentStatus status) {
        InstallmentTerm term = installmentTermRepository.findById(termId)
                .orElseThrow(() -> new IllegalArgumentException("Installment term not found with id: " + termId));
        
        validateTermAccess(term);
        
        // If paying a DELINQUENT term, calculate and apply late fee
        if (status == InstallmentStatus.PAID && term.getTermStatus() == InstallmentStatus.DELINQUENT) {
            InstallmentPlan plan = term.getInstallmentPlan();
            BigDecimal termAmount = plan.getAmountPerTerm();
            BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
            BigDecimal penalty = percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
            
            // Set penalty if not already set
            if (term.getPenaltyApplied() == null || term.getPenaltyApplied().compareTo(BigDecimal.ZERO) == 0) {
                term.setPenaltyApplied(penalty);
                
                // Add penalty to entry's remaining balance
                Entry entry = plan.getEntry();
                BigDecimal newRemaining = entry.getAmountRemaining().add(penalty);
                entry.setAmountRemaining(newRemaining);
                entryRepository.save(entry);
            }
        }
        
        term.setTermStatus(status);
        InstallmentTerm updated = installmentTermRepository.save(term);
        
        return convertToDTO(updated);
    }
    
    /**
     * Calculates the late fee that would be applied when paying a delinquent term.
     * Used for preview purposes in the frontend.
     */
    public BigDecimal calculateDelinquentLateFee(UUID termId) {
        InstallmentTerm term = installmentTermRepository.findById(termId)
                .orElseThrow(() -> new IllegalArgumentException("Installment term not found with id: " + termId));
        
        // Only calculate if term is delinquent
        if (term.getTermStatus() != InstallmentStatus.DELINQUENT) {
            return BigDecimal.ZERO;
        }
        
        InstallmentPlan plan = term.getInstallmentPlan();
        BigDecimal termAmount = plan.getAmountPerTerm();
        BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
        return percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
    }
    
    /**
     * Updates terms to DELINQUENT status if:
     * - The term's due date has lapsed (is before today)
     * - The term status is UNPAID or NOT_STARTED (term has not been paid)
     * - The term is not already PAID or SKIPPED
     * 
     * According to business rules: "If the borrower has not paid for a set term, and that term has lapsed"
     */
    public void updateDelinquentTerms() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        LocalDate today = LocalDate.now();
        installmentTermRepository.findAll().stream()
                .filter(term -> {
                    Entry entry = term.getInstallmentPlan().getEntry();
                    return isEntryRelatedToParentUser(entry, currentUserId);
                })
                .filter(term -> {
                    // Term has lapsed only if due date is strictly before today
                    boolean hasLapsed = term.getDueDate().isBefore(today);
                    
                    // Term hasn't been paid if status is UNPAID or NOT_STARTED
                    boolean notPaid = term.getTermStatus() == InstallmentStatus.UNPAID || 
                                     term.getTermStatus() == InstallmentStatus.NOT_STARTED;
                    
                    // Don't update terms that are already PAID or SKIPPED
                    boolean canBecomeDelinquent = term.getTermStatus() != InstallmentStatus.PAID && 
                                                  term.getTermStatus() != InstallmentStatus.SKIPPED;
                    
                    return hasLapsed && notPaid && canBecomeDelinquent;
                })
                .forEach(term -> {
                    term.setTermStatus(InstallmentStatus.DELINQUENT);
                    
                    // Calculate and apply late fee when term becomes DELINQUENT
                    // Only apply if penalty hasn't been set yet
                    if (term.getPenaltyApplied() == null || term.getPenaltyApplied().compareTo(BigDecimal.ZERO) == 0) {
                        InstallmentPlan plan = term.getInstallmentPlan();
                        Entry entry = plan.getEntry();
                        BigDecimal termAmount = plan.getAmountPerTerm();
                        BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
                        BigDecimal penalty = percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
                        
                        term.setPenaltyApplied(penalty);
                        
                        // Add penalty to entry's remaining balance
                        BigDecimal newRemaining = entry.getAmountRemaining().add(penalty);
                        entry.setAmountRemaining(newRemaining);
                        entryRepository.save(entry);
                    }
                    
                    installmentTermRepository.save(term);
                });
    }
    
    /**
     * Updates delinquent terms for a specific entry.
     * Useful when loading a single entry or after making a payment.
     * This method updates delinquent status regardless of user relationship,
     * as it's called when viewing entries (which may be accessible to any user).
     */
    public void updateDelinquentTermsForEntry(UUID entryId) {
        Entry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + entryId));
        
        // Only update if entry has installment plan
        if (entry.getTransactionType() != TransactionType.INSTALLMENT_EXPENSE) {
            return;
        }
        
        installmentPlanRepository.findByEntry_EntryId(entryId).ifPresent(plan -> {
            LocalDate today = LocalDate.now();
            boolean updated = false;
            
            List<InstallmentTerm> termsToUpdate = installmentTermRepository
                    .findByInstallmentPlan_InstallmentId(plan.getInstallmentId())
                    .stream()
                    .filter(term -> {
                        // Term has lapsed only if due date is strictly before today
                        boolean hasLapsed = term.getDueDate().isBefore(today);
                        
                        // Term hasn't been paid if status is UNPAID or NOT_STARTED
                        boolean notPaid = term.getTermStatus() == InstallmentStatus.UNPAID || 
                                         term.getTermStatus() == InstallmentStatus.NOT_STARTED;
                        
                        // Don't update terms that are already PAID or SKIPPED
                        boolean canBecomeDelinquent = term.getTermStatus() != InstallmentStatus.PAID && 
                                                      term.getTermStatus() != InstallmentStatus.SKIPPED;
                        
                        return hasLapsed && notPaid && canBecomeDelinquent;
                    })
                    .collect(Collectors.toList());
            
            // Update all eligible terms
            for (InstallmentTerm term : termsToUpdate) {
                term.setTermStatus(InstallmentStatus.DELINQUENT);
                
                // Calculate and apply late fee when term becomes DELINQUENT
                // Only apply if penalty hasn't been set yet
                if (term.getPenaltyApplied() == null || term.getPenaltyApplied().compareTo(BigDecimal.ZERO) == 0) {
                    BigDecimal termAmount = plan.getAmountPerTerm();
                    BigDecimal percentageFee = termAmount.multiply(LATE_FEE_PERCENTAGE).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal penalty = percentageFee.compareTo(MINIMUM_LATE_FEE) > 0 ? percentageFee : MINIMUM_LATE_FEE;
                    
                    term.setPenaltyApplied(penalty);
                    
                    // Add penalty to entry's remaining balance
                    BigDecimal newRemaining = entry.getAmountRemaining().add(penalty);
                    entry.setAmountRemaining(newRemaining);
                }
                
                installmentTermRepository.save(term);
                updated = true;
            }
            
            // Save entry if any penalties were applied
            if (updated) {
                entryRepository.save(entry);
                installmentTermRepository.flush();
            }
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






