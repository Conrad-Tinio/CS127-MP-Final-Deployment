-- Migration: Fix foreign key constraint to ensure CASCADE DELETE works properly
-- This ensures that when a payment_allocation is deleted, related payment_allocation_payment records are automatically deleted

-- Drop the existing constraint if it exists (using a generated name pattern)
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Find the constraint name for the allocation_id foreign key
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'payment_allocation_payment'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%allocation%';
    
    -- Drop the constraint if found
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payment_allocation_payment DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
    END IF;
END $$;

-- Recreate the constraint with CASCADE DELETE
ALTER TABLE payment_allocation_payment
ADD CONSTRAINT fk_payment_allocation_payment_allocation 
FOREIGN KEY (allocation_id) 
REFERENCES payment_allocation(allocation_id) 
ON DELETE CASCADE;

