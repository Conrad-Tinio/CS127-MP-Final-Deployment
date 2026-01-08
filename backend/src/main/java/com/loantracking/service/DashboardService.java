package com.loantracking.service;

import com.loantracking.dto.DashboardSummaryDTO;
import com.loantracking.dto.EntryDTO;
import com.loantracking.model.Entry;
import com.loantracking.model.PaymentStatus;
import com.loantracking.model.Person;
import com.loantracking.repository.EntryRepository;
import com.loantracking.repository.PersonRepository;
import com.loantracking.service.PaymentService;
import com.loantracking.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {
    
    @Autowired
    private EntryRepository entryRepository;
    
    @Autowired
    private PersonRepository personRepository;
    
    @Autowired
    private PaymentService paymentService;
    
    private Person getOrCreateCurrentUser() {
        String userName = UserContext.getCurrentUserName();
        return personRepository.findByFullName(userName)
                .orElseGet(() -> {
                    Person user = new Person();
                    user.setFullName(userName);
                    return personRepository.save(user);
                });
    }
    
    public DashboardSummaryDTO getDashboardSummary() {
        Person currentUser = getOrCreateCurrentUser();
        UUID userId = currentUser.getPersonId();
        
        DashboardSummaryDTO summary = new DashboardSummaryDTO();
        
        // Get counts by status (single query)
        List<Object[]> statusCounts = entryRepository.countEntriesByStatusForUser(userId);
        int totalEntries = 0;
        int unpaidCount = 0;
        int partiallyPaidCount = 0;
        int paidCount = 0;
        
        for (Object[] row : statusCounts) {
            PaymentStatus status = (PaymentStatus) row[0];
            Long count = (Long) row[1];
            totalEntries += count.intValue();
            
            switch (status) {
                case UNPAID:
                    unpaidCount = count.intValue();
                    break;
                case PARTIALLY_PAID:
                    partiallyPaidCount = count.intValue();
                    break;
                case PAID:
                    paidCount = count.intValue();
                    break;
            }
        }
        
        summary.setTotalEntries(totalEntries);
        summary.setUnpaidCount(unpaidCount);
        summary.setPartiallyPaidCount(partiallyPaidCount);
        summary.setPaidCount(paidCount);
        
        // Get sum of amounts (single query)
        // Fallback: if aggregation query fails or returns null, calculate from entries
        BigDecimal totalBorrowed = BigDecimal.ZERO;
        BigDecimal totalRemaining = BigDecimal.ZERO;
        
        try {
            Object[] amounts = entryRepository.sumAmountsForUser(userId);
            if (amounts != null && amounts.length >= 2 && amounts[0] != null && amounts[1] != null) {
                totalBorrowed = (BigDecimal) amounts[0];
                totalRemaining = (BigDecimal) amounts[1];
            } else {
                // Fallback: calculate from entries if aggregation query returns null
                List<Entry> userEntries = entryRepository.findEntriesForUser(userId);
                totalBorrowed = userEntries.stream()
                        .map(Entry::getAmountBorrowed)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                totalRemaining = userEntries.stream()
                        .map(Entry::getAmountRemaining)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        } catch (Exception e) {
            // Fallback: calculate from entries if query fails
            List<Entry> userEntries = entryRepository.findEntriesForUser(userId);
            totalBorrowed = userEntries.stream()
                    .map(Entry::getAmountBorrowed)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalRemaining = userEntries.stream()
                    .map(Entry::getAmountRemaining)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        
        summary.setTotalBorrowed(totalBorrowed);
        summary.setTotalRemaining(totalRemaining);
        
        // Get total paid penalties for accurate payment tracking
        BigDecimal totalPaidPenalties = paymentService.getTotalPaidPenalties();
        summary.setTotalPaidPenalties(totalPaidPenalties);
        
        // Get only recent 5 entries (single query with limit)
        List<Entry> recentEntries = entryRepository.findRecentEntriesForUser(userId, PageRequest.of(0, 5));
        List<EntryDTO> recentDTOs = recentEntries.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        summary.setRecentEntries(recentDTOs);
        
        return summary;
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
        
        return dto;
    }
}
