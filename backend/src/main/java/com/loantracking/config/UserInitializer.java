package com.loantracking.config;

import com.loantracking.model.Person;
import com.loantracking.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class UserInitializer {
    
    @Autowired
    private PersonRepository personRepository;
    
    @EventListener(ApplicationReadyEvent.class)
    public void initializeParentUser() {
        try {
            personRepository.findByFullName(UserConfig.PARENT_USER_NAME)
                    .orElseGet(() -> {
                        Person parentUser = new Person();
                        parentUser.setFullName(UserConfig.PARENT_USER_NAME);
                        return personRepository.save(parentUser);
                    });
        } catch (Exception e) {
            // Log error but don't fail application startup
            System.err.println("Warning: Could not initialize parent user: " + e.getMessage());
        }
    }
}
