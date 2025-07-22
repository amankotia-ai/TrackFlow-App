# 🚀 Production Server Fix Guide

## 🎯 Issues Identified

Based on your Railway server returning 502 errors, here are the **5 critical issues** causing production failures:

### **Issue 1: Missing Service Role Key** 
- **Problem**: `SUPABASE_SERVICE_ROLE_KEY` not set in Railway environment
- **Impact**: Can't bypass RLS policies, causing workflow fetching to fail
- **Status**: ❌ Critical

### **Issue 2: Railway Configuration Missing**
- **Problem**: No `railway.json` or deployment configuration
- **Impact**: Railway doesn't know how to properly start your server
- **Status**: ❌ Critical

### **Issue 3: Environment Variables Not Set**
- **Problem**: Production environment variables not configured in Railway
- **Impact**: Server can't connect to Supabase properly
- **Status**: ❌ Critical

### **Issue 4: Health Check Endpoint**
- **Problem**: Railway might be failing health checks
- **Impact**: Server gets marked as unhealthy and restarted
- **Status**: ⚠️ Important

### **Issue 5: CORS and Security Headers**
- **Problem**: Missing production security configurations
- **Impact**: Browser blocking requests from Webflow
- **Status**: ⚠️ Important

## ✅ Step-by-Step Fix

### **Step 1: Configure Railway Environment Variables**

Go to your Railway dashboard and add these environment variables:

```bash
# Required for Supabase connection
SUPABASE_URL=https://xlzihfstoqdbgdegqkoi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemloZnN0b3FkYmdkZWdxa29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTUzMDQsImV4cCI6MjA2ODU5MTMwNH0.uE0aEwBJN-sQCesYVjKNJdRyBAaaI_q0tFkSlTBilHw

# CRITICAL: Get this from Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Server configuration
NODE_ENV=production
PORT=3001
```

**How to get Service Role Key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the `service_role` key (long key, NOT the anon key)
5. Add it to Railway environment variables

### **Step 2: Deploy Railway Configuration**

The repository now includes `railway.json` with proper configuration. Deploy this to fix Railway startup issues.

### **Step 3: Fix Server Startup**

Update your `package.json` (already correct):
```json
{
  "scripts": {
    "start": "node railway-server.js",
    "railway": "node railway-server.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### **Step 4: Add Health Check Endpoint**

Your server already has `/api/health` - Railway will use this to verify the server is running.

### **Step 5: Redeploy**

After setting environment variables:
1. Go to Railway dashboard
2. Click "Deploy" or trigger a new deployment
3. Check deployment logs for errors

## 🧪 Test the Fix

### **1. Check Railway Logs**
Look for these success messages:
```
🔗 Supabase connection initialized
🔑 Supabase Service Role Key: Set ✅
🚀 TrackFlow Platform running on port 3001
```

### **2. Test Health Endpoint**
```bash
curl https://trackflow-webapp-production.up.railway.app/api/health
```
Should return: `{"status": "OK", "timestamp": "..."}`

### **3. Test Workflow Endpoint**
```bash
curl https://trackflow-webapp-production.up.railway.app/api/workflows/active
```
Should return: `{"success": true, "workflows": [...], "count": 3}`

### **4. Test UnifiedWorkflowSystem Script**
```bash
curl -I https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js
```
Should return: `HTTP/2 200` (not 502)

## 🔧 Alternative Quick Fix

If Railway deployment is still failing, here's a **temporary workaround**:

### **Use Vercel Instead**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Create vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "railway-server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/railway-server.js"
    }
  ]
}
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Add Environment Variables:**
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter your service role key when prompted
```

5. **Update Webflow Integration:**
Replace Railway URL with Vercel URL in your Webflow code.

## 📊 Monitoring After Fix

### **Railway Dashboard**
- Check "Deployments" tab for success status
- Monitor "Metrics" for CPU/Memory usage
- Review "Logs" for any errors

### **Test Your Webflow Site**
1. Visit: https://manks.webflow.io/untitled?utm_source=google
2. Open browser dev tools → Console
3. Should see: "✅ Workflow system initialized"
4. Text should change from "Title copy goes here" to "Just this"
5. Button should be hidden

## 🚨 Critical Next Steps

1. **Immediately**: Set `SUPABASE_SERVICE_ROLE_KEY` in Railway environment variables
2. **Verify**: Railway deployment logs show service role key as "Set ✅"
3. **Test**: UnifiedWorkflowSystem script loads without 502 errors
4. **Deploy**: If Railway continues failing, switch to Vercel as backup

## 🔍 Root Cause Summary

Your production server is failing because:
1. **Railway doesn't have the Supabase service role key** → Can't fetch workflows → Empty response
2. **Missing deployment configuration** → Railway can't start server properly → 502 errors
3. **Environment variables not properly set** → Server initialization fails

The fix requires setting the missing environment variables and ensuring proper deployment configuration. 