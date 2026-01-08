-- =====================================================
-- Supabase Migration Fix Script
-- Run this to fix the payment_allocation_status error
-- =====================================================

-- Step 1: Drop the index that references the removed column (if it exists)
DROP INDEX IF EXISTS idx_payment_allocation_status;

-- Step 2: Drop the column if it still exists (in case migration was partial)
ALTER TABLE payment_allocation DROP COLUMN IF EXISTS payment_allocation_status;

-- Step 3: Ensure description is NOT NULL (as per new requirements)
-- First, update any NULL descriptions to empty string if needed
UPDATE payment_allocation SET description = '' WHERE description IS NULL;

-- Then make it NOT NULL
ALTER TABLE payment_allocation ALTER COLUMN description SET NOT NULL;

-- Step 4: Create payment_entry table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_entry (
    payment_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    entry_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_entry_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_entry_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT uk_payment_entry UNIQUE (payment_id, entry_id)
);

-- Step 5: Create indexes for payment_entry if they don't exist
CREATE INDEX IF NOT EXISTS idx_payment_entry_payment ON payment_entry(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_entry_entry ON payment_entry(entry_id);

-- Step 6: Add helpful comments
COMMENT ON TABLE payment_allocation IS 'Stores payment breakdown per person for group expenses. Status and Percentage of Total are computed, not stored.';
COMMENT ON COLUMN payment_allocation.description IS 'Either the item name, or share by a person';
COMMENT ON COLUMN payment_allocation.person_id IS 'Payee - Person who will pay';
COMMENT ON COLUMN payment_allocation.amount IS 'Amount to be paid';

COMMENT ON TABLE payment_entry IS 'Links payments to entries for tracking which payments belong to which entry';

-- Verification query (run this to check the structure)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'payment_allocation'
-- ORDER BY ordinal_position;


