# Loan Tracking System - Project Architecture & Setup Guide

This document provides a comprehensive overview of the Loan Tracking System architecture, covering database setup, backend configuration, frontend setup, and API documentation.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Database Setup (Supabase PostgreSQL)](#database-setup-supabase-postgresql)
4. [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
5. [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
6. [API Structure & Endpoints](#api-structure--endpoints)
7. [How Components Work Together](#how-components-work-together)
8. [Key Features & Architecture Decisions](#key-features--architecture-decisions)

---

## Project Overview

The Loan Tracking System is a full-stack web application designed to track loans, expenses, payments, and installments. It uses a **three-tier architecture**:

- **Frontend**: React + TypeScript + Vite (Port 5173)
- **Backend**: Spring Boot REST API (Port 8080)
- **Database**: Supabase PostgreSQL (Hosted on AWS)

### Project Structure

```
CS127-MP/
├── backend/              # Spring Boot application
│   ├── src/main/java/
│   │   └── com/loantracking/
│   │       ├── config/       # Configuration classes
│   │       ├── controller/   # REST API endpoints
│   │       ├── dto/          # Data Transfer Objects
│   │       ├── model/        # JPA Entity models
│   │       ├── repository/   # Data access layer
│   │       ├── service/      # Business logic
│   │       └── util/         # Utility classes
│   └── src/main/resources/
│       └── application.properties  # Backend configuration
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts (UserContext)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── vite.config.ts    # Vite configuration
└── database/             # Database schema files
    └── database_schema_updated.sql
```

---

## Technology Stack

### Backend Technologies
- **Java 21**: Programming language
- **Spring Boot 3.2.0**: Framework for building REST APIs
- **Spring Data JPA**: Database access layer
- **PostgreSQL Driver**: Database connectivity
- **Hibernate**: ORM (Object-Relational Mapping)
- **Lombok**: Reduces boilerplate code
- **Maven**: Dependency management and build tool

### Frontend Technologies
- **React 18.2.0**: UI library
- **TypeScript 5.2.2**: Type-safe JavaScript
- **Vite 5.0.8**: Build tool and dev server
- **React Router DOM 6.20.0**: Client-side routing
- **Axios 1.6.2**: HTTP client for API calls
- **Tailwind CSS 3.3.6**: Utility-first CSS framework
- **Lucide React**: Icon library
- **date-fns**: Date manipulation library

### Database
- **Supabase PostgreSQL**: Cloud-hosted PostgreSQL database
- **Connection Pooling**: Supabase Session Pooler for connection management

---

## Database Setup (Supabase PostgreSQL)

### Overview

The application uses **Supabase** as a cloud-hosted PostgreSQL database. Supabase provides:
- Managed PostgreSQL database
- Connection pooling via Session Pooler
- SSL-encrypted connections
- Automatic backups

### Connection Details

The database connection is configured in `backend/src/main/resources/application.properties`:

```properties
# Database Configuration (Supabase PostgreSQL)
spring.datasource.url=jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
spring.datasource.username=postgres.pkmcmbnrxioxwtprlgyk
spring.datasource.password=cs127loan!!
spring.datasource.driver-class-name=org.postgresql.Driver
```

**Key Points:**
- Uses Supabase **Session Pooler** (pooler.supabase.com) for connection management
- Port **5432** for PostgreSQL
- **SSL mode is required** (`sslmode=require`)
- Connection pooling configured with HikariCP (Spring Boot's default)

### Connection Pool Configuration

Spring Boot uses **HikariCP** for connection pooling, optimized for Supabase:

```properties
# Connection pool settings - Supabase pooler recommends smaller pool sizes
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.maximum-pool-size=2
spring.datasource.hikari.minimum-idle=1
spring.datasource.hikari.max-lifetime=300000
spring.datasource.hikari.idle-timeout=300000
```

**Why small pool sizes?**
- Supabase Session Pooler already manages connections at the database level
- Smaller pools prevent connection exhaustion
- Recommended by Supabase for optimal performance

### Database Schema

The database schema is defined in `database/database_schema_updated.sql`. Key entities include:

#### Core Tables

1. **person** - Stores people/contacts
   - `person_id` (UUID, Primary Key)
   - `full_name` (VARCHAR)
   - `created_at`, `updated_at` (Timestamps)

2. **group** - Stores groups of people
   - `group_id` (UUID, Primary Key)
   - `group_name` (VARCHAR, Unique)
   - Timestamps

3. **group_member** - Links people to groups (Many-to-Many)
   - `group_member_id` (UUID, Primary Key)
   - `group_id`, `person_id` (Foreign Keys)

4. **entry** - Main transaction/loan table
   - `entry_id` (UUID, Primary Key)
   - `entry_name`, `description`
   - `transaction_type` (ENUM: STRAIGHT_EXPENSE, INSTALLMENT_EXPENSE, GROUP_EXPENSE)
   - `amount_borrowed`, `amount_remaining` (DECIMAL)
   - `status` (ENUM: UNPAID, PARTIALLY_PAID, PAID)
   - `borrower_person_id`, `borrower_group_id`, `lender_person_id`
   - `reference_id` (Unique, auto-generated)
   - `receipt_or_proof` (BYTEA - for storing images)

5. **payment** - Payment records
   - `payment_id` (UUID, Primary Key)
   - `payment_date`, `payment_amount`
   - `payee_person_id`
   - `proof` (BYTEA - payment proof image)

6. **payment_allocation** - Payment breakdown for group expenses
   - `allocation_id` (UUID, Primary Key)
   - `entry_id`, `person_id`
   - `description`, `amount`

7. **installment_plan** - Installment payment plans
   - `installment_id` (UUID, Primary Key)
   - `entry_id` (Unique)
   - `start_date`, `payment_frequency` (ENUM: WEEKLY, MONTHLY)
   - `payment_terms`, `amount_per_term`

8. **installment_term** - Individual terms in an installment plan
   - `term_id` (UUID, Primary Key)
   - `installment_id`, `term_number`
   - `due_date`, `term_status` (ENUM: NOT_STARTED, UNPAID, PAID, SKIPPED, DELINQUENT)

#### Database Features

- **UUID Primary Keys**: All tables use UUID for unique identification
- **ENUM Types**: PostgreSQL ENUMs for status fields
- **Automatic Timestamps**: Triggers update `updated_at` automatically
- **Cascade Deletes**: Related records deleted automatically
- **Indexes**: Optimized for common queries
- **Constraints**: Data integrity enforced at database level

### JPA Configuration

```properties
# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.type.preferred_blob_type=MATERIALIZED_BLOB
```

**Key Settings:**
- `ddl-auto=update`: Hibernate automatically updates schema on startup
- `show-sql=true`: Logs SQL queries for debugging
- `dialect=PostgreSQLDialect`: Uses PostgreSQL-specific SQL
- `preferred_blob_type=MATERIALIZED_BLOB`: Uses bytea for byte arrays (images)

---

## Backend Setup (Spring Boot)

### Project Configuration

The backend is configured via `pom.xml` (Maven) and `application.properties`.

#### Maven Configuration (`pom.xml`)

**Parent:**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>
```

**Key Dependencies:**
- `spring-boot-starter-web`: REST API, embedded Tomcat
- `spring-boot-starter-data-jpa`: JPA/Hibernate integration
- `spring-boot-starter-validation`: Bean validation
- `postgresql`: PostgreSQL JDBC driver
- `lombok`: Code generation (getters, setters, etc.)
- `spring-boot-devtools`: Hot reloading for development

#### Application Properties

Located in `backend/src/main/resources/application.properties`:

```properties
# Application Configuration
spring.application.name=loan-tracking-system
server.port=8080

# CORS Configuration
spring.web.cors.allowed-origins=http://localhost:5173
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true
```

### Spring Boot Application Structure

The main application class (`LoanTrackingApplication.java`):

```java
@SpringBootApplication
public class LoanTrackingApplication {
    public static void main(String[] args) {
        SpringApplication.run(LoanTrackingApplication.class, args);
    }
}
```

**@SpringBootApplication** enables:
- Component scanning
- Auto-configuration
- Configuration property scanning

### Backend Architecture Layers

#### 1. **Model Layer** (`model/`)
- JPA Entity classes that map to database tables
- Uses `@Entity`, `@Table`, `@Column` annotations
- Example: `Entry.java` represents the `entry` table

```java
@Entity
@Table(name = "entry")
public class Entry {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID entryId;
    
    @Column(name = "entry_name", nullable = false)
    private String entryName;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lender_person_id")
    private Person lenderPerson;
    // ... more fields
}
```

#### 2. **Repository Layer** (`repository/`)
- Spring Data JPA interfaces extending `JpaRepository`
- Provides CRUD operations automatically
- Custom query methods using method naming conventions

```java
@Repository
public interface EntryRepository extends JpaRepository<Entry, UUID> {
    Optional<Entry> findByReferenceId(String referenceId);
    List<Entry> findByLenderPerson_PersonId(UUID personId);
    
    @Query("SELECT e FROM Entry e WHERE e.lenderPerson.personId = :personId")
    List<Entry> findByPersonAsLenderOrBorrower(@Param("personId") UUID personId);
}
```

#### 3. **Service Layer** (`service/`)
- Business logic implementation
- Transaction management
- Orchestrates repository calls
- Example: `EntryService.java` handles entry-related operations

#### 4. **DTO Layer** (`dto/`)
- Data Transfer Objects for API requests/responses
- Separates internal entities from API contracts
- Example: `EntryDTO.java`, `CreateEntryRequest.java`

#### 5. **Controller Layer** (`controller/`)
- REST API endpoints
- Handles HTTP requests/responses
- Example: `EntryController.java`

```java
@RestController
@RequestMapping("/api/entries")
@CrossOrigin(origins = "http://localhost:5173")
public class EntryController {
    
    @Autowired
    private EntryService entryService;
    
    @GetMapping
    public ResponseEntity<List<EntryDTO>> getAllEntries() {
        return ResponseEntity.ok(entryService.getAllEntries());
    }
    
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EntryDTO> createEntry(
        @RequestPart("request") CreateEntryRequest request,
        @RequestPart(value = "proof", required = false) MultipartFile proof
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(entryService.createEntry(request, proof));
    }
}
```

#### 6. **Configuration Layer** (`config/`)
- Spring configuration classes
- CORS configuration
- Global exception handling
- User context setup

**CORS Configuration** (`CorsConfig.java`):
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        // Allows requests from http://localhost:5173
        // Configures allowed methods, headers, credentials
    }
}
```

**User Context** (`UserContext.java`):
- Extracts user information from HTTP headers
- Header: `X-Selected-User-Name` and `X-Selected-User-Id`
- Used throughout the application for user-specific operations

### Key Backend Features

1. **Multipart File Upload**: Supports image uploads (receipts, proofs)
2. **UUID Primary Keys**: All entities use UUID for IDs
3. **Reference ID Generation**: Auto-generates unique reference IDs
4. **Automatic Timestamps**: `@PrePersist` and `@PreUpdate` hooks
5. **Lazy Loading**: Optimized entity loading with `FetchType.LAZY`
6. **Transaction Management**: `@Transactional` on service methods

---

## Frontend Setup (React + Vite)

### Project Configuration

The frontend uses **Vite** as the build tool and dev server.

#### Package Configuration (`package.json`)

**Key Dependencies:**
- `react`, `react-dom`: React library
- `react-router-dom`: Client-side routing
- `axios`: HTTP client for API calls
- `tailwindcss`: Utility-first CSS
- `lucide-react`: Icon library
- `date-fns`: Date formatting
- `typescript`: Type safety

#### Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

**Key Features:**
- **Dev Server**: Runs on port 5173
- **Proxy**: Routes `/api/*` requests to backend (port 8080)
- **Hot Module Replacement (HMR)**: Instant updates during development

### Frontend Architecture

#### 1. **Entry Point** (`main.tsx`)

```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

#### 2. **App Component** (`App.tsx`)

Sets up routing and global context:

```typescript
function App() {
  return (
    <UserProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/entries" element={<AllPaymentsPage />} />
            <Route path="/entries/new" element={<CreateEntryPage />} />
            <Route path="/entries/:id" element={<EntryDetailPage />} />
            <Route path="/payments" element={<PaymentHistoryPage />} />
            <Route path="/people-groups" element={<PeopleGroupsPage />} />
          </Routes>
        </Layout>
      </Router>
    </UserProvider>
  )
}
```

#### 3. **API Service Layer** (`services/api.ts`)

Centralized API client using Axios:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Adds user context to headers
api.interceptors.request.use((config) => {
  const selectedUserId = localStorage.getItem('selectedUserId')
  const selectedUserName = localStorage.getItem('selectedUserName')
  
  if (selectedUserId && selectedUserName) {
    config.headers['X-Selected-User-Id'] = selectedUserId
    config.headers['X-Selected-User-Name'] = selectedUserName
  }
  
  return config
})
```

**API Modules:**
- `personApi`: Person CRUD operations
- `groupApi`: Group management
- `entryApi`: Entry/loan operations
- `paymentApi`: Payment operations
- `paymentAllocationApi`: Payment allocation management
- `installmentApi`: Installment plan operations

#### 4. **Context Layer** (`contexts/UserContext.tsx`)

Manages selected user state across the application:

```typescript
export function UserProvider({ children }: { children: ReactNode }) {
  const [selectedUser, setSelectedUserState] = useState<Person | null>(null)
  
  // Loads from localStorage on mount
  // Defaults to "tung tung tung sahur"
  
  // Saves to localStorage when changed
}
```

**Features:**
- Persists selected user in `localStorage`
- Defaults to "tung tung tung sahur"
- Available throughout app via `useUser()` hook

#### 5. **Pages** (`pages/`)
- `HomePage.tsx`: Dashboard with overview
- `AllPaymentsPage.tsx`: List of all entries
- `CreateEntryPage.tsx`: Form to create new entry
- `EntryDetailPage.tsx`: Entry details and payments
- `PaymentHistoryPage.tsx`: All payments history
- `PeopleGroupsPage.tsx`: Manage people and groups

#### 6. **Components** (`components/`)
- `Layout.tsx`: Main layout wrapper
- `PersonSelector.tsx`: Person selection component
- `GroupSelector.tsx`: Group selection component
- `Toast.tsx`: Notification component
- `PaymentAllocationDraftModal.tsx`: Payment allocation modal

### Frontend Features

1. **TypeScript**: Full type safety
2. **React Router**: Client-side routing
3. **Axios Interceptors**: Automatic header injection
4. **LocalStorage**: Persistent user selection
5. **Responsive Design**: Tailwind CSS utilities
6. **Form Handling**: File upload support via FormData

---

## API Structure & Endpoints

### Base URL

- **Development**: `http://localhost:8080/api`
- **Frontend Proxy**: Requests to `/api/*` are proxied to backend

### API Endpoints Overview

#### 1. **Person API** (`/api/persons`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/persons` | Get all persons |
| GET | `/api/persons/{id}` | Get person by ID |
| GET | `/api/persons/search?name={name}` | Search persons by name |
| POST | `/api/persons` | Create new person |
| PUT | `/api/persons/{id}` | Update person |
| DELETE | `/api/persons/{id}` | Delete person |

#### 2. **Group API** (`/api/groups`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | Get all groups |
| GET | `/api/groups/{id}` | Get group by ID |
| POST | `/api/groups` | Create new group |
| PUT | `/api/groups/{id}` | Update group |
| DELETE | `/api/groups/{id}` | Delete group |
| POST | `/api/groups/{groupId}/members/{personId}` | Add member to group |
| DELETE | `/api/groups/{groupId}/members/{personId}` | Remove member from group |

#### 3. **Entry API** (`/api/entries`)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/entries` | Get all entries | - |
| GET | `/api/entries/{id}` | Get entry by ID | - |
| POST | `/api/entries` | Create entry (JSON) | `CreateEntryRequest` |
| POST | `/api/entries` | Create entry (Multipart) | FormData (request + proof) |
| PUT | `/api/entries/{id}` | Update entry | `CreateEntryRequest` |
| DELETE | `/api/entries/{id}` | Delete entry | - |
| POST | `/api/entries/{id}/complete` | Mark entry as complete | - |
| POST | `/api/entries/auto-complete` | Auto-complete eligible entries | - |

**CreateEntryRequest Example:**
```json
{
  "entryName": "Grocery Shopping",
  "description": "Monthly groceries",
  "transactionType": "STRAIGHT_EXPENSE",
  "dateBorrowed": "2024-01-15",
  "borrowerPersonId": "uuid-here",
  "lenderPersonId": "uuid-here",
  "amountBorrowed": 5000.00,
  "paymentMethod": "CASH",
  "notes": "Notes here"
}
```

#### 4. **Payment API** (`/api/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | Get all payments |
| GET | `/api/payments/{id}` | Get payment by ID |
| GET | `/api/payments/entry/{entryId}` | Get payments for entry |
| POST | `/api/payments` | Create payment (JSON or Multipart) |
| PUT | `/api/payments/{id}` | Update payment |
| DELETE | `/api/payments/{id}` | Delete payment |

#### 5. **Payment Allocation API** (`/api/payment-allocations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-allocations` | Get all allocations |
| GET | `/api/payment-allocations/{id}` | Get allocation by ID |
| GET | `/api/payment-allocations/entry/{entryId}` | Get allocations for entry |
| POST | `/api/payment-allocations` | Create allocations for entry |
| PUT | `/api/payment-allocations/{id}` | Update allocation |
| DELETE | `/api/payment-allocations/{id}` | Delete allocation |

#### 6. **Installment API** (`/api/installments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/installments/terms/{termId}/skip` | Skip installment term |
| GET | `/api/installments/terms/{termId}/skip-penalty` | Get skip penalty amount |
| PUT | `/api/installments/terms/{termId}/status?status={status}` | Update term status |
| POST | `/api/installments/update-delinquent` | Update delinquent terms |

### Request/Response Format

**Headers:**
- `Content-Type: application/json` (for JSON requests)
- `Content-Type: multipart/form-data` (for file uploads)
- `X-Selected-User-Name`: Current user name (automatically added by frontend)
- `X-Selected-User-Id`: Current user ID (automatically added by frontend)

**Response Format:**
```json
{
  "entryId": "uuid",
  "entryName": "Entry Name",
  "amountBorrowed": 1000.00,
  // ... more fields
}
```

**Error Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Error message here",
  "path": "/api/entries"
}
```

---

## How Components Work Together

### Request Flow

1. **User Action in Frontend**
   - User clicks button, submits form, etc.
   - React component calls API service function

2. **API Service Layer** (`services/api.ts`)
   - Axios interceptor adds user context headers
   - Request sent to backend (via proxy or directly)

3. **Backend Controller** (`controller/`)
   - Receives HTTP request
   - Extracts user context from headers
   - Validates request
   - Calls service layer

4. **Backend Service** (`service/`)
   - Contains business logic
   - Calls repository layer
   - Handles transactions
   - Returns DTO

5. **Repository Layer** (`repository/`)
   - Executes database queries via JPA/Hibernate
   - Maps results to Entity objects

6. **Database (Supabase PostgreSQL)**
   - Stores/retrieves data
   - Enforces constraints

7. **Response Flow** (Reverse)
   - Repository → Service → Controller → JSON Response → Frontend

### User Context Flow

```
Frontend (UserContext)
  ↓ (stores in localStorage)
Axios Interceptor
  ↓ (adds X-Selected-User-Name header)
Backend Controller
  ↓ (reads header)
UserContext.getCurrentUserName()
  ↓ (used throughout backend)
Business Logic (Service Layer)
```

### Example: Creating an Entry

1. **Frontend** (`CreateEntryPage.tsx`):
   ```typescript
   const handleSubmit = async () => {
     const entry = await entryApi.create(entryData)
   }
   ```

2. **API Service** (`services/api.ts`):
   ```typescript
   entryApi.create(entry) // Adds headers, sends POST /api/entries
   ```

3. **Backend Controller** (`EntryController.java`):
   ```java
   @PostMapping
   public ResponseEntity<EntryDTO> createEntry(@RequestBody CreateEntryRequest request) {
       return ResponseEntity.ok(entryService.createEntry(request, null));
   }
   ```

4. **Backend Service** (`EntryService.java`):
   ```java
   public EntryDTO createEntry(CreateEntryRequest request, MultipartFile proof) {
       // Business logic
       Entry entry = new Entry();
       // ... map request to entity
       entry = entryRepository.save(entry);
       // ... return DTO
   }
   ```

5. **Repository** (`EntryRepository.java`):
   ```java
   // JpaRepository.save() automatically handled by Spring Data JPA
   ```

6. **Database**: Row inserted into `entry` table

7. **Response**: Entry DTO returned → Frontend updates UI

### File Upload Flow

For entries/payments with image uploads:

1. **Frontend**: Creates `FormData` with request JSON and file
2. **Backend**: Receives `MultipartFile`
3. **Service**: Converts file to `byte[]`
4. **Entity**: Stores in `BYTEA` column
5. **Response**: Entry with image stored

---

## Key Features & Architecture Decisions

### 1. **UUID Primary Keys**
- **Why**: Globally unique, prevents ID conflicts in distributed systems
- **Database**: `gen_random_uuid()` generates UUIDs
- **Java**: `UUID` type in entities

### 2. **Reference ID Generation**
- **Format**: `{BorrowerInitials}{LenderInitials}` (e.g., "JDTS")
- **Purpose**: Human-readable identifier for entries
- **Implementation**: `ReferenceIdGenerator` utility

### 3. **Computed Status Fields**
- **Payment Allocation Status**: Computed from payments, not stored
- **Installment Plan Status**: Computed from term statuses
- **Why**: Ensures data consistency, avoids synchronization issues

### 4. **Lazy Loading**
- **Entity Relations**: Use `FetchType.LAZY` to avoid N+1 queries
- **Benefits**: Faster queries, load relationships only when needed

### 5. **Connection Pooling**
- **HikariCP**: Spring Boot's default connection pool
- **Small Pool Size**: 2 max connections (Supabase recommendation)
- **Why**: Supabase pooler manages connections at database level

### 6. **CORS Configuration**
- **Allowed Origins**: `http://localhost:5173` (frontend)
- **Why**: Prevents unauthorized cross-origin requests
- **Implementation**: `CorsConfig.java` bean

### 7. **User Context via Headers**
- **Headers**: `X-Selected-User-Name`, `X-Selected-User-Id`
- **Why**: Multi-user support without authentication system
- **Storage**: Frontend localStorage, sent with every request

### 8. **DTO Pattern**
- **Separate DTOs** from Entity models
- **Why**: 
  - Hides internal entity structure
  - Allows API versioning
  - Prevents lazy loading issues
  - Customizes response structure

### 9. **Transaction Management**
- **Service Layer**: `@Transactional` annotations
- **Why**: Ensures data consistency, rollback on errors

### 10. **Automatic Timestamps**
- **Database Triggers**: Update `updated_at` automatically
- **JPA Hooks**: `@PrePersist`, `@PreUpdate`
- **Why**: Consistent timestamp management

---

## Development Workflow

### Starting the Application

1. **Start Backend**:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   # Or on Windows: .\mvnw.cmd spring-boot:run
   ```
   Backend runs on `http://localhost:8080`

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install  # First time only
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

3. **Access Application**:
   Open browser to `http://localhost:5173`

### Hot Reloading

- **Backend**: Spring Boot DevTools enables automatic restart
- **Frontend**: Vite HMR provides instant updates

### Database Changes

1. Modify entity classes in `model/`
2. Hibernate auto-updates schema on startup (`ddl-auto=update`)
3. Or run SQL migration scripts in `database/` folder

---

## Summary

This Loan Tracking System uses a modern **three-tier architecture**:

- **Frontend (React + Vite)**: Modern UI with TypeScript, Tailwind CSS, React Router
- **Backend (Spring Boot)**: RESTful API with Spring Data JPA, layered architecture
- **Database (Supabase PostgreSQL)**: Cloud-hosted PostgreSQL with connection pooling

**Key Integration Points:**
1. Frontend → Backend: REST API calls via Axios
2. Backend → Database: JPA/Hibernate ORM
3. User Context: Headers passed from frontend, used throughout backend
4. File Uploads: Multipart/form-data for images
5. CORS: Configured to allow frontend-backend communication

The architecture follows **separation of concerns** with clear layers (Controller → Service → Repository → Database) and uses **modern best practices** (DTOs, lazy loading, connection pooling, UUIDs).

