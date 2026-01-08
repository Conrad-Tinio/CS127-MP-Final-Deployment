# Render Deployment Fix Guide

Your backend deployment failed because Spring Boot can't find the database configuration. This guide will help you fix it.

## Problem

The error "Exited with status 1" with database configuration errors means:
- **Environment variables are not set in Render**, OR
- **Environment variables are set incorrectly**

## Solution: Set Environment Variables in Render

### Step 1: Go to Render Dashboard

1. Go to https://dashboard.render.com
2. Click on your service: **loan-tracking-system-backend**
3. Click on **"Environment"** tab (in the left sidebar)

### Step 2: Add Environment Variables

Click **"Add Environment Variable"** and add these **ONE BY ONE**:

#### Variable 1: PORT
- **Key**: `PORT`
- **Value**: `8080`
- Click **"Save Changes"**

#### Variable 2: DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: `jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require`
- Click **"Save Changes"**

#### Variable 3: DATABASE_USERNAME
- **Key**: `DATABASE_USERNAME`
- **Value**: `postgres.pkmcmbnrxioxwtprlgyk`
- Click **"Save Changes"**

#### Variable 4: DATABASE_PASSWORD
- **Key**: `DATABASE_PASSWORD`
- **Value**: `cs127loan!!`
- Click **"Save Changes"**

#### Variable 5: CORS_ALLOWED_ORIGINS
- **Key**: `CORS_ALLOWED_ORIGINS`
- **Value**: `http://localhost:5173`
- *(We'll update this after frontend deploys)*
- Click **"Save Changes"**

#### Variable 6: SHOW_SQL
- **Key**: `SHOW_SQL`
- **Value**: `false`
- Click **"Save Changes"**

#### Variable 7: HIKARI_MAX_POOL_SIZE
- **Key**: `HIKARI_MAX_POOL_SIZE`
- **Value**: `3`
- Click **"Save Changes"**

#### Variable 8: HIKARI_MIN_IDLE
- **Key**: `HIKARI_MIN_IDLE`
- **Value**: `1`
- Click **"Save Changes"**

### Step 3: Verify All Variables Are Set

After adding all variables, you should see 8 environment variables in the list:

1. `PORT` = `8080`
2. `DATABASE_URL` = `jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require`
3. `DATABASE_USERNAME` = `postgres.pkmcmbnrxioxwtprlgyk`
4. `DATABASE_PASSWORD` = `cs127loan!!`
5. `CORS_ALLOWED_ORIGINS` = `http://localhost:5173`
6. `SHOW_SQL` = `false`
7. `HIKARI_MAX_POOL_SIZE` = `3`
8. `HIKARI_MIN_IDLE` = `1`

### Step 4: Manually Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for deployment to complete (5-10 minutes)

### Step 5: Check Logs

1. Go to **"Logs"** tab
2. Watch for:
   - ✅ **"Started LoanTrackingApplication"** = Success!
   - ❌ **"Exited with status 1"** = Still failing, check error message

## Common Issues

### Issue: "Still failing after setting environment variables"

**Check:**
1. Verify all 8 variables are present (no typos in key names)
2. Check `DATABASE_URL` includes `?sslmode=require` at the end
3. Verify Supabase database is active (not paused)
4. Check logs for specific error message

### Issue: "Database connection timeout"

**Solution:**
- Wait 30-60 seconds (Supabase might be slow to respond)
- Verify Supabase project is not paused
- Check Supabase dashboard to ensure database is active

### Issue: "Environment variables not showing in logs"

**Solution:**
- Make sure you clicked "Save Changes" after adding each variable
- Try redeploying after adding all variables
- Check that variable keys match exactly (case-sensitive)

## Quick Checklist

Before redeploying, verify:

- [ ] All 8 environment variables are set in Render
- [ ] `DATABASE_URL` has `?sslmode=require` at the end
- [ ] No extra spaces in variable names or values
- [ ] Supabase database is active (not paused)
- [ ] You clicked "Save Changes" after adding each variable

## After Successful Deployment

Once your backend is live (shows "Live" status):

1. Test the API:
   ```
   https://[your-service-name].onrender.com/api/persons
   ```

2. You should see: `[]` (empty array) or your data

3. Then proceed with frontend deployment on Netlify

## Need More Help?

Check the Render logs for the specific error message. Common errors:

- **"Failed to obtain JDBC Connection"** = Database connection issue
- **"No DataSource bean found"** = Environment variables not set
- **"Invalid connection string"** = Check `DATABASE_URL` format

