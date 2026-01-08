# Render Deployment Error Fix Guide

## The Error: "Error starting ApplicationContext"

This error means Spring Boot failed to start because it couldn't initialize the database connection.

## Root Cause

The most common cause is **missing or incorrect environment variables in Render**.

## Step-by-Step Fix

### Step 1: Verify Environment Variables in Render

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click on your service: **loan-tracking-system-backend**
3. Click **"Environment"** tab (left sidebar)

### Step 2: Check What Environment Variables Are Set

Look at the list of environment variables. You should see **8 variables**:

1. `PORT`
2. `DATABASE_URL`
3. `DATABASE_USERNAME`
4. `DATABASE_PASSWORD`
5. `CORS_ALLOWED_ORIGINS`
6. `SHOW_SQL`
7. `HIKARI_MAX_POOL_SIZE`
8. `HIKARI_MIN_IDLE`

**If any are missing, that's your problem!**

### Step 3: Add Missing Environment Variables

If variables are missing, add them one by one:

#### Required Environment Variables:

```
PORT = 8080

DATABASE_URL = jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require

DATABASE_USERNAME = postgres.pkmcmbnrxioxwtprlgyk

DATABASE_PASSWORD = cs127loan!!

CORS_ALLOWED_ORIGINS = http://localhost:5173

SHOW_SQL = false

HIKARI_MAX_POOL_SIZE = 3

HIKARI_MIN_IDLE = 1
```

**Important:**
- Click **"Save Changes"** after adding each variable
- Make sure there are **NO SPACES** around the `=` sign
- Make sure `DATABASE_URL` includes `?sslmode=require` at the end

### Step 4: Check Logs After Adding Variables

1. Go to **"Logs"** tab in Render
2. Look for this line at the start:
   ```
   === Database Configuration ===
   DATABASE_URL env var: SET
   DATABASE_USERNAME env var: SET
   ```

If you see `NOT SET`, the environment variables are still not being read correctly.

### Step 5: Common Issues to Check

#### Issue 1: Variable Name Typos
- Check that variable names are **EXACTLY** as shown (case-sensitive)
- `DATABASE_URL` not `database_url` or `DATABASE-URL`

#### Issue 2: DATABASE_URL Format
- Must start with `jdbc:postgresql://`
- Must end with `?sslmode=require`
- Should look like: `jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require`

#### Issue 3: Extra Spaces or Quotes
- Variable values should **NOT** have quotes
- Example: `DATABASE_URL = jdbc:...` (NOT `DATABASE_URL = "jdbc:..."`)

#### Issue 4: Supabase Database Paused
- Check Supabase dashboard: https://supabase.com/dashboard
- Make sure your project is **active** (not paused)

### Step 6: Redeploy After Fixing

1. After adding/fixing all environment variables
2. Go to **"Manual Deploy"** tab
3. Click **"Deploy latest commit"**
4. Wait 5-10 minutes for deployment

### Step 7: Check Deployment Status

Watch the logs. Look for:

**✅ Success:**
```
Started LoanTrackingApplication in X seconds
```

**❌ Still Failing:**
```
APPLICATION FAILED TO START
```

If still failing, check the **specific error message** in the logs.

## Detailed Error Messages

### Error: "Failed to obtain JDBC Connection"
- **Cause**: Database connection failed
- **Fix**: 
  1. Verify Supabase database is active
  2. Check `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` are correct
  3. Check network connectivity from Render to Supabase

### Error: "No DataSource bean found"
- **Cause**: Environment variables not set
- **Fix**: Add all 8 environment variables as shown above

### Error: "Invalid connection string"
- **Cause**: `DATABASE_URL` format is wrong
- **Fix**: Make sure it starts with `jdbc:postgresql://` and ends with `?sslmode=require`

## Quick Verification Checklist

Before redeploying, verify:

- [ ] All 8 environment variables are set in Render
- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] No extra spaces or quotes in variable values
- [ ] Variable names are exactly as shown (case-sensitive)
- [ ] Supabase database is active (not paused)
- [ ] Clicked "Save Changes" after adding each variable

## Still Having Issues?

1. **Copy the exact error message** from Render logs
2. **Take a screenshot** of your environment variables (hide password)
3. **Check Supabase dashboard** to ensure database is active

## Test Connection Manually

Once deployed successfully, test:

```bash
curl https://[your-service-name].onrender.com/api/persons
```

You should get: `[]` (empty array) or your data.

## Next Steps After Fix

Once backend is working:
1. Test the API endpoints
2. Deploy frontend to Netlify
3. Update `CORS_ALLOWED_ORIGINS` with your Netlify URL

