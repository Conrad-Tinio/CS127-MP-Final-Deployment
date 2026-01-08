package com.loantracking.util;

import com.loantracking.model.Person;
import com.loantracking.model.Group;

public class ReferenceIdGenerator {
    
    public static String generateReferenceId(Person borrower, Person lender) {
        String borrowerInitials = extractInitials(borrower.getFullName());
        String lenderInitials = extractInitials(lender.getFullName());
        return borrowerInitials + lenderInitials;
    }
    
    public static String generateReferenceId(Group borrowerGroup, Person lender) {
        String groupName = borrowerGroup.getGroupName().toUpperCase().replaceAll("[^A-Z0-9]", "");
        String lenderInitials = extractInitials(lender.getFullName());
        // Use first 3-5 characters of group name
        String groupPrefix = groupName.length() > 5 ? groupName.substring(0, 5) : groupName;
        return groupPrefix + lenderInitials;
    }
    
    private static String extractInitials(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            return "UNK";
        }
        
        // Handle format: "Surname, First Name, Initial" or "First Name Last Name"
        String[] parts = fullName.split(",");
        StringBuilder initials = new StringBuilder();
        
        if (parts.length >= 2) {
            // Format: "Surname, First Name, Initial"
            String surname = parts[0].trim();
            String firstName = parts[1].trim();
            
            // Get first letter of surname and first name
            if (!surname.isEmpty()) {
                initials.append(surname.charAt(0));
            }
            if (!firstName.isEmpty()) {
                initials.append(firstName.charAt(0));
            }
            if (parts.length >= 3 && !parts[2].trim().isEmpty()) {
                initials.append(parts[2].trim().charAt(0));
            }
        } else {
            // Format: "First Name Last Name"
            String[] nameParts = fullName.trim().split("\\s+");
            for (String part : nameParts) {
                if (!part.isEmpty()) {
                    initials.append(part.charAt(0));
                }
            }
        }
        
        return initials.length() > 0 ? initials.toString().toUpperCase() : "UNK";
    }
}






