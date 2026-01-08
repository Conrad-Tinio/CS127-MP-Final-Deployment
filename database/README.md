# Database Documentation

> **📌 Note**: This project uses a **shared Supabase database**. The schema is already set up - this documentation is for reference only.

## Quick Info

- **Database Type**: PostgreSQL 15
- **Hosting**: Supabase (shared instance)
- **Access**: Session Pooler (IPv4 compatible)
- **Connection**: All team members use the same database

---

## For New Developers

### You DON'T need to:
❌ Create a Supabase account  
❌ Set up a new database  
❌ Run the schema.sql file  

### You DO need to:
✅ Get credentials from team lead  
✅ Add them to `application.properties`  
✅ Start coding!

**See the main [README.md](../README.md) for setup instructions.**

---

## Database Schema Overview

### Core Tables

#### **person**
Stores all people/contacts in the system.

| Column | Type | Description |
|--------|------|-------------|
| person_id | UUID | Primary key |
| full_name | VARCHAR(255) | Person's full name |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated via trigger |

#### **group**
Stores groups of people (for group expenses).

| Column | Type | Description |
|--------|------|-------------|
| group_id | UUID | Primary key |
| group_name | VARCHAR(255) | Unique group name |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

#### **group_member**
Links people to groups (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| group_member_id | UUID | Primary key |
| group_id | UUID | Foreign key to group |
| person_id | UUID | Foreign key to person |
| created_at | TIMESTAMP | Auto-generated |

**Constraint**: Unique combination of (group_id, person_id)

#### **entry**
Main table for loan/expense entries.

| Column | Type | Description |
|--------|------|-------------|
| entry_id | UUID | Primary key |
| entry_name | VARCHAR(255) | Name of the loan/expense |
| description | TEXT | Optional details |
| transaction_type | VARCHAR(50) | STRAIGHT_EXPENSE, INSTALLMENT_EXPENSE, or GROUP_EXPENSE |
| date_borrowed | DATE | When loan was taken |
| date_fully_paid | DATE | When fully paid (nullable) |
| borrower_person_id | UUID | Person borrower (nullable) |
| borrower_group_id | UUID | Group borrower (nullable) |
| lender_person_id | UUID | Person lender (required) |
| amount_borrowed | DECIMAL(15,2) | Total amount borrowed |
| amount_remaining | DECIMAL(15,2) | Amount still owed |
| status | VARCHAR(50) | UNPAID, PARTIALLY_PAID, or PAID |
| notes | TEXT | General notes |
| payment_notes | TEXT | Payment-specific notes |
| receipt_or_proof | BYTEA | Binary data for receipts |
| reference_id | VARCHAR(255) | Unique auto-generated ID |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

**Note**: Either borrower_person_id OR borrower_group_id must be set, not both.

#### **payment**
Records all payments made.

| Column | Type | Description |
|--------|------|-------------|
| payment_id | UUID | Primary key |
| payment_date | DATE | Date of payment |
| payment_amount | DECIMAL(15,2) | Amount paid |
| payee_person_id | UUID | Person who made the payment |
| proof | BYTEA | Binary data for payment proof |
| notes | TEXT | Payment notes |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

#### **payment_entry**
Links payments to entries (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| payment_entry_id | UUID | Primary key |
| payment_id | UUID | Foreign key to payment |
| entry_id | UUID | Foreign key to entry |
| created_at | TIMESTAMP | Auto-generated |

**Constraint**: Unique combination of (payment_id, entry_id)

#### **payment_allocation**
Breakdown of group expenses per person.

| Column | Type | Description |
|--------|------|-------------|
| allocation_id | UUID | Primary key |
| entry_id | UUID | Foreign key to entry |
| person_id | UUID | Person responsible for this portion |
| description | TEXT | Item name or person's share |
| amount | DECIMAL(15,2) | Amount this person owes |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

**Note**: Status and percentage are computed, not stored.

#### **installment_plan**
Payment schedule for installment-type entries.

| Column | Type | Description |
|--------|------|-------------|
| installment_id | UUID | Primary key |
| entry_id | UUID | Foreign key to entry (unique) |
| start_date | DATE | When first payment is due |
| payment_frequency | VARCHAR(50) | WEEKLY or MONTHLY |
| payment_terms | INTEGER | Number of payment periods |
| amount_per_term | DECIMAL(15,2) | Amount due per period |
| notes | TEXT | Installment notes |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

**Note**: amount_per_term = amount_borrowed / payment_terms

#### **installment_term**
Individual terms/periods in an installment plan.

| Column | Type | Description |
|--------|------|-------------|
| term_id | UUID | Primary key |
| installment_id | UUID | Foreign key to installment_plan |
| term_number | INTEGER | Term sequence (1, 2, 3, ...) |
| due_date | DATE | When this term is due |
| term_status | VARCHAR(50) | NOT_STARTED, UNPAID, PAID, SKIPPED, or DELINQUENT |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

**Constraint**: Unique combination of (installment_id, term_number)

#### **attachment**
File attachments for entries and payments.

| Column | Type | Description |
|--------|------|-------------|
| attachment_id | UUID | Primary key |
| file_path | VARCHAR(500) | Local file path |
| uploaded_location | VARCHAR(500) | Cloud storage URL |
| entry_id | UUID | Link to entry (nullable) |
| payment_id | UUID | Link to payment (nullable) |
| created_at | TIMESTAMP | Auto-generated |

**Note**: Either entry_id OR payment_id must be set, not both.

---

## Key Features

### 1. Automatic Timestamps
All tables have `created_at` and `updated_at` fields maintained by database triggers.

### 2. UUID Primary Keys
All tables use UUIDs for primary keys instead of auto-incrementing integers.

### 3. Computed Fields
These fields are **NOT stored** in the database - calculated by backend:
- Entry status (based on payments)
- Payment allocation status
- Percentage of total paid
- Overall installment status

### 4. Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints prevent invalid data
- Unique constraints prevent duplicates
- Triggers maintain timestamps automatically

### 5. Indexes
Indexes created on:
- All foreign keys
- Frequently searched columns (names, dates, status)
- Unique reference IDs

---

## Data Types Explained

### Why VARCHAR instead of ENUM?

The schema uses `VARCHAR(50)` for status/type fields instead of PostgreSQL ENUMs:
- **JPA Compatibility**: Spring Boot's `@Enumerated(EnumType.STRING)` works seamlessly
- **Flexibility**: Easier to add new values without schema migration
- **No type issues**: Avoids "column is type enum but expression is varchar" errors

### Why BYTEA?

Binary data (receipts, proofs) uses `BYTEA`:
- Native PostgreSQL binary type
- Works with JPA's `byte[]` mapping
- More efficient than Base64 strings

### Why DECIMAL(15,2)?

Monetary values use `DECIMAL(15, 2)`:
- Exact precision (no floating-point errors)
- 15 total digits, 2 after decimal
- Supports amounts up to ₱9,999,999,999,999.99

---

## Important Notes for Developers

### Shared Database Considerations

⚠️ **Everyone sees all data** - this is intentional for collaboration!

**Best Practices:**
1. Label your test data clearly (use your name)
2. Don't delete others' data
3. Coordinate before schema changes
4. Use realistic but fake data
5. Communicate with team

### Making Schema Changes

If schema changes are needed:
1. **Discuss with team first**
2. Update `schema.sql` in this folder
3. Test changes on local database first
4. Coordinate with team lead for production update
5. Notify all developers

### Backup & Recovery

- Supabase provides automatic backups
- Team lead has access to restore points
- Don't rely on production database for critical data

---

## Connection Information

### Credentials Format

```
Host: aws-X-REGION.pooler.supabase.com
Port: 5432
Database: postgres
Username: postgres.PROJECT_REF
Password: [provided by team lead]
```

### Connection String

```
postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-X-REGION.pooler.supabase.com:5432/postgres
```

### JDBC URL (for Spring Boot)

```
jdbc:postgresql://aws-X-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

**Always use Session Pooler** - it's IPv4 compatible!

---

## Schema File

The `schema.sql` file in this directory contains:
- All table definitions
- Indexes for performance
- Triggers for automatic timestamps
- Comments for documentation

**This is for reference only** - the database is already set up.

---

## Troubleshooting

### Can't connect to database

1. Verify credentials are correct
2. Check Supabase project is online
3. Ensure using Session Pooler (not Direct Connection)
4. Contact team lead if still failing

### Data looks wrong

1. Check you're connected to correct database
2. Verify no one else is testing
3. Look at `created_at` timestamps to identify recent changes
4. Check with team if unsure

### Need to reset data

1. **DON'T** run schema.sql (will delete everything!)
2. Delete only your test data
3. Contact team lead if major reset needed

---

## Questions?

- **Setup issues**: See main [README.md](../README.md)
- **API questions**: Check controller code comments
- **Database access**: Contact team lead
- **Schema questions**: Ask in team chat

---

**Remember**: This is a **shared resource**. Respect your teammates' data! 🤝
