package com.loantracking.service;

import com.loantracking.dto.*;
import com.loantracking.model.Attachment;
import com.loantracking.model.*;
import com.loantracking.repository.*;
import com.loantracking.util.ReferenceIdGenerator;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional
public class EntryService {
    
    @Autowired
    private EntryRepository entryRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private GroupRepository groupRepository;
    
    @Autowired
    private InstallmentPlanRepository installmentPlanRepository;
    
    @Autowired
    private InstallmentTermRepository installmentTermRepository;
    
    @Autowired
    private PaymentEntryRepository paymentEntryRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;
    
    @Autowired
    private GroupMemberRepository groupMemberRepository;
    
    @Autowired
    private PaymentAllocationRepository paymentAllocationRepository;
    
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
        // Parent user must be either lender or borrower (never both, never neither)
        boolean isLender = entry.getLenderPerson() != null && 
                          entry.getLenderPerson().getPersonId().equals(parentUserId);
        boolean isBorrower = entry.getBorrowerPerson() != null && 
                            entry.getBorrowerPerson().getPersonId().equals(parentUserId);
        
        // For group borrowers, parent user can be the lender OR a member of the borrower group
        if (entry.getBorrowerGroup() != null) {
            if (isLender) {
                return true;
            }
            // Check if user is a member of the borrower group using repository
            boolean isGroupMember = groupMemberRepository.existsByGroup_GroupIdAndPerson_PersonId(
                entry.getBorrowerGroup().getGroupId(), parentUserId);
            return isGroupMember;
        }
        
