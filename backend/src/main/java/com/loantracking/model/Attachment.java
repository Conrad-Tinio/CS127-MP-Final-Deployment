package com.loantracking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "attachment")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "attachment_id")
    private UUID attachmentId;
    
    @Column(name = "file_path", length = 500)
    private String filePath;
    
    @Column(name = "uploaded_location", length = 500)
    private String uploadedLocation;

    @Column(name = "original_filename", length = 500)
    private String originalFilename;

    @Column(name = "content_type", length = 200)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Lob
    @Column(name = "file_data")
    private byte[] fileData;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id")
    private Entry entry;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}






