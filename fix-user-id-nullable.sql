-- Fix for workflow_executions table - Make user_id nullable for anonymous executions
-- This allows tracking of workflow executions for public/anonymous users

-- Drop the NOT NULL constraint on user_id
ALTER TABLE public.workflow_executions 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint temporarily
ALTER TABLE public.workflow_executions 
DROP CONSTRAINT workflow_executions_user_id_fkey;

-- Add back the foreign key constraint but allow NULL values
ALTER TABLE public.workflow_executions 
ADD CONSTRAINT workflow_executions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update the RLS policies to allow anonymous executions
DROP POLICY IF EXISTS "Users can view own workflow executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can insert own workflow executions" ON public.workflow_executions;

-- Create new policies that handle both authenticated and anonymous users
CREATE POLICY "Users can view own workflow executions or anonymous" ON public.workflow_executions
  FOR SELECT USING (
    user_id IS NULL OR auth.uid() = user_id
  );

CREATE POLICY "Users can insert workflow executions" ON public.workflow_executions
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- Also update the track_workflow_execution function to handle null user_id in analytics
CREATE OR REPLACE FUNCTION public.track_workflow_execution(
  p_workflow_id UUID,
  p_user_id UUID,
  p_status TEXT,
  p_execution_time_ms INTEGER,
  p_error_message TEXT,
  p_page_url TEXT,
  p_session_id TEXT,
  p_user_agent TEXT
) RETURNS UUID AS $$
DECLARE
  v_execution_id UUID;
BEGIN
  INSERT INTO public.workflow_executions (
    workflow_id, user_id, status, execution_time_ms, 
    error_message, page_url, session_id, user_agent
  ) VALUES (
    p_workflow_id, p_user_id, p_status, p_execution_time_ms,
    p_error_message, p_page_url, p_session_id, p_user_agent
  ) RETURNING id INTO v_execution_id;
  
  -- Update workflow execution count and last run
  UPDATE public.workflows
  SET executions = executions + 1,
      last_run = NOW()
  WHERE id = p_workflow_id;
  
  -- Update analytics summary only if user_id is provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.workflow_analytics_summary (
      workflow_id, user_id, date, total_executions,
      successful_executions, failed_executions, avg_execution_time_ms
    ) VALUES (
      p_workflow_id, p_user_id, CURRENT_DATE, 1,
      CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
      CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
      p_execution_time_ms
    )
    ON CONFLICT (workflow_id, date) DO UPDATE
    SET total_executions = workflow_analytics_summary.total_executions + 1,
        successful_executions = workflow_analytics_summary.successful_executions + 
          CASE WHEN p_status = 'success' THEN 1 ELSE 0 END,
        failed_executions = workflow_analytics_summary.failed_executions + 
          CASE WHEN p_status = 'error' THEN 1 ELSE 0 END,
        avg_execution_time_ms = (
          (workflow_analytics_summary.avg_execution_time_ms * workflow_analytics_summary.total_executions + p_execution_time_ms) /
          (workflow_analytics_summary.total_executions + 1)
        ),
        updated_at = NOW();
  END IF;
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 