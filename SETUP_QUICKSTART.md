# ⚡ Quick Start Guide

**Time to setup: ~5 minutes**

> **Note**: This project uses a **shared Supabase database**. You don't need to create your own - just use the provided credentials!

## Prerequisites Checklist

- [ ] Java 21 installed (`java -version`)
- [ ] Node.js 18+ installed (`node -v`)
- [ ] **Database credentials** (ask team lead)

---

## 🚀 3-Step Setup

### 1️⃣ Get Database Credentials (1 min)

Ask your team lead for:
- Database host
- Database username  
- Database password

These will be shared with all team members.

### 2️⃣ Configure & Start Backend (2 min)

1. **Copy the example config:**
   ```bash
   cd backend/src/main/resources
   cp application.properties.example application.properties
   ```

2. **Edit `application.properties`** with shared credentials:
   ```properties
   spring.datasource.url=jdbc:postgresql://[SHARED-HOST]:5432/postgres?sslmode=require
   spring.datasource.username=[SHARED-USERNAME]
   spring.datasource.password=[SHARED-PASSWORD]
   ```

3. **Start backend:**
   
   **Windows:**
   ```powershell
   cd backend
   .\mvnw.cmd spring-boot:run
   ```
   
   **Mac/Linux:**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

Wait for: `Started LoanTrackingApplication` ✅

### 3️⃣ Start Frontend (2 min)

**New terminal:**
```bash
cd frontend
npm install
npm run dev
```

Wait for: `Local: http://localhost:5173` ✅

### 4️⃣ Test

1. Open: http://localhost:5173
2. You should see existing data in the dashboard
3. Try creating a new person or entry

**✨ Done! You're ready to develop!**

---

## 🔑 Getting Credentials

**First time setup?** Contact the project owner for:

```
Host: aws-X-REGION.pooler.supabase.com
Port: 5432
Username: postgres.PROJECT_REF
Password: [provided separately]
```

⚠️ **Never commit `application.properties` to Git!** It's already in `.gitignore`.

---

## 🆘 Quick Fixes

| Problem | Solution |
|---------|----------|
| Backend: Connection refused | Check credentials are correct |
| Backend: Port 8080 in use | Change `server.port=8081` in application.properties |
| Frontend: `lucide-react` error | Run: `npm install lucide-react` |
| Frontend: Can't connect to API | Ensure backend is running on port 8080 |

---

## 📂 Project Structure

```
loan-tracking-system/
├── backend/           # Java Spring Boot API (port 8080)
├── frontend/          # React UI (port 5173)
└── database/          # Schema docs (for reference)
```

---

## 🔄 Daily Development

**Terminal 1 - Backend:**
```bash
cd backend && .\mvnw.cmd spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

---

## 💡 Shared Database Notes

- **All developers share the same database**
- **You'll see each other's data** - great for testing!
- **Be careful** when testing delete operations
- **Communicate** with team before major changes
- **Database is already set up** - no schema to run!

---

For detailed instructions, see **[README.md](README.md)**
