package com.loantracking.controller;

import com.loantracking.dto.PersonDTO;
import com.loantracking.service.PersonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/persons")
@CrossOrigin(origins = "http://localhost:5173")
public class PersonController {
    
    @Autowired
    private PersonService personService;
    
    @GetMapping
    public ResponseEntity<List<PersonDTO>> getAllPersons() {
        return ResponseEntity.ok(personService.getAllPersons());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<PersonDTO> getPersonById(@PathVariable UUID id) {
        return ResponseEntity.ok(personService.getPersonById(id));
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<PersonDTO>> searchPersons(@RequestParam String name) {
        return ResponseEntity.ok(personService.searchPersons(name));
    }
    
    @PostMapping
    public ResponseEntity<PersonDTO> createPerson(@RequestBody PersonDTO personDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(personService.createPerson(personDTO));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<PersonDTO> updatePerson(@PathVariable UUID id, @RequestBody PersonDTO personDTO) {
        return ResponseEntity.ok(personService.updatePerson(id, personDTO));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable UUID id) {
        personService.deletePerson(id);
        return ResponseEntity.noContent().build();
    }
}






