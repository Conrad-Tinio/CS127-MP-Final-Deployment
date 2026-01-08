-- =====================================================
-- Loan Tracking System - Database Schema
-- PostgreSQL Database Schema for Supabase
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS attachment CASCADE;
DROP TABLE IF EXISTS installment_term CASCADE;
DROP TABLE IF EXISTS installment_plan CASCADE;
DROP TABLE IF EXISTS payment_allocation CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS entry CASCADE;
DROP TABLE IF EXISTS group_member CASCADE;
DROP TABLE IF EXISTS "group" CASCADE;
DROP TABLE IF EXISTS person CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS installment_status_enum CASCADE;
DROP TYPE IF EXISTS payment_allocation_status_enum CASCADE;
DROP TYPE IF EXISTS payment_frequency_enum CASCADE;

-- =====================================================
-- ENUMERATIONS
-- =====================================================

-- Transaction Type Enumeration
CREATE TYPE transaction_type_enum AS ENUM (
    'STRAIGHT_EXPENSE',
    'INSTALLMENT_EXPENSE',
    'GROUP_EXPENSE'
);

-- Payment Status Enumeration
CREATE TYPE payment_status_enum AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID'
);

-- Installment Status Enumeration
CREATE TYPE installment_status_enum AS ENUM (
    'NOT_STARTED',
    'UNPAID',
    'PAID',
    'SKIPPED',
    'DELINQUENT'
);

-- Payment Allocation Status Enumeration
CREATE TYPE payment_allocation_status_enum AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID'
);

-- Payment Frequency Enumeration
CREATE TYPE payment_frequency_enum AS ENUM (
    'WEEKLY',
    'MONTHLY'
);

-- =====================================================
-- CORE ENTITIES
-- =====================================================

