package com.loantracking.config;

import com.loantracking.model.Person;
import com.loantracking.repository.PersonRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UserInitializer {
    
    @Autowired
    private PersonRepository personRepository;
    
    @PostConstruct
    public void initializeParentUser() {
        personRepository.findByFullName(UserConfig.PARENT_USER_NAME)
                .orElseGet(() -> {
                    Person parentUser = new Person();
                    parentUser.setFullName(UserConfig.PARENT_USER_NAME);
                    return personRepository.save(parentUser);
                });
    }
}
