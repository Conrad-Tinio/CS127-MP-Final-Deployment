package com.loantracking.repository;

import com.loantracking.model.InstallmentTerm;
import com.loantracking.model.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InstallmentTermRepository extends JpaRepository<InstallmentTerm, UUID> {
    List<InstallmentTerm> findByInstallmentPlan_InstallmentId(UUID installmentId);
    List<InstallmentTerm> findByTermStatus(InstallmentStatus status);
    List<InstallmentTerm> findByInstallmentPlan_InstallmentIdAndTermStatus(UUID installmentId, InstallmentStatus status);
}