-- PERSON Table
CREATE TABLE person (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GROUP Table
CREATE TABLE "group" (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GROUP_MEMBER Table (Associative Entity)
CREATE TABLE group_member (
    group_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    person_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES "group"(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_person FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE,
    CONSTRAINT uk_group_member UNIQUE (group_id, person_id)
);

-- ENTRY Table
CREATE TABLE entry (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_name VARCHAR(255) NOT NULL,
    description TEXT,
    transaction_type transaction_type_enum NOT NULL,
    date_borrowed DATE,
    date_fully_paid DATE,
    borrower_person_id UUID,
    borrower_group_id UUID,
    lender_person_id UUID NOT NULL,
    amount_borrowed DECIMAL(15, 2) NOT NULL CHECK (amount_borrowed >= 0),
    amount_remaining DECIMAL(15, 2) NOT NULL CHECK (amount_remaining >= 0),
    status payment_status_enum NOT NULL DEFAULT 'UNPAID',
    notes TEXT,
    payment_notes TEXT,
    receipt_or_proof BYTEA, -- BLOB for storing images
    reference_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entry_borrower_person FOREIGN KEY (borrower_person_id) REFERENCES person(person_id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_borrower_group FOREIGN KEY (borrower_group_id) REFERENCES "group"(group_id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_lender_person FOREIGN KEY (lender_person_id) REFERENCES person(person_id) ON DELETE RESTRICT,
    CONSTRAINT chk_entry_borrower CHECK (
        (borrower_person_id IS NOT NULL AND borrower_group_id IS NULL) OR
        (borrower_person_id IS NULL AND borrower_group_id IS NOT NULL)
    ),
    CONSTRAINT chk_entry_installment_group CHECK (
        transaction_type != 'INSTALLMENT_EXPENSE' OR borrower_group_id IS NULL
    )
);

-- PAYMENT Table
CREATE TABLE payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_amount DECIMAL(15, 2) NOT NULL CHECK (payment_amount > 0),
    payee_person_id UUID NOT NULL,
    proof BYTEA, -- BLOB for storing payment proof images
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_payee FOREIGN KEY (payee_person_id) REFERENCES person(person_id) ON DELETE RESTRICT
);

-- PAYMENT_ALLOCATION Table (UPDATED - Status removed, computed instead)
-- Note: Status and Percentage of Total are NOT stored in DB, computed from payments
CREATE TABLE payment_allocation (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    person_id UUID NOT NULL, -- Payee (Person who will pay)
    description TEXT NOT NULL, -- Either the item name, or share by a person
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0), -- Amount to be paid
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_allocation_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocation_person FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

-- Link Payment to Entry (for tracking which payments belong to which entry)
CREATE TABLE payment_entry (
    payment_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    entry_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_entry_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_entry_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT uk_payment_entry UNIQUE (payment_id, entry_id)
);

-- INSTALLMENT_PLAN Table (UPDATED - Status is computed, not stored)
-- Note: Status is NOT stored in DB, computed from InstallmentTerm statuses
-- Note: Payment Amount per Term should be automatically computed: Amount borrowed / Payment terms
CREATE TABLE installment_plan (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL UNIQUE,
    start_date DATE NOT NULL, -- An indicator as to when the first payment should begin
    payment_frequency payment_frequency_enum NOT NULL, -- Configuration as to how often the borrower should pay
    payment_terms INTEGER NOT NULL CHECK (payment_terms > 0), -- Number of terms payable
    amount_per_term DECIMAL(15, 2) NOT NULL CHECK (amount_per_term > 0), -- Should be automatically computed: Amount borrowed / Payment terms
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_installment_plan_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE
);

-- INSTALLMENT_TERM Table
CREATE TABLE installment_term (
    term_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID NOT NULL,
    term_number INTEGER NOT NULL CHECK (term_number > 0),
    due_date DATE NOT NULL,
    term_status installment_status_enum NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_installment_term_installment FOREIGN KEY (installment_id) REFERENCES installment_plan(installment_id) ON DELETE CASCADE,
    CONSTRAINT uk_installment_term UNIQUE (installment_id, term_number)
);

-- ATTACHMENT Table
CREATE TABLE attachment (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path VARCHAR(500),
    uploaded_location VARCHAR(500),
    entry_id UUID,
    payment_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT fk_attachment_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT chk_attachment_reference CHECK (
        (entry_id IS NOT NULL AND payment_id IS NULL) OR
        (entry_id IS NULL AND payment_id IS NOT NULL)
    )
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Person indexes
CREATE INDEX idx_person_full_name ON person(full_name);

-- Group indexes
CREATE INDEX idx_group_name ON "group"(group_name);

-- Entry indexes
CREATE INDEX idx_entry_borrower_person ON entry(borrower_person_id);
CREATE INDEX idx_entry_borrower_group ON entry(borrower_group_id);
CREATE INDEX idx_entry_lender_person ON entry(lender_person_id);
CREATE INDEX idx_entry_transaction_type ON entry(transaction_type);
CREATE INDEX idx_entry_status ON entry(status);
CREATE INDEX idx_entry_reference_id ON entry(reference_id);
CREATE INDEX idx_entry_date_borrowed ON entry(date_borrowed);

-- Payment indexes
CREATE INDEX idx_payment_payee ON payment(payee_person_id);
CREATE INDEX idx_payment_date ON payment(payment_date);

-- Payment Entry link indexes
CREATE INDEX idx_payment_entry_payment ON payment_entry(payment_id);
CREATE INDEX idx_payment_entry_entry ON payment_entry(entry_id);

-- Payment Allocation indexes
CREATE INDEX idx_payment_allocation_entry ON payment_allocation(entry_id);
CREATE INDEX idx_payment_allocation_person ON payment_allocation(person_id);

-- Installment Plan indexes
CREATE INDEX idx_installment_plan_entry ON installment_plan(entry_id);
CREATE INDEX idx_installment_plan_start_date ON installment_plan(start_date);

-- Installment Term indexes
CREATE INDEX idx_installment_term_installment ON installment_term(installment_id);
CREATE INDEX idx_installment_term_due_date ON installment_term(due_date);
CREATE INDEX idx_installment_term_status ON installment_term(term_status);

-- Attachment indexes
CREATE INDEX idx_attachment_entry ON attachment(entry_id);
CREATE INDEX idx_attachment_payment ON attachment(payment_id);

-- =====================================================
-- TRIGGERS for Updated At Timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_person_updated_at BEFORE UPDATE ON person
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_updated_at BEFORE UPDATE ON "group"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entry_updated_at BEFORE UPDATE ON entry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_updated_at BEFORE UPDATE ON payment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_allocation_updated_at BEFORE UPDATE ON payment_allocation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_plan_updated_at BEFORE UPDATE ON installment_plan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_term_updated_at BEFORE UPDATE ON installment_term
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS for Documentation
-- =====================================================

COMMENT ON TABLE person IS 'Stores information about people/contacts in the system';
COMMENT ON TABLE "group" IS 'Stores information about groups of people';
COMMENT ON TABLE group_member IS 'Associative table linking people to groups';
COMMENT ON TABLE entry IS 'Main table storing loan/transaction entries';
COMMENT ON TABLE payment IS 'Stores payment records';
COMMENT ON TABLE payment_allocation IS 'Stores payment breakdown per person for group expenses. Status and Percentage of Total are computed, not stored.';
COMMENT ON TABLE payment_entry IS 'Links payments to entries for tracking which payments belong to which entry';
COMMENT ON TABLE installment_plan IS 'Stores installment plan details for installment-type entries';
COMMENT ON TABLE installment_term IS 'Stores individual terms within an installment plan';
COMMENT ON TABLE attachment IS 'Stores file attachments for entries and payments';

COMMENT ON COLUMN entry.transaction_type IS 'Type of transaction: STRAIGHT_EXPENSE, INSTALLMENT_EXPENSE, or GROUP_EXPENSE';
COMMENT ON COLUMN entry.status IS 'Payment status: UNPAID, PARTIALLY_PAID, or PAID';
COMMENT ON COLUMN entry.reference_id IS 'Auto-generated reference ID format: Borrower Initials + Lender Initials';
COMMENT ON COLUMN installment_term.term_status IS 'Status of installment term: NOT_STARTED, UNPAID, PAID, SKIPPED, or DELINQUENT';
COMMENT ON COLUMN payment_allocation.description IS 'Either the item name, or share by a person';
COMMENT ON COLUMN payment_allocation.person_id IS 'Payee - Person who will pay';
COMMENT ON COLUMN payment_allocation.amount IS 'Amount to be paid';
COMMENT ON COLUMN installment_plan.start_date IS 'An indicator as to when the first payment should begin';
COMMENT ON COLUMN installment_plan.payment_frequency IS 'Configuration as to how often the borrower should pay';
COMMENT ON COLUMN installment_plan.payment_terms IS 'Number of terms payable';
COMMENT ON COLUMN installment_plan.amount_per_term IS 'Should be automatically computed: Amount borrowed / Payment terms';

-- =====================================================
-- Schema Creation Complete
-- =====================================================

