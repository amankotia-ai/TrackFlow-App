# 🔧 Supabase RLS Fix Guide

## 🎯 Problem
The UnifiedWorkflowSystem is failing with "UnifiedWorkflowSystem is not defined" because the Railway server can't fetch workflows due to RLS (Row Level Security) policies blocking access.

## 🔍 Root Cause
- RLS is enabled on the workflows table  
- No service role key is configured
- Anonymous users can't access workflows due to security policies

## ✅ Solution Options

### **Option 1: Quick Fix - Disable RLS Temporarily (Fastest)**

Run this SQL in your Supabase SQL Editor:

```sql
-- Disable RLS temporarily for testing
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.workflow_connections DISABLE ROW LEVEL SECURITY;
```

**Result**: Workflows will be publicly accessible (testing only!)

### **Option 2: Add Service Role Key (Recommended)**

1. **Get Service Role Key**:
   - Go to Supabase Dashboard
   - Settings → API  
   - Copy the `service_role` key (not anon key)

2. **Set Environment Variable**:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   ```

3. **Restart Server**:
   ```bash
   node railway-server.js
   ```

**Result**: Server bypasses RLS with service role authentication

### **Option 3: Create Anonymous Access Policy (Balanced)**

Run this SQL in your Supabase SQL Editor:

```sql
-- Re-enable RLS with anonymous access for active workflows
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access to active workflows only
CREATE POLICY "Allow anonymous access to active workflows" ON public.workflows
  FOR SELECT USING (is_active = true AND status = 'active');

-- Allow anonymous access to nodes of active workflows
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access to nodes of active workflows" ON public.workflow_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.is_active = true 
      AND workflows.status = 'active'
    )
  );

-- Allow anonymous access to connections of active workflows  
ALTER TABLE public.workflow_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access to connections of active workflows" ON public.workflow_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.is_active = true 
      AND workflows.status = 'active'
    )
  );
```

**Result**: Anonymous users can only access active workflows (secure)

## 🚀 Quick Implementation

### **For Immediate Testing (30 seconds)**:
```sql
-- Copy this to Supabase SQL Editor and run:
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections DISABLE ROW LEVEL SECURITY;
```

### **For Production (5 minutes)**:
1. Get service role key from Supabase Dashboard → Settings → API
2. Set environment variable: `SUPABASE_SERVICE_ROLE_KEY=your_key`
3. Restart your server

## 🧪 Test the Fix

After applying any solution:

1. **Check server logs**:
   ```
   🔑 Supabase Service Role Key: Set ✅
   ```

2. **Test API endpoint**:
   ```bash
   curl http://localhost:3001/api/workflows/active
   ```

3. **Test workflow system**:
   - Open `test-local-unified.html`
   - Should show "✅ Workflow system loaded successfully!"

## 🔐 Security Notes

- **Option 1**: Only for testing - makes workflows public
- **Option 2**: Most secure - uses service role authentication  
- **Option 3**: Balanced - allows anonymous access to active workflows only

For production, use Option 2 (service role key) or Option 3 (anonymous policies).

## 🐛 Troubleshooting

**Still getting errors?**

1. Check if policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'workflows';
   ```

2. Check RLS status:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'workflows';
   ```

3. Verify service role key:
   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

**Next Steps After Fix**:
- Test the unified workflow system
- Deploy to Railway with proper environment variables
- Set up proper authentication for production use 