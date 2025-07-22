# 🔧 Railway Build Error Fix

## 🚨 Problem
Railway deployment failing with `npm install` error (exit code 127) due to Node.js version conflicts between frontend dependencies and server requirements.

## 🔍 Root Cause
- Your `package.json` includes frontend dependencies (React, Vite, TypeScript)
- Railway only needs server dependencies (Express, Supabase, etc.)
- Version conflicts between Node 18.x requirement and actual dependencies

## ✅ Solutions (Choose One)

### **Solution 1: Use Simplified Package.json (Recommended)**

I've created `package-railway.json` with only server dependencies. 

**Steps:**
1. The repository now has `package-railway.json` and updated `railway.json`
2. Railway will automatically copy the minimal package file during build
3. Redeploy your Railway project

### **Solution 2: Use Dockerfile (Alternative)**

If Solution 1 doesn't work, use the Docker approach:

**Steps:**
1. In Railway dashboard, go to Settings
2. Change "Deploy from" to use Dockerfile
3. The `Dockerfile` is already in the repository
4. Redeploy

### **Solution 3: Separate Package.json (Manual)**

Create a production-only package.json:

```bash
# In Railway dashboard, add this as build command:
echo '{"name":"trackflow-server","version":"1.0.0","type":"module","engines":{"node":"20.x"},"scripts":{"start":"node railway-server.js"},"dependencies":{"@supabase/supabase-js":"^2.52.0","axios":"^1.10.0","cheerio":"^1.1.0","cors":"^2.8.5","express":"^4.19.2"}}' > package.json && npm install
```

## 🚀 Immediate Action

**Try this first:**
1. Go to Railway dashboard
2. Trigger a **new deployment** (the updated `railway.json` should use the simplified package)
3. Monitor deployment logs

## 🧪 Test After Fix

Once deployment succeeds, test:

```bash
# Should return 200 (not 502)
curl -I https://trackflow-webapp-production.up.railway.app/api/health

# Should return workflows
curl https://trackflow-webapp-production.up.railway.app/api/workflows/active
```

## 📊 Expected Success Logs

Look for these in Railway deployment logs:
```
✅ Build completed successfully
🔗 Supabase connection initialized  
🔑 Supabase Service Role Key: Set ✅
🚀 TrackFlow Platform running on port 3001
```

## 🆘 If Still Failing

**Check Railway logs for:**
- Node.js version being used
- Which package.json is being processed
- Specific dependency causing failure

**Alternative: Deploy to Vercel**
If Railway continues failing, use Vercel as backup:
```bash
vercel --prod
```

The updated `vercel.json` is ready for deployment.

## 📝 Files Added/Modified

✅ `package-railway.json` - Minimal server dependencies  
✅ `railway.json` - Updated build command  
✅ `Dockerfile` - Docker deployment option  
✅ `vercel.json` - Updated for full server deployment

## 🎯 Expected Outcome

After applying the fix:
- ✅ Railway deployment succeeds without npm install errors
- ✅ UnifiedWorkflowSystem script loads in Webflow  
- ✅ Your workflow executes: text changes to "Just this" with `?utm_source=google`
- ✅ Button gets hidden as configured 