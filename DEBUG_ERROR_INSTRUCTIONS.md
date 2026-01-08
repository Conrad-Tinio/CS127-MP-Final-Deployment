# How to See the Full Error Message

The error log shows "Error starting ApplicationContext" but cuts off the actual error details. Here's how to see the full error:

## Method 1: Check Render Logs (Scroll Down)

The full error message is usually **below** the "Error starting ApplicationContext" line.

1. Go to Render Dashboard → Your Service → **"Logs"** tab
2. **Scroll down** past the "Error starting ApplicationContext" message
3. Look for:
   - **"Description:"** - This shows what failed
   - **"Action:"** - This shows what to fix
   - **Stack trace** - Shows the exact line that failed

## Method 2: Enable Debug Mode (Already Done)

I've enabled debug mode in `application.properties`. After redeploying, you'll see:

1. More detailed error messages
2. Condition evaluation report
3. Full stack traces

## Method 3: Check Specific Error Messages

Look for these common errors in the logs:

### Error: "Failed to obtain JDBC Connection"
- **Cause**: Can't connect to database
- **Check**: 
  - Environment variables `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` are set
  - Supabase database is active (not paused)
  - Network connectivity from Render to Supabase

### Error: "No DataSource bean found"
- **Cause**: Environment variables not being read
- **Check**: All 8 environment variables are set in Render

### Error: "Cannot determine embedded database driver class"
- **Cause**: Missing database configuration
- **Check**: `DATABASE_URL` environment variable is set correctly

### Error: "Property spring.datasource.url is required"
- **Cause**: `DATABASE_URL` not set
- **Fix**: Add `DATABASE_URL` environment variable in Render

## What to Look For in Logs

After enabling debug mode, you should see:

1. **Early in logs:**
   ```
   === Database Configuration ===
   DATABASE_URL env var: SET (or NOT SET)
   DATABASE_USERNAME env var: SET (or NOT SET)
   ```

2. **Error section:**
   ```
   Error starting ApplicationContext
   Description: [THE ACTUAL ERROR]
   Action: [WHAT TO FIX]
   ```

3. **Stack trace:**
   Shows exactly which class/method failed

## Next Steps

1. **Scroll down** in Render logs to see the full error
2. **Copy the error message** (especially the "Description:" and "Action:" parts)
3. **Share the error message** so I can fix it

## Quick Checklist

Before checking logs, verify:

- [ ] All 8 environment variables are set in Render
- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] Supabase database is active (not paused)
- [ ] No typos in environment variable names

## Common Fixes

### If environment variables are "NOT SET":
1. Go to Render Dashboard → Your Service → Environment
2. Add the missing variables
3. Click "Save Changes"
4. Redeploy

### If you see "Failed to obtain JDBC Connection":
1. Verify Supabase project is active
2. Check `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` are correct
3. Try connecting manually to test credentials

### If you see any other error:
1. Scroll down in logs to see full error message
2. Copy the "Description:" and "Action:" sections
3. Share those details for specific fix

