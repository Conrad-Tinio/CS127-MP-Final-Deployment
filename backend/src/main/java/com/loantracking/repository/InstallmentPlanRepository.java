package com.loantracking.repository;

import com.loantracking.model.InstallmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstallmentPlanRepository extends JpaRepository<InstallmentPlan, UUID> {
    Optional<InstallmentPlan> findByEntry_EntryId(UUID entryId);
}






