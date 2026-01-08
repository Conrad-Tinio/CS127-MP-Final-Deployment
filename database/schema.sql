-- =====================================================
-- Loan Tracking System - Clean Database Schema
-- Uses VARCHAR instead of ENUM types for JPA compatibility
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS attachment CASCADE;
DROP TABLE IF EXISTS installment_term CASCADE;
DROP TABLE IF EXISTS installment_plan CASCADE;
DROP TABLE IF EXISTS payment_allocation CASCADE;
DROP TABLE IF EXISTS payment_entry CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS entry CASCADE;
DROP TABLE IF EXISTS group_member CASCADE;
DROP TABLE IF EXISTS "group" CASCADE;
DROP TABLE IF EXISTS person CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS installment_status_enum CASCADE;
DROP TYPE IF EXISTS payment_allocation_status_enum CASCADE;
DROP TYPE IF EXISTS payment_frequency_enum CASCADE;

-- =====================================================
-- CORE ENTITIES (Using VARCHAR instead of ENUM)
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

-- GROUP_MEMBER Table
CREATE TABLE group_member (
    group_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    person_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES "group"(group_id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_person FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE,
    CONSTRAINT uk_group_member UNIQUE (group_id, person_id)
);

-- ENTRY Table (VARCHAR for status and transaction_type)
CREATE TABLE entry (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_name VARCHAR(255) NOT NULL,
    description TEXT,
    transaction_type VARCHAR(50) NOT NULL,
    date_borrowed DATE,
    date_fully_paid DATE,
    borrower_person_id UUID,
    borrower_group_id UUID,
    lender_person_id UUID NOT NULL,
    amount_borrowed DECIMAL(15, 2) NOT NULL CHECK (amount_borrowed >= 0),
    amount_remaining DECIMAL(15, 2) NOT NULL CHECK (amount_remaining >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    notes TEXT,
    payment_notes TEXT,
    receipt_or_proof BYTEA,
    reference_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entry_borrower_person FOREIGN KEY (borrower_person_id) REFERENCES person(person_id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_borrower_group FOREIGN KEY (borrower_group_id) REFERENCES "group"(group_id) ON DELETE SET NULL,
    CONSTRAINT fk_entry_lender_person FOREIGN KEY (lender_person_id) REFERENCES person(person_id) ON DELETE RESTRICT
);

-- PAYMENT Table
CREATE TABLE payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_amount DECIMAL(15, 2) NOT NULL CHECK (payment_amount > 0),
    payee_person_id UUID NOT NULL,
    proof BYTEA,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_payee FOREIGN KEY (payee_person_id) REFERENCES person(person_id) ON DELETE RESTRICT
);

-- PAYMENT_ENTRY Table
CREATE TABLE payment_entry (
    payment_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    entry_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_entry_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_entry_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT uk_payment_entry UNIQUE (payment_id, entry_id)
);

-- PAYMENT_ALLOCATION Table
CREATE TABLE payment_allocation (
    allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL,
    person_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_allocation_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_allocation_person FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

-- INSTALLMENT_PLAN Table (VARCHAR for payment_frequency)
CREATE TABLE installment_plan (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    payment_frequency VARCHAR(50) NOT NULL,
    payment_terms INTEGER NOT NULL CHECK (payment_terms > 0),
    amount_per_term DECIMAL(15, 2) NOT NULL CHECK (amount_per_term > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_installment_plan_entry FOREIGN KEY (entry_id) REFERENCES entry(entry_id) ON DELETE CASCADE
);

-- INSTALLMENT_TERM Table (VARCHAR for term_status)
CREATE TABLE installment_term (
    term_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID NOT NULL,
    term_number INTEGER NOT NULL CHECK (term_number > 0),
    due_date DATE NOT NULL,
    term_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
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
    CONSTRAINT fk_attachment_payment FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_person_full_name ON person(full_name);
CREATE INDEX idx_group_name ON "group"(group_name);
CREATE INDEX idx_entry_borrower_person ON entry(borrower_person_id);
CREATE INDEX idx_entry_borrower_group ON entry(borrower_group_id);
CREATE INDEX idx_entry_lender_person ON entry(lender_person_id);
CREATE INDEX idx_entry_status ON entry(status);
CREATE INDEX idx_entry_reference_id ON entry(reference_id);
CREATE INDEX idx_payment_payee ON payment(payee_person_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
CREATE INDEX idx_payment_entry_payment ON payment_entry(payment_id);
CREATE INDEX idx_payment_entry_entry ON payment_entry(entry_id);
CREATE INDEX idx_payment_allocation_entry ON payment_allocation(entry_id);
CREATE INDEX idx_payment_allocation_person ON payment_allocation(person_id);
CREATE INDEX idx_installment_plan_entry ON installment_plan(entry_id);
CREATE INDEX idx_installment_term_installment ON installment_term(installment_id);
CREATE INDEX idx_installment_term_due_date ON installment_term(due_date);
CREATE INDEX idx_attachment_entry ON attachment(entry_id);
CREATE INDEX idx_attachment_payment ON attachment(payment_id);

-- =====================================================
-- TRIGGER for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- Schema Complete - All types use VARCHAR for JPA compatibility
-- =====================================================

