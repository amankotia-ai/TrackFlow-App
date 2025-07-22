-- Fix for track_workflow_execution function - Add missing p_user_agent parameter
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
  
  -- Update analytics summary
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
  
  RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 