-- Temporary fix: Disable RLS on workflows table
-- Run this in your Supabase SQL Editor

-- Disable RLS temporarily for testing
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections DISABLE ROW LEVEL SECURITY;

-- Create a policy for anonymous access to active workflows (more secure alternative)
-- Uncomment these if you want to re-enable RLS with anonymous access:

-- ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anonymous access to active workflows" ON public.workflows
--   FOR SELECT USING (is_active = true AND status = 'active');

-- ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;  
-- CREATE POLICY "Allow anonymous access to nodes of active workflows" ON public.workflow_nodes
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.workflows 
--       WHERE workflows.id = workflow_nodes.workflow_id 
--       AND workflows.is_active = true 
--       AND workflows.status = 'active'
--     )
--   );

-- ALTER TABLE public.workflow_connections ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anonymous access to connections of active workflows" ON public.workflow_connections
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.workflows 
--       WHERE workflows.id = workflow_connections.workflow_id 
--       AND workflows.is_active = true 
--       AND workflows.status = 'active'
--     )
--   );

-- Note: This is a temporary fix for testing. For production, use proper authentication. 