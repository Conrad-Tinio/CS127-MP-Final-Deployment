package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_member", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_id", "person_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupMember {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "group_member_id")
    private UUID groupMemberId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}






