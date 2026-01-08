-- Migration: Add payment_allocation_payment table to link payments to specific allocations
-- This allows tracking individual member payments for their allocated amounts in group expenses

-- Create the linking table
CREATE TABLE IF NOT EXISTS payment_allocation_payment (
    payment_allocation_payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    allocation_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0), -- Amount of payment applied to this allocation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_allocation_payment_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocation_payment_allocation FOREIGN KEY (allocation_id) REFERENCES payment_allocation(allocation_id) ON DELETE CASCADE,
    CONSTRAINT uk_payment_allocation_payment UNIQUE (payment_id, allocation_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment_allocation ON payment_allocation_payment(allocation_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment_payment ON payment_allocation_payment(payment_id);

