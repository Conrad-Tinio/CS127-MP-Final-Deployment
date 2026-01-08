package com.loantracking.service;

import com.loantracking.dto.PersonDTO;
import com.loantracking.model.Person;
import com.loantracking.repository.PersonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PersonService {
    
    @Autowired
    private PersonRepository personRepository;
    
    public List<PersonDTO> getAllPersons() {
        return personRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public PersonDTO getPersonById(UUID id) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Person not found with id: " + id));
        return convertToDTO(person);
    }
    
    public PersonDTO createPerson(PersonDTO personDTO) {
        Person person = new Person();
        person.setFullName(personDTO.getFullName());
        Person saved = personRepository.save(person);
        return convertToDTO(saved);
    }
    
    public PersonDTO updatePerson(UUID id, PersonDTO personDTO) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Person not found with id: " + id));
        person.setFullName(personDTO.getFullName());
        Person updated = personRepository.save(person);
        return convertToDTO(updated);
    }
    
    public void deletePerson(UUID id) {
        if (!personRepository.existsById(id)) {
            throw new IllegalArgumentException("Person not found with id: " + id);
        }
        personRepository.deleteById(id);
    }
    
    public List<PersonDTO> searchPersons(String name) {
        return personRepository.findByFullNameContainingIgnoreCase(name).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    private PersonDTO convertToDTO(Person person) {
        return new PersonDTO(person.getPersonId(), person.getFullName());
    }
}






