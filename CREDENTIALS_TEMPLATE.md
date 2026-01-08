# 🔑 Database Credentials

> **For Team Lead**: Fill in these details and share with your team members securely (via private message, encrypted file, etc.)

---

## Supabase Connection Details

### Session Pooler (Use This!)

```
Host: aws-1-ap-southeast-2.pooler.supabase.com
Port: 5432
Database: postgres
Username: postgres.pkmcmbnrxioxwtprlgyk
Password: cs127loan!!
```

### Connection String

```
postgresql://postgres.pkmcmbnrxioxwtprlgyk:cs127loan!!@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```

### JDBC URL (for application.properties)

```
spring.datasource.url=jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
spring.datasource.username=postgres.pkmcmbnrxioxwtprlgyk
spring.datasource.password=cs127loan!!
```

---

## How to Use

### For Team Members:

1. Copy the JDBC URL details above
2. Open `backend/src/main/resources/application.properties`
3. Paste these values in the appropriate fields
4. Save and start the backend

### Quick Copy-Paste

```properties
# Copy these three lines into your application.properties

spring.datasource.url=jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
spring.datasource.username=postgres.pkmcmbnrxioxwtprlgyk
spring.datasource.password=cs127loan!!
```

---

## ⚠️ Security Reminders

- **Never commit** `application.properties` to Git (it's already in .gitignore)
- **Don't share** credentials in public channels
- **Keep credentials** within the team only
- **Change password** immediately if accidentally exposed

---

## Supabase Dashboard Access

If team members need to view the database:

**Dashboard URL**: https://supabase.com/dashboard/project/pkmcmbnrxioxwtprlgyk

**Login**: [Team lead can provide Supabase account access if needed]

---

## Need Help?

- **Connection issues**: See SETUP_QUICKSTART.md
- **Lost credentials**: Contact team lead
- **Can't connect**: Make sure using Session Pooler (not Direct Connection)





