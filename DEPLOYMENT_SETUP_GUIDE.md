# Deployment Setup Guide - Step by Step

This is a copy-paste ready guide for deploying your Loan Tracking System to Render (Backend) and Netlify (Frontend).

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub account with your code repository pushed
- [ ] Render account (free at https://render.com)
- [ ] Netlify account (free at https://netlify.com)
- [ ] Supabase project with database credentials ready

---

## Part 1: Deploy Backend to Render

### Step 1: Push Your Code to GitHub

```bash
git add .
git commit -m "Configure for Render and Netlify deployment"
git push origin main
```

### Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect GitHub"** and authorize Render
4. Select your repository: `CS127-MP-Final-Deployment`
5. Click **"Connect"**

### Step 3: Configure Build Settings

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `cs127-mp-deployment` (or your preferred name) |
| **Region** | `Singapore` (closest to Supabase) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |
| **Build Command** | *(leave empty - Docker handles this)* |
| **Start Command** | *(leave empty - Docker handles this)* |

### Step 4: Add Environment Variables

Click **"Advanced"** → Scroll down to **"Environment Variables"** → Click **"Add Environment Variable"**

Add these variables one by one:

```
PORT = 8080
```

```
DATABASE_URL = jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
```

```
DATABASE_USERNAME = postgres.pkmcmbnrxioxwtprlgyk
```

```
DATABASE_PASSWORD = cs127loan!!
```

```
CORS_ALLOWED_ORIGINS = http://localhost:5173
```
*(We'll update this after frontend deployment)*

```
SHOW_SQL = false
```

```
HIKARI_MAX_POOL_SIZE = 3
```

```
HIKARI_MIN_IDLE = 1
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes for first build)
3. Note your backend URL: `https://[your-service-name].onrender.com`
   - Example: `https://cs127-mp-deployment.onrender.com`

### Step 6: Test Backend

Once deployed, test your backend:

```bash
curl https://[your-service-name].onrender.com/api/persons
```

Or open in browser:
```
https://[your-service-name].onrender.com/api/persons
```

You should see a JSON response (empty array `[]` if no data yet).

---

## Part 2: Deploy Frontend to Netlify

### Step 1: Create Netlify Site

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub
5. Select your repository: `CS127-MP-Final-Deployment`

### Step 2: Configure Build Settings

Set the following in Netlify:

| Setting | Value |
|---------|-------|
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

### Step 3: Add Environment Variable

Before deploying, add environment variable:

1. Click **"Show advanced"** (before clicking Deploy)
2. Click **"New variable"**
3. Add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://[your-render-service-name].onrender.com/api`
   
   Example:
   ```
   VITE_API_BASE_URL = https://cs127-mp-deployment.onrender.com/api
   ```

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait for build to complete (1-2 minutes)
3. Note your frontend URL: `https://[auto-generated-name].netlify.app`
   - Example: `https://ofw-loan-tracking-system.netlify.app`

---

## Part 3: Post-Deployment Configuration

### Step 1: Update CORS on Render

After Netlify deployment, update the backend CORS to allow your frontend:

1. Go back to Render Dashboard: https://dashboard.render.com
2. Click on your web service
3. Go to **"Environment"** tab
4. Find `CORS_ALLOWED_ORIGINS` variable
5. Click **"Edit"**
6. Update the value to include your Netlify URL:
   ```
   https://[your-netlify-app-name].netlify.app,http://localhost:5173
   ```
   
   Example:
   ```
   https://ofw-loan-tracking-system.netlify.app,http://localhost:5173
   ```
7. Click **"Save Changes"**
8. Render will automatically redeploy with new CORS settings (wait 2-3 minutes)

### Step 2: Verify Frontend-Backend Connection

1. Open your Netlify frontend URL in browser
2. Check browser console (F12 → Console tab) for any CORS errors
3. Try creating a new entry or accessing data
4. If you see CORS errors, wait a few minutes for Render to finish redeploying

---

## Part 4: Testing Your Deployment

### Test Backend API Directly

```bash
# Test persons endpoint
curl https://[your-render-service-name].onrender.com/api/persons

# Test groups endpoint  
curl https://[your-render-service-name].onrender.com/api/groups

# Test entries endpoint
curl https://[your-render-service-name].onrender.com/api/entries
```

### Test Frontend

1. Open your Netlify URL in browser
2. Try these features:
   - [ ] Create a new person
   - [ ] Create a new group
   - [ ] Create a new entry
   - [ ] View all entries
   - [ ] Make a payment
   - [ ] View payment history

### Common Issues & Solutions

**Issue: "Network Error" or "Failed to fetch"**
- Solution: Check that `VITE_API_BASE_URL` in Netlify matches your Render backend URL (include `/api` at the end)
- Check that backend is running (Render dashboard should show "Live")

**Issue: "CORS error"**
- Solution: Verify `CORS_ALLOWED_ORIGINS` in Render includes your exact Netlify URL (no trailing slash)
- Wait 2-3 minutes after updating CORS for redeploy to complete

**Issue: "Backend spins down" (Cold start)**
- Solution: Free tier Render spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (this is normal)
- Subsequent requests are fast until next spin-down

**Issue: "Database connection failed"**
- Solution: Verify Supabase credentials are correct in Render environment variables
- Check that `DATABASE_URL` includes `?sslmode=require`
- Ensure Supabase project is active and not paused

---

## Environment Variables Quick Reference

### Render (Backend) Environment Variables

```
PORT=8080
DATABASE_URL=jdbc:postgresql://aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_USERNAME=postgres.pkmcmbnrxioxwtprlgyk
DATABASE_PASSWORD=cs127loan!!
CORS_ALLOWED_ORIGINS=https://[your-netlify-app].netlify.app,http://localhost:5173
SHOW_SQL=false
HIKARI_MAX_POOL_SIZE=3
HIKARI_MIN_IDLE=1
```

### Netlify (Frontend) Environment Variables

```
VITE_API_BASE_URL=https://[your-render-service].onrender.com/api
```

---

## Deployment URLs Template

After deployment, fill in your URLs here:

| Service | Your URL |
|---------|----------|
| **Frontend (Netlify)** | `https://____________________.netlify.app` |
| **Backend (Render)** | `https://____________________.onrender.com` |
| **Backend API** | `https://____________________.onrender.com/api` |
| **Database (Supabase)** | `aws-1-ap-southeast-2.pooler.supabase.com` |

---

## Quick Commands Reference

### Update Code & Redeploy

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main

# Render auto-deploys on push to main branch
# Netlify auto-deploys on push to main branch
```

### Manual Redeploy

**Render:**
1. Go to Render Dashboard → Your Service → **"Manual Deploy"** → **"Deploy latest commit"**

**Netlify:**
1. Go to Netlify Dashboard → Your Site → **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

### View Logs

**Render Logs:**
1. Go to Render Dashboard → Your Service → **"Logs"** tab

**Netlify Logs:**
1. Go to Netlify Dashboard → Your Site → **"Deploys"** → Click on deploy → **"Deploy log"**

### Check Backend Health

```bash
curl https://[your-render-service].onrender.com/api/persons
```

---

## Cost Summary (Free Tier)

| Service | Free Tier Limits | Monthly Cost |
|---------|------------------|--------------|
| **Netlify** | 100GB bandwidth, unlimited deploys | $0 |
| **Render** | 750 hours/month, spins down after inactivity | $0 |
| **Supabase** | 500MB database, 2GB bandwidth | $0 |

**Total: $0/month** ✓

---

## Support & Troubleshooting

### Render Support
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Status: https://status.render.com

### Netlify Support
- Dashboard: https://app.netlify.com
- Docs: https://docs.netlify.com
- Status: https://www.netlifystatus.com

### Check Deployment Status

**Render:**
- Service shows "Live" = Running ✓
- Service shows "Build failed" = Check logs for errors

**Netlify:**
- Deploy shows "Published" = Live ✓
- Deploy shows "Failed" = Check deploy logs

---

## Next Steps After Deployment

1. ✅ Test all features in production
2. ✅ Update any hardcoded localhost URLs to production URLs
3. ✅ Set up monitoring/alerting if needed
4. ✅ Document your production URLs for team reference
5. ✅ Consider setting up a custom domain (optional)

---

**Last Updated:** January 2026
**Project:** CS127 Machine Project - Loan Tracking System