        // For person borrowers, parent user must be either lender OR borrower (but not both)
        return isLender != isBorrower; // XOR: exactly one must be true
    }
    
    public List<EntryDTO> getAllEntries() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        return entryRepository.findAll().stream()
                .filter(entry -> isEntryRelatedToParentUser(entry, currentUserId))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public EntryDTO getEntryById(UUID id) {
        Entry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + id));
        
        // Allow access to any entry by direct ID, regardless of user involvement
        // This enables viewing entries immediately after creation, even if the creator
        // is not involved in the entry. The getAllEntries() method still filters
        // to only show entries where the user is involved.
        return convertToDTO(entry);
    }
    
    public EntryDTO createEntry(CreateEntryRequest request, MultipartFile proof) {
        // Validate borrower (must be either person or group, not both)
        if (request.getBorrowerPersonId() != null && request.getBorrowerGroupId() != null) {
            throw new IllegalArgumentException("Entry cannot have both borrower person and borrower group");
        }
        if (request.getBorrowerPersonId() == null && request.getBorrowerGroupId() == null) {
            throw new IllegalArgumentException("Entry must have either borrower person or borrower group");
        }
        
        // Validate that borrower and lender are not the same person
        if (request.getBorrowerPersonId() != null && request.getBorrowerPersonId().equals(request.getLenderPersonId())) {
            throw new IllegalArgumentException("Borrower and lender cannot be the same person");
        }
        
        // Validate that lender is not a member of the borrower group
        if (request.getBorrowerGroupId() != null) {
            boolean isLenderInGroup = groupMemberRepository.existsByGroup_GroupIdAndPerson_PersonId(
                request.getBorrowerGroupId(), request.getLenderPersonId());
            if (isLenderInGroup) {
                throw new IllegalArgumentException("Lender cannot be a member of the borrower group");
            }
        }
        
        // Validate installment + group constraint
        if (request.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE && 
            request.getBorrowerGroupId() != null) {
            throw new IllegalArgumentException("Entry cannot be installment type with group borrower");
        }
        
        // Validate payment method: STRAIGHT_EXPENSE only allows CASH
        if (request.getTransactionType() == TransactionType.STRAIGHT_EXPENSE && 
            request.getPaymentMethod() != null && 
            request.getPaymentMethod() != com.loantracking.model.PaymentMethod.CASH) {
            throw new IllegalArgumentException("Straight payment entries only allow CASH as payment method");
        }
        
        Person lender = personRepository.findById(request.getLenderPersonId())
                .orElseThrow(() -> new IllegalArgumentException("Lender not found"));
        
        Entry entry = new Entry();
        entry.setEntryName(request.getEntryName());
        entry.setDescription(request.getDescription());
        entry.setTransactionType(request.getTransactionType());
        entry.setDateBorrowed(request.getDateBorrowed());
        entry.setLenderPerson(lender);
        entry.setAmountBorrowed(request.getAmountBorrowed());
        entry.setAmountRemaining(request.getAmountBorrowed());
        entry.setNotes(request.getNotes());
        entry.setPaymentNotes(request.getPaymentNotes());
        // Set payment method: default to CASH for STRAIGHT_EXPENSE if not provided
        if (request.getPaymentMethod() != null) {
            entry.setPaymentMethod(request.getPaymentMethod());
        } else if (request.getTransactionType() == TransactionType.STRAIGHT_EXPENSE) {
            entry.setPaymentMethod(com.loantracking.model.PaymentMethod.CASH);
        }
        entry.setStatus(PaymentStatus.UNPAID);
        
        // Set borrower
        if (request.getBorrowerPersonId() != null) {
            Person borrower = personRepository.findById(request.getBorrowerPersonId())
                    .orElseThrow(() -> new IllegalArgumentException("Borrower person not found"));
            entry.setBorrowerPerson(borrower);
            entry.setReferenceId(ReferenceIdGenerator.generateReferenceId(borrower, lender));
        } else {
            Group borrowerGroup = groupRepository.findById(request.getBorrowerGroupId())
                    .orElseThrow(() -> new IllegalArgumentException("Borrower group not found"));
            entry.setBorrowerGroup(borrowerGroup);
            entry.setReferenceId(ReferenceIdGenerator.generateReferenceId(borrowerGroup, lender));
        }
        
        // Attach proof if provided
        if (proof != null && !proof.isEmpty()) {
            try {
                entry.setReceiptOrProof(proof.getBytes());
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to read proof file", e);
            }
        }
        
        // Ensure reference ID is unique
        String baseRefId = entry.getReferenceId();
        String refId = baseRefId;
        int counter = 1;
        while (entryRepository.existsByReferenceId(refId)) {
            refId = baseRefId + counter;
            counter++;
        }
        entry.setReferenceId(refId);
        
        Entry saved = entryRepository.save(entry);

        // Save proof to attachment table as well (if provided)
        if (proof != null && !proof.isEmpty()) {
            try {
                Attachment attachment = new Attachment();
                attachment.setEntry(saved);
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
        
        // Create installment plan if needed
        if (request.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE && 
            request.getInstallmentStartDate() != null) {
            try {
                createInstallmentPlan(saved, request);
            } catch (Exception e) {
                // Log the error and rethrow to ensure transaction rollback
                System.err.println("Error creating installment plan: " + e.getMessage());
                e.printStackTrace();
                throw new IllegalArgumentException("Failed to create installment plan: " + e.getMessage(), e);
            }
        }
        
        // Flush to ensure all changes are persisted before returning
        entryRepository.flush();
        
        // Reload the entry to ensure all relationships (like installment plan) are properly loaded
        Entry refreshedEntry = entryRepository.findById(saved.getEntryId())
                .orElseThrow(() -> new IllegalStateException("Entry was not found after creation"));
        
        return convertToDTO(refreshedEntry);
    }
    
    private void createInstallmentPlan(Entry entry, CreateEntryRequest request) {
        if (request.getInstallmentStartDate() == null) {
            throw new IllegalArgumentException("Installment start date is required for installment expenses");
        }
        if (request.getPaymentFrequency() == null || request.getPaymentFrequency().trim().isEmpty()) {
            throw new IllegalArgumentException("Payment frequency is required for installment expenses");
        }
        if (request.getPaymentTerms() == null || request.getPaymentTerms() <= 0) {
            throw new IllegalArgumentException("Payment terms must be greater than 0");
        }
        
        InstallmentPlan plan = new InstallmentPlan();
        plan.setEntry(entry);
        plan.setStartDate(request.getInstallmentStartDate());
        plan.setPaymentFrequency(PaymentFrequency.valueOf(request.getPaymentFrequency().toUpperCase()));
        plan.setPaymentTerms(request.getPaymentTerms());
        
        // Auto-compute amount_per_term: Amount borrowed / Payment terms
        BigDecimal amountPerTerm = entry.getAmountBorrowed()
                .divide(BigDecimal.valueOf(request.getPaymentTerms()), 2, java.math.RoundingMode.HALF_UP);
        plan.setAmountPerTerm(amountPerTerm);
        
        // Store paymentFrequencyDay in notes field as JSON (preserving any existing notes)
        String paymentFrequencyDay = request.getPaymentFrequencyDay();
        if (paymentFrequencyDay != null && !paymentFrequencyDay.trim().isEmpty()) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, String> notesData = new HashMap<>();
                notesData.put("paymentFrequencyDay", paymentFrequencyDay);
                // If there are existing notes, preserve them
                if (request.getNotes() != null && !request.getNotes().trim().isEmpty()) {
                    notesData.put("userNotes", request.getNotes().trim());
                }
                plan.setNotes(objectMapper.writeValueAsString(notesData));
            } catch (Exception e) {
                // Fallback: store as simple format if JSON fails
                plan.setNotes("__PAYMENT_FREQUENCY_DAY__:" + paymentFrequencyDay + "__" + 
                             (request.getNotes() != null ? "\n" + request.getNotes() : ""));
            }
        } else {
            // No paymentFrequencyDay specified, just store user notes if any
            plan.setNotes(request.getNotes());
        }
        
        InstallmentPlan savedPlan = installmentPlanRepository.save(plan);
        
        // Generate installment terms
        generateInstallmentTerms(savedPlan, paymentFrequencyDay);
    }
    
    private void generateInstallmentTerms(InstallmentPlan plan, String paymentFrequencyDay) {
        try {
            LocalDate startDate = plan.getStartDate();
            PaymentFrequency frequency = plan.getPaymentFrequency();
            
            // Extract paymentFrequencyDay from notes if not provided
            if (paymentFrequencyDay == null || paymentFrequencyDay.trim().isEmpty()) {
                paymentFrequencyDay = extractPaymentFrequencyDay(plan.getNotes());
            }
            
            LocalDate currentDate = calculateFirstDueDate(startDate, frequency, paymentFrequencyDay);
            
            for (int i = 1; i <= plan.getPaymentTerms(); i++) {
                InstallmentTerm term = new InstallmentTerm();
                term.setInstallmentPlan(plan);
                term.setTermNumber(i);
                term.setDueDate(currentDate);
                term.setTermStatus(InstallmentStatus.NOT_STARTED);
                installmentTermRepository.save(term);
                
                // Calculate next due date based on frequency and specific day
                if (frequency == PaymentFrequency.WEEKLY) {
                    currentDate = calculateNextWeeklyDate(currentDate, paymentFrequencyDay);
                } else if (frequency == PaymentFrequency.MONTHLY) {
                    currentDate = calculateNextMonthlyDate(currentDate, paymentFrequencyDay);
                }
            }
        } catch (Exception e) {
            System.err.println("Error generating installment terms: " + e.getMessage());
            e.printStackTrace();
            throw new IllegalArgumentException("Failed to generate installment terms: " + e.getMessage(), e);
        }
    }
    
    private String extractPaymentFrequencyDay(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            return null;
        }
        
        // Try to parse as JSON first
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, String> notesData = objectMapper.readValue(notes, new TypeReference<Map<String, String>>() {});
            return notesData.get("paymentFrequencyDay");
        } catch (Exception e) {
            // Fallback: try simple format
            if (notes.contains("__PAYMENT_FREQUENCY_DAY__:")) {
                int start = notes.indexOf("__PAYMENT_FREQUENCY_DAY__:") + "__PAYMENT_FREQUENCY_DAY__:".length();
                int end = notes.indexOf("__", start);
                if (end > start) {
                    return notes.substring(start, end);
                }
            }
        }
        return null;
    }
    
    private LocalDate calculateFirstDueDate(LocalDate startDate, PaymentFrequency frequency, String paymentFrequencyDay) {
        if (paymentFrequencyDay == null || paymentFrequencyDay.trim().isEmpty()) {
            return startDate;
        }
        
        if (frequency == PaymentFrequency.MONTHLY) {
            try {
                int dayOfMonth = Integer.parseInt(paymentFrequencyDay.trim());
                if (dayOfMonth >= 1 && dayOfMonth <= 28) {
                    // Use the specified day of month, but ensure it's valid for the start month
                    int actualDay = Math.min(dayOfMonth, startDate.lengthOfMonth());
                    LocalDate firstDueDate = startDate.withDayOfMonth(actualDay);
                    // If start date is after the target day, move to next month
                    if (startDate.getDayOfMonth() > dayOfMonth) {
                        LocalDate nextMonth = startDate.plusMonths(1);
                        actualDay = Math.min(dayOfMonth, nextMonth.lengthOfMonth());
                        firstDueDate = nextMonth.withDayOfMonth(actualDay);
                    }
                    return firstDueDate;
                }
            } catch (NumberFormatException e) {
                // Invalid day format, use start date
            }
        } else if (frequency == PaymentFrequency.WEEKLY) {
            try {
                DayOfWeek targetDayOfWeek = DayOfWeek.valueOf(paymentFrequencyDay.trim().toUpperCase());
                // Find the next occurrence of the target day of week
                LocalDate firstDueDate = startDate.with(TemporalAdjusters.nextOrSame(targetDayOfWeek));
                return firstDueDate;
            } catch (IllegalArgumentException e) {
                // Invalid day of week, use start date
            }
        }
        
        return startDate;
    }
    
    private LocalDate calculateNextWeeklyDate(LocalDate currentDate, String paymentFrequencyDay) {
        if (paymentFrequencyDay == null || paymentFrequencyDay.trim().isEmpty()) {
            return currentDate.plusWeeks(1);
        }
        
        try {
            DayOfWeek targetDayOfWeek = DayOfWeek.valueOf(paymentFrequencyDay.trim().toUpperCase());
            // Move to next week and find the next occurrence of the target day
            // Use next() instead of nextOrSame() to ensure we get the next week's occurrence
            LocalDate nextWeek = currentDate.plusWeeks(1);
            return nextWeek.with(TemporalAdjusters.nextOrSame(targetDayOfWeek));
        } catch (IllegalArgumentException e) {
            return currentDate.plusWeeks(1);
        }
    }
    
    private LocalDate calculateNextMonthlyDate(LocalDate currentDate, String paymentFrequencyDay) {
        if (paymentFrequencyDay == null || paymentFrequencyDay.trim().isEmpty()) {
            return currentDate.plusMonths(1);
        }
        
        try {
            int dayOfMonth = Integer.parseInt(paymentFrequencyDay.trim());
            if (dayOfMonth >= 1 && dayOfMonth <= 28) {
                LocalDate nextMonth = currentDate.plusMonths(1);
                // Use the specified day, but ensure it's valid for the month
                int actualDay = Math.min(dayOfMonth, nextMonth.lengthOfMonth());
                return nextMonth.withDayOfMonth(actualDay);
            }
        } catch (NumberFormatException e) {
            // Invalid day format, use simple plus months
        }
        
        return currentDate.plusMonths(1);
    }
    
    public EntryDTO updateEntry(UUID id, CreateEntryRequest request) {
        Entry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Entry not found with id: " + id);
        }
        
        entry.setEntryName(request.getEntryName());
        entry.setDescription(request.getDescription());
        entry.setDateBorrowed(request.getDateBorrowed());
        entry.setNotes(request.getNotes());
        entry.setPaymentNotes(request.getPaymentNotes());
        
        Entry updated = entryRepository.save(entry);
        return convertToDTO(updated);
    }
    
    public void deleteEntry(UUID id) {
        Entry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Entry not found with id: " + id);
        }
        
        // Delete all payment_allocation_payment records for allocations of this entry first
        // to avoid foreign key constraint violations
        List<PaymentAllocation> allocations = paymentAllocationRepository.findByEntry_EntryId(id);
        for (PaymentAllocation allocation : allocations) {
            List<PaymentAllocationPayment> linkedPayments = 
                paymentAllocationPaymentRepository.findByAllocation_AllocationId(allocation.getAllocationId());
            if (!linkedPayments.isEmpty()) {
                paymentAllocationPaymentRepository.deleteAll(linkedPayments);
            }
        }
        
        entryRepository.deleteById(id);
    }
    
    public EntryDTO completeEntry(UUID id) {
        Entry entry = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Entry not found with id: " + id));
        
        Person currentUser = getOrCreateCurrentUser();
        if (!isEntryRelatedToParentUser(entry, currentUser.getPersonId())) {
            throw new IllegalArgumentException("Entry not found with id: " + id);
        }
        
        // Mark entry as paid
        entry.setStatus(PaymentStatus.PAID);
        entry.setAmountRemaining(BigDecimal.ZERO);
        entry.setDateFullyPaid(LocalDate.now());
        
        Entry updated = entryRepository.save(entry);
        
        // For installment entries, mark remaining unpaid terms as completed
        if (entry.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE) {
            installmentPlanRepository.findByEntry_EntryId(id).ifPresent(plan -> {
                installmentTermRepository.findByInstallmentPlan_InstallmentId(plan.getInstallmentId())
                    .stream()
                    .filter(term -> term.getTermStatus() == InstallmentStatus.UNPAID || 
                                   term.getTermStatus() == InstallmentStatus.NOT_STARTED ||
                                   term.getTermStatus() == InstallmentStatus.DELINQUENT)
                    .forEach(term -> {
                        // Don't apply penalty when completing early - just mark as completed
                        term.setTermStatus(InstallmentStatus.PAID);
                        installmentTermRepository.save(term);
                    });
            });
        }
        
        return convertToDTO(updated);
    }
    
    /**
     * Auto-complete entries that are fully paid based on payments.
     * This recalculates amountRemaining from actual payments to ensure accuracy.
     * This can be called periodically or after payments are made.
     * @return the count of entries that were auto-completed
     */
    public int autoCompleteEntries() {
        Person currentUser = getOrCreateCurrentUser();
        UUID currentUserId = currentUser.getPersonId();
        
        // Get all entries for the current user that are not already PAID
        List<Entry> candidateEntries = entryRepository.findAll().stream()
            .filter(entry -> isEntryRelatedToParentUser(entry, currentUserId))
            .filter(entry -> entry.getStatus() != PaymentStatus.PAID)
            .collect(Collectors.toList());
        
        int completedCount = 0;
        
        for (Entry entry : candidateEntries) {
            // Recalculate amountRemaining from actual payments to ensure accuracy
            List<PaymentEntry> paymentEntries = paymentEntryRepository.findByEntry_EntryId(entry.getEntryId());
            
            // Calculate total paid from all payments for this entry
            BigDecimal totalPaid = paymentEntries.stream()
                .map(pe -> pe.getPayment().getPaymentAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Recalculate remaining amount
            BigDecimal calculatedRemaining = entry.getAmountBorrowed().subtract(totalPaid);
            
            // Ensure remaining is not negative
            if (calculatedRemaining.compareTo(BigDecimal.ZERO) < 0) {
                calculatedRemaining = BigDecimal.ZERO;
            }
            
            // Update the stored amountRemaining with the recalculated value
            entry.setAmountRemaining(calculatedRemaining);
            
            // If remaining is zero or less, mark as PAID
            if (calculatedRemaining.compareTo(BigDecimal.ZERO) <= 0) {
                entry.setStatus(PaymentStatus.PAID);
                if (entry.getDateFullyPaid() == null) {
                    entry.setDateFullyPaid(LocalDate.now());
                }
                completedCount++;
            } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0 && 
                      totalPaid.compareTo(entry.getAmountBorrowed()) < 0) {
                // If some payment has been made but not fully paid, update to PARTIALLY_PAID
                entry.setStatus(PaymentStatus.PARTIALLY_PAID);
            }
            
            // Save the entry with updated values
            entryRepository.save(entry);
        }
        
        return completedCount;
    }
    
    private EntryDTO convertToDTO(Entry entry) {
        EntryDTO dto = new EntryDTO();
        dto.setEntryId(entry.getEntryId());
        dto.setEntryName(entry.getEntryName());
        dto.setDescription(entry.getDescription());
        dto.setTransactionType(entry.getTransactionType());
        dto.setDateBorrowed(entry.getDateBorrowed());
        dto.setDateFullyPaid(entry.getDateFullyPaid());
        dto.setAmountBorrowed(entry.getAmountBorrowed());
        dto.setAmountRemaining(entry.getAmountRemaining());
        dto.setStatus(entry.getStatus());
        dto.setPaymentMethod(entry.getPaymentMethod());
        dto.setNotes(entry.getNotes());
        dto.setPaymentNotes(entry.getPaymentNotes());
        dto.setReferenceId(entry.getReferenceId());
        
        if (entry.getBorrowerPerson() != null) {
            dto.setBorrowerPersonId(entry.getBorrowerPerson().getPersonId());
            dto.setBorrowerPersonName(entry.getBorrowerPerson().getFullName());
        }
        
        if (entry.getBorrowerGroup() != null) {
            dto.setBorrowerGroupId(entry.getBorrowerGroup().getGroupId());
            dto.setBorrowerGroupName(entry.getBorrowerGroup().getGroupName());
        }
        
        if (entry.getLenderPerson() != null) {
            dto.setLenderPersonId(entry.getLenderPerson().getPersonId());
            dto.setLenderPersonName(entry.getLenderPerson().getFullName());
        }
        
        // Load installment plan if exists
        if (entry.getTransactionType() == TransactionType.INSTALLMENT_EXPENSE) {
            installmentPlanRepository.findByEntry_EntryId(entry.getEntryId())
                    .ifPresent(plan -> dto.setInstallmentPlan(convertInstallmentPlanToDTO(plan)));
        }
        
        // Load payments for this entry
        List<com.loantracking.dto.PaymentDTO> payments = paymentEntryRepository
                .findByEntry_EntryId(entry.getEntryId()).stream()
                .map(pe -> {
                    com.loantracking.dto.PaymentDTO paymentDTO = new com.loantracking.dto.PaymentDTO();
                    paymentDTO.setPaymentId(pe.getPayment().getPaymentId());
                    paymentDTO.setPaymentDate(pe.getPayment().getPaymentDate());
                    paymentDTO.setPaymentAmount(pe.getPayment().getPaymentAmount());
                    if (pe.getPayment().getPayeePerson() != null) {
                        paymentDTO.setPayeePersonId(pe.getPayment().getPayeePerson().getPersonId());
                        paymentDTO.setPayeePersonName(pe.getPayment().getPayeePerson().getFullName());
                    }
                    paymentDTO.setNotes(pe.getPayment().getNotes());
                    return paymentDTO;
                })
                .collect(Collectors.toList());
        dto.setPayments(payments);
        
        return dto;
    }
    
    private InstallmentPlanDTO convertInstallmentPlanToDTO(InstallmentPlan plan) {
        InstallmentPlanDTO dto = new InstallmentPlanDTO();
        dto.setInstallmentId(plan.getInstallmentId());
        dto.setEntryId(plan.getEntry().getEntryId());
        dto.setStartDate(plan.getStartDate());
        dto.setPaymentFrequency(plan.getPaymentFrequency());
        dto.setPaymentTerms(plan.getPaymentTerms());
        dto.setAmountPerTerm(plan.getAmountPerTerm());
        
        // Extract paymentFrequencyDay and user notes from notes field
        String paymentFrequencyDay = extractPaymentFrequencyDay(plan.getNotes());
        dto.setPaymentFrequencyDay(paymentFrequencyDay);
        
        // Extract user notes if they exist
        String userNotes = extractUserNotes(plan.getNotes());
        dto.setNotes(userNotes);
        
        List<InstallmentTermDTO> terms = installmentTermRepository
                .findByInstallmentPlan_InstallmentId(plan.getInstallmentId()).stream()
                .map(term -> {
                    InstallmentTermDTO termDTO = new InstallmentTermDTO();
                    termDTO.setTermId(term.getTermId());
                    termDTO.setInstallmentId(term.getInstallmentPlan().getInstallmentId());
                    termDTO.setTermNumber(term.getTermNumber());
                    termDTO.setDueDate(term.getDueDate());
                    termDTO.setTermStatus(term.getTermStatus());
                    termDTO.setPenaltyApplied(term.getPenaltyApplied());
                    return termDTO;
                })
                .collect(Collectors.toList());
        dto.setInstallmentTerms(terms);
        
        return dto;
    }
    
    private String extractUserNotes(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            return null;
        }
        
        // Try to parse as JSON first
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, String> notesData = objectMapper.readValue(notes, new TypeReference<Map<String, String>>() {});
            return notesData.get("userNotes");
        } catch (Exception e) {
            // Fallback: try simple format
            if (notes.contains("__PAYMENT_FREQUENCY_DAY__:")) {
                int end = notes.indexOf("__", notes.indexOf("__PAYMENT_FREQUENCY_DAY__:") + "__PAYMENT_FREQUENCY_DAY__:".length());
                if (end > 0 && end + 2 < notes.length()) {
                    String remaining = notes.substring(end + 2).trim();
                    return remaining.isEmpty() ? null : remaining;
                }
            }
            // If no special format, return as-is (for backward compatibility)
            return notes;
        }
    }
}

