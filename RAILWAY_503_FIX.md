# 🚨 Railway 503 Error Fix Guide

## Problem
Your Railway deployment is returning "503 Service Unavailable" because:
1. Missing Supabase Service Role Key
2. Railway build failing due to complex dependencies
3. Environment variables not properly configured

## ✅ **Step-by-Step Fix (10 minutes)**

### **Step 1: Set Environment Variables in Railway**

1. Go to your Railway project dashboard
2. Click on "Variables" tab
3. Add these environment variables:

```
SUPABASE_URL=https://xlzihfstoqdbgdegqkoi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemloZnN0b3FkYmdkZWdxa29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTUzMDQsImV4cCI6MjA2ODU5MTMwNH0.uE0aEwBJN-sQCesYVjKNJdRyBAaaI_q0tFkSlTBilHw
NODE_ENV=production
PORT=3001
```

### **Step 2: Get Supabase Service Role Key**

**This is CRITICAL - your server won't work without it:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/xlzihfstoqdbgdegqkoi)
2. Click on Settings → API
3. Find the **"service_role"** key (the long secret key, NOT the anon key)
4. Copy it and add to Railway as:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE
   ```

### **Step 3: Redeploy with Fixed Configuration**

1. Push the updated `railway.json` to your repository:
   ```bash
   git add railway.json
   git commit -m "Fix Railway deployment configuration"
   git push origin main
   ```

2. In Railway dashboard, click "Deploy" to trigger a new deployment

### **Step 4: Monitor Deployment**

Watch the Railway deployment logs for these success messages:
```
✅ Build completed successfully
🔗 Supabase connection initialized  
🔑 Supabase Service Role Key: Set ✅
🚀 TrackFlow Platform running on port 3001
```

### **Step 5: Test the Fix**

Once deployed, test these endpoints:

1. **Health Check:**
   ```bash
   curl https://trackflow-app-production.up.railway.app/api/health
   ```
   Should return: `{"status": "healthy", "timestamp": "..."}`

2. **Workflow System Script:**
   ```bash
   curl -I https://trackflow-app-production.up.railway.app/api/unified-workflow-system.js
   ```
   Should return: `HTTP/2 200`

3. **Active Workflows:**
   ```bash
   curl https://trackflow-app-production.up.railway.app/api/workflows/active
   ```
   Should return workflows data

## 🔍 **What the Fix Does**

### Updated Railway Configuration
- **Simplified build**: Uses `package-railway.json` with only server dependencies
- **No frontend build**: Removes React/Vite build that was failing
- **Production-only deps**: Faster build and smaller container

### Service Role Key
- **Bypasses RLS**: Allows server to access demo workflows
- **Production access**: Required for workflow fetching in production
- **Security**: Uses proper authentication for database access

## 🆘 **If Still Failing**

### Option 1: Check Railway Logs
1. Go to Railway dashboard
2. Click on "Deployments" tab
3. Check the latest deployment logs for specific errors

### Option 2: Alternative Deployment (Vercel)
If Railway continues failing, deploy to Vercel instead:

```bash
npm install -g vercel
vercel --prod
# Add environment variables when prompted
```

### Option 3: Use ngrok for Testing
For immediate testing while fixing Railway:

```bash
# Start local server
node railway-server.js

# In another terminal
npm install -g ngrok
ngrok http 3001

# Use the ngrok HTTPS URL in your Webflow integration
```

## 🎯 **Expected Results After Fix**

✅ Railway deployment succeeds without errors  
✅ Server returns 200 status codes  
✅ UnifiedWorkflowSystem script loads in Webflow  
✅ Your workflows execute properly  
✅ Text changes and button hiding work as expected  

## 📞 **Next Steps**

1. **Set the environment variables** (especially `SUPABASE_SERVICE_ROLE_KEY`)
2. **Redeploy** the updated configuration
3. **Test** the endpoints above
4. **Update** your Webflow integration to use the fixed Railway URL

The main issue is the missing Service Role Key - once that's set, your Railway deployment should work perfectly! 