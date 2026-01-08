package com.loantracking.config;

import com.loantracking.model.Person;
import com.loantracking.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class UserInitializer {
    
    @Autowired
    private PersonRepository personRepository;
    
    @EventListener(ApplicationReadyEvent.class)
    @Async
    public void initializeParentUser() {
        // Wait a bit for database to be ready
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        int maxRetries = 3;
        int retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                initializeUser();
                return; // Success, exit
            } catch (Exception e) {
                retryCount++;
                System.err.println("Warning: Failed to initialize parent user (attempt " + retryCount + "/" + maxRetries + "): " + e.getMessage());
                if (retryCount < maxRetries) {
                    try {
                        Thread.sleep(3000); // Wait 3 seconds before retry
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                } else {
                    System.err.println("Error: Could not initialize parent user after " + maxRetries + " attempts. Application will continue without initialization.");
                    e.printStackTrace();
                }
            }
        }
    }
    
    @Transactional
    private void initializeUser() {
        personRepository.findByFullName(UserConfig.PARENT_USER_NAME)
                .orElseGet(() -> {
                    Person parentUser = new Person();
                    parentUser.setFullName(UserConfig.PARENT_USER_NAME);
                    return personRepository.save(parentUser);
                });
    }
}
