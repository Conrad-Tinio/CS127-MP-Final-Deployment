package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "person")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Person {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "person_id")
    private UUID personId;
    
    @Column(name = "full_name", nullable = false)
    private String fullName;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GroupMember> groupMembers;
    
    @OneToMany(mappedBy = "borrowerPerson", cascade = CascadeType.ALL)
    private List<Entry> entriesAsBorrower;
    
    @OneToMany(mappedBy = "lenderPerson", cascade = CascadeType.ALL)
    private List<Entry> entriesAsLender;
    
    @OneToMany(mappedBy = "payeePerson", cascade = CascadeType.ALL)
    private List<Payment> payments;
    
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL)
    private List<PaymentAllocation> paymentAllocations;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}






