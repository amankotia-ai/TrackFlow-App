-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create node_types table for tracking available node types
CREATE TABLE IF NOT EXISTS public.node_types (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'condition')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  default_config JSONB DEFAULT '{}',
  config_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  target_url TEXT DEFAULT '*',
  executions INTEGER DEFAULT 0,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workflow_nodes table for individual nodes
CREATE TABLE IF NOT EXISTS public.workflow_nodes (
  id TEXT NOT NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  node_type_id TEXT REFERENCES public.node_types(id),
  type TEXT NOT NULL CHECK (type IN ('trigger', 'action', 'condition')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  config JSONB NOT NULL DEFAULT '{}',
  inputs TEXT[] DEFAULT '{}',
  outputs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, workflow_id)
);

-- Create workflow_connections table
CREATE TABLE IF NOT EXISTS public.workflow_connections (
  id TEXT NOT NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  source_handle TEXT NOT NULL,
  target_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, workflow_id),
  FOREIGN KEY (source_node_id, workflow_id) REFERENCES public.workflow_nodes(id, workflow_id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id, workflow_id) REFERENCES public.workflow_nodes(id, workflow_id) ON DELETE CASCADE
);

-- Create workflow_executions table for detailed execution tracking
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  execution_time_ms INTEGER,
  error_message TEXT,
  page_url TEXT,
  user_agent TEXT,
  session_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_events table for tracking user interactions
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'click', 'form_submit', 'field_focus', 'field_blur', 
    'field_change', 'scroll', 'hover', 'custom_workflow_event', 'page_load',
    'element_visible', 'element_hidden', 'time_on_page', 'exit_intent'
  )),
  element_selector TEXT,
  element_text TEXT,
  element_attributes JSONB DEFAULT '{}',
  page_url TEXT,
  page_title TEXT,
  referrer_url TEXT,
  device_type TEXT,
  browser_info JSONB,
  user_agent TEXT,
  viewport_size JSONB,
  screen_size JSONB,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comprehensive visitor events table for all incoming analytics
CREATE TABLE IF NOT EXISTS public.visitor_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT, -- Anonymous visitor identifier
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- If authenticated
  event_type TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  device_type TEXT,
  browser_name TEXT,
  browser_version TEXT,
  operating_system TEXT,
  screen_resolution TEXT,
  viewport_size TEXT,
  user_agent TEXT,
  ip_address INET,
  country_code TEXT,
  city TEXT,
  element_selector TEXT,
  element_text TEXT,
  element_attributes JSONB DEFAULT '{}',
  form_data JSONB DEFAULT '{}',
  scroll_depth INTEGER DEFAULT 0,
  time_on_page INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  custom_properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create page analytics summary table
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  date DATE NOT NULL,
  total_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_form_submissions INTEGER DEFAULT 0,
  utm_sources JSONB DEFAULT '{}',
  device_breakdown JSONB DEFAULT '{}',
  browser_breakdown JSONB DEFAULT '{}',
  top_referrers JSONB DEFAULT '{}',
  exit_pages JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_url, date)
);

-- Create conversion events table
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL, -- 'form_submit', 'purchase', 'signup', 'download', etc.
  conversion_name TEXT,
  page_url TEXT NOT NULL,
  element_selector TEXT,
  conversion_value DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  form_data JSONB DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  attribution_data JSONB DEFAULT '{}',
  funnel_step INTEGER,
  time_to_convert INTEGER, -- seconds from first visit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create UTM analytics table
CREATE TABLE IF NOT EXISTS public.utm_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  total_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_time_on_site INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  pages_per_session DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
);

-- Create workflow page mappings table to link analytics to workflows
CREATE TABLE IF NOT EXISTS public.workflow_page_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  page_url TEXT NOT NULL,
  target_url_pattern TEXT NOT NULL, -- The original target_url from workflow
  match_type TEXT NOT NULL DEFAULT 'contains', -- 'exact', 'contains', 'starts_with', 'regex'
  is_active BOOLEAN DEFAULT true,
  total_matches INTEGER DEFAULT 0,
  last_matched TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, page_url)
);

-- Create workflow_analytics_summary table for aggregated analytics per workflow
CREATE TABLE IF NOT EXISTS public.workflow_analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  avg_execution_time_ms NUMERIC,
  conversion_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, date)
);

-- Create user_sessions table for tracking active user sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  page_url TEXT,
  device_type TEXT,
  browser_info JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create workflow_templates table for shared templates
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  nodes JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_api_keys table for API access
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_target_url ON public.workflows(target_url);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON public.workflow_nodes(type);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow_id ON public.workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_at ON public.workflow_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_id ON public.analytics_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_execution_id ON public.analytics_events(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_summary_workflow_id ON public.workflow_analytics_summary(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_summary_date ON public.workflow_analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_page_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security policies

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Node types - everyone can view node types
CREATE POLICY "Everyone can view node types" ON public.node_types
  FOR SELECT USING (true);

-- Workflows - users can only access their own workflows
CREATE POLICY "Users can view own workflows" ON public.workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows" ON public.workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
  FOR DELETE USING (auth.uid() = user_id);

-- Workflow nodes - users can access nodes of their own workflows
CREATE POLICY "Users can view nodes of own workflows" ON public.workflow_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert nodes in own workflows" ON public.workflow_nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in own workflows" ON public.workflow_nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes from own workflows" ON public.workflow_nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_nodes.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow connections - users can access connections of their own workflows
CREATE POLICY "Users can view connections of own workflows" ON public.workflow_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert connections in own workflows" ON public.workflow_connections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update connections in own workflows" ON public.workflow_connections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete connections from own workflows" ON public.workflow_connections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workflows 
      WHERE workflows.id = workflow_connections.workflow_id 
      AND workflows.user_id = auth.uid()
    )
  );

-- Workflow executions - users can only access their own execution data
CREATE POLICY "Users can view own workflow executions" ON public.workflow_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow executions" ON public.workflow_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Analytics events - users can only access their own analytics
CREATE POLICY "Users can view own analytics events" ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workflow analytics summary - users can only access their own analytics summaries
CREATE POLICY "Users can view own workflow analytics summary" ON public.workflow_analytics_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow analytics summary" ON public.workflow_analytics_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow analytics summary" ON public.workflow_analytics_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- User sessions - users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Workflow templates - users can view public templates and their own
CREATE POLICY "Users can view public templates and own templates" ON public.workflow_templates
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can insert own templates" ON public.workflow_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON public.workflow_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON public.workflow_templates
  FOR DELETE USING (auth.uid() = created_by);

-- User API keys - users can only access their own API keys
CREATE POLICY "Users can view own API keys" ON public.user_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON public.user_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.user_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON public.user_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Visitor events - open access for anonymous tracking, users can see events linked to their workflows
CREATE POLICY "Allow anonymous insert visitor events" ON public.visitor_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view visitor events for their workflows" ON public.visitor_events
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.find_workflows_for_page_url(page_url) fw 
      WHERE fw.user_id = auth.uid()
    )
  );

-- Page analytics - users can view analytics for pages that match their workflows
CREATE POLICY "Users can view page analytics for their workflow pages" ON public.page_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.find_workflows_for_page_url(page_url) fw 
      WHERE fw.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert/update page analytics" ON public.page_analytics
  FOR ALL WITH CHECK (true);

-- Conversion events - users can view conversions for their workflows
CREATE POLICY "Allow anonymous insert conversion events" ON public.conversion_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view conversion events for their workflows" ON public.conversion_events
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workflows w 
      WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
  );

-- UTM analytics - users can view UTM data for pages that match their workflows
CREATE POLICY "Users can view UTM analytics for their workflow pages" ON public.utm_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.visitor_events ve
      JOIN public.find_workflows_for_page_url(ve.page_url) fw ON fw.user_id = auth.uid()
      WHERE ve.utm_source = utm_analytics.utm_source
        AND ve.utm_medium = utm_analytics.utm_medium
        AND ve.utm_campaign = utm_analytics.utm_campaign
      LIMIT 1
    )
  );

CREATE POLICY "System can insert/update UTM analytics" ON public.utm_analytics
  FOR ALL WITH CHECK (true);

-- Workflow page mappings - users can view mappings for their workflows
CREATE POLICY "Users can view workflow page mappings for their workflows" ON public.workflow_page_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workflows w 
      WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert/update workflow page mappings" ON public.workflow_page_mappings
  FOR ALL WITH CHECK (true);

-- Create functions for automatic user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate API keys
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  -- Generate a secure random API key
  key := 'wf_' || encode(gen_random_bytes(32), 'hex');
  RETURN key;
END;
$$ LANGUAGE plpgsql;

-- Create function to track analytics event
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_user_id UUID,
  p_workflow_id UUID,
  p_workflow_execution_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_element_selector TEXT,
  p_element_text TEXT,
  p_page_url TEXT,
  p_device_type TEXT,
  p_event_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.analytics_events (
    user_id, workflow_id, workflow_execution_id, session_id, event_type,
    element_selector, element_text, page_url, device_type, event_data
  ) VALUES (
    p_user_id, p_workflow_id, p_workflow_execution_id, p_session_id, p_event_type,
    p_element_selector, p_element_text, p_page_url, p_device_type, p_event_data
  ) RETURNING id INTO v_event_id;
  
  -- Update workflow analytics summary
  INSERT INTO public.workflow_analytics_summary (
    workflow_id, user_id, date, total_events
  ) VALUES (
    p_workflow_id, p_user_id, CURRENT_DATE, 1
  )
  ON CONFLICT (workflow_id, date) DO UPDATE
  SET total_events = workflow_analytics_summary.total_events + 1,
      updated_at = NOW();
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track workflow execution
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

-- Create function to get active workflows for a URL
CREATE OR REPLACE FUNCTION public.get_active_workflows_for_url(
  p_api_key TEXT,
  p_url TEXT
) RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  nodes JSON,
  connections JSON
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Validate API key and get user
  SELECT user_id INTO v_user_id
  FROM public.user_api_keys
  WHERE api_key = p_api_key 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired API key';
  END IF;
  
  -- Update API key last used
  UPDATE public.user_api_keys
  SET last_used = NOW()
  WHERE api_key = p_api_key;
  
  -- Return active workflows for the URL
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    wn.nodes,
    wn.connections
  FROM public.workflows_with_nodes w
  JOIN LATERAL (
    SELECT * FROM public.workflows_with_nodes wn
    WHERE wn.id = w.id
  ) wn ON true
  WHERE w.user_id = v_user_id
    AND w.is_active = true
    AND w.status = 'active'
    AND (w.target_url = '*' OR p_url LIKE '%' || w.target_url || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to manage user sessions
CREATE OR REPLACE FUNCTION public.manage_user_session(
  p_user_id UUID,
  p_session_id TEXT,
  p_page_url TEXT,
  p_device_type TEXT,
  p_browser_info JSONB
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if session exists
  SELECT id INTO v_session_id
  FROM public.user_sessions
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  IF v_session_id IS NULL THEN
    -- Create new session
    INSERT INTO public.user_sessions (
      user_id, session_id, page_url, device_type, browser_info
    ) VALUES (
      p_user_id, p_session_id, p_page_url, p_device_type, p_browser_info
    ) RETURNING id INTO v_session_id;
  ELSE
    -- Update existing session
    UPDATE public.user_sessions
    SET last_activity = NOW(),
        page_url = p_page_url,
        device_type = COALESCE(p_device_type, device_type),
        browser_info = COALESCE(p_browser_info, browser_info)
    WHERE id = v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create analytics aggregation views
CREATE OR REPLACE VIEW public.workflow_performance_daily AS
SELECT 
  w.id as workflow_id,
  w.name as workflow_name,
  w.user_id,
  was.date,
  was.total_executions,
  was.successful_executions,
  was.failed_executions,
  was.total_events,
  was.unique_sessions,
  was.avg_execution_time_ms,
  was.conversion_count,
  was.conversion_rate,
  CASE 
    WHEN was.total_executions > 0 
    THEN (was.successful_executions::NUMERIC / was.total_executions * 100)
    ELSE 0 
  END as success_rate
FROM public.workflows w
JOIN public.workflow_analytics_summary was ON w.id = was.workflow_id
ORDER BY was.date DESC;

-- Grant access to views
GRANT SELECT ON public.workflow_performance_daily TO authenticated;

-- Create view for real-time analytics
CREATE OR REPLACE VIEW public.workflow_realtime_analytics AS
SELECT 
  w.id as workflow_id,
  w.name as workflow_name,
  w.user_id,
  COUNT(DISTINCT ae.session_id) as active_sessions,
  COUNT(ae.id) as events_last_hour,
  COUNT(DISTINCT ae.page_url) as unique_pages,
  COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END) as click_events,
  COUNT(CASE WHEN ae.event_type = 'form_submit' THEN 1 END) as form_submits,
  COUNT(CASE WHEN ae.event_type = 'page_view' THEN 1 END) as page_views
FROM public.workflows w
LEFT JOIN public.analytics_events ae ON w.id = ae.workflow_id 
  AND ae.created_at > NOW() - INTERVAL '1 hour'
GROUP BY w.id, w.name, w.user_id;

-- Grant access to views
GRANT SELECT ON public.workflow_realtime_analytics TO authenticated;

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_analytics_summary_updated_at BEFORE UPDATE ON public.workflow_analytics_summary
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert node types
INSERT INTO public.node_types (id, type, category, name, description, icon, default_config, config_fields) VALUES
-- Trigger nodes
('page-visit-trigger', 'trigger', 'Visitor Behavior', 'Page Visits', 'Trigger when visitor reaches specific number of page views', 'Eye', 
 '{"visitCount": 3, "timeframe": "session"}',
 '[{"key": "visitCount", "type": "number", "label": "Number of Visits", "required": true, "default": 3}, {"key": "timeframe", "type": "select", "label": "Timeframe", "required": true, "options": [{"value": "session", "label": "Current Session"}, {"value": "day", "label": "Last 24 Hours"}, {"value": "week", "label": "Last 7 Days"}, {"value": "month", "label": "Last 30 Days"}]}]'
),
('time-on-page-trigger', 'trigger', 'Visitor Behavior', 'Time on Page', 'Trigger when visitor spends specific time on page', 'Clock',
 '{"duration": 30, "unit": "seconds"}',
 '[{"key": "duration", "type": "number", "label": "Duration", "required": true, "default": 30}, {"key": "unit", "type": "select", "label": "Time Unit", "required": true, "options": [{"value": "seconds", "label": "Seconds"}, {"value": "minutes", "label": "Minutes"}]}]'
),
('device-type-trigger', 'trigger', 'Device & Browser', 'Device Type', 'Trigger based on visitor device type', 'Smartphone',
 '{"deviceType": "mobile"}',
 '[{"key": "deviceType", "type": "select", "label": "Device Type", "required": true, "options": [{"value": "mobile", "label": "Mobile"}, {"value": "tablet", "label": "Tablet"}, {"value": "desktop", "label": "Desktop"}]}]'
),
('utm-parameters-trigger', 'trigger', 'Traffic Source', 'UTM Parameters', 'Trigger based on incoming UTM parameters', 'Link',
 '{"parameter": "utm_source", "operator": "equals", "value": ""}',
 '[{"key": "parameter", "type": "select", "label": "UTM Parameter", "required": true, "options": [{"value": "utm_source", "label": "utm_source"}, {"value": "utm_medium", "label": "utm_medium"}, {"value": "utm_campaign", "label": "utm_campaign"}]}, {"key": "operator", "type": "select", "label": "Condition", "required": true, "options": [{"value": "equals", "label": "Equals"}, {"value": "contains", "label": "Contains"}]}, {"key": "value", "type": "text", "label": "Value", "required": true}]'
),
-- Action nodes
('replace-text-action', 'action', 'Content Modification', 'Replace Text', 'Replace text content on the page', 'Type',
 '{"selector": "", "newText": "", "originalText": ""}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "newText", "type": "text", "label": "New Text", "required": true}, {"key": "originalText", "type": "text", "label": "Original Text", "required": false}]'
),
('show-element-action', 'action', 'User Interface', 'Show Element', 'Show hidden element with animation', 'Eye',
 '{"selector": "", "animation": "fade"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "none", "label": "No Animation"}, {"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}]}]'
),
('hide-element-action', 'action', 'User Interface', 'Hide Element', 'Hide element with animation', 'EyeOff',
 '{"selector": "", "animation": "fade"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "none", "label": "No Animation"}, {"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}]}]'
),
-- More trigger nodes
('scroll-depth-trigger', 'trigger', 'Visitor Behavior', 'Scroll Depth', 'Trigger when visitor scrolls to specific page depth', 'ArrowDown',
 '{"percentage": 50, "element": ""}',
 '[{"key": "percentage", "type": "number", "label": "Scroll Percentage", "required": true, "default": 50}, {"key": "element", "type": "css-selector", "label": "Target Element", "required": false}]'
),
('exit-intent-trigger', 'trigger', 'Engagement', 'Exit Intent', 'Trigger when user shows intent to leave the page', 'LogOut',
 '{"sensitivity": "medium", "delay": 500}',
 '[{"key": "sensitivity", "type": "select", "label": "Detection Sensitivity", "required": true, "options": [{"value": "low", "label": "Low"}, {"value": "medium", "label": "Medium"}, {"value": "high", "label": "High"}]}, {"key": "delay", "type": "number", "label": "Delay (ms)", "required": true, "default": 500}]'
),
('element-click-trigger', 'trigger', 'Element Interaction', 'Element Click', 'Trigger when specific element is clicked', 'MousePointer',
 '{"selector": "", "eventType": "click"}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "eventType", "type": "select", "label": "Event Type", "required": true, "options": [{"value": "click", "label": "Click"}, {"value": "dblclick", "label": "Double Click"}]}]'
),
('geolocation-trigger', 'trigger', 'Location', 'Geolocation', 'Trigger based on visitor geographic location', 'MapPin',
 '{"locationType": "country", "locations": [], "condition": "is_in"}',
 '[{"key": "locationType", "type": "select", "label": "Location Type", "required": true, "options": [{"value": "country", "label": "Country"}, {"value": "state", "label": "State/Region"}, {"value": "city", "label": "City"}]}, {"key": "locations", "type": "textarea", "label": "Target Locations", "required": true}, {"key": "condition", "type": "select", "label": "Condition", "required": true, "options": [{"value": "is_in", "label": "Is in list"}, {"value": "not_in", "label": "Is not in list"}]}]'
),
-- More action nodes
('display-overlay-action', 'action', 'User Interface', 'Display Overlay', 'Show modal or overlay with custom content', 'Square',
 '{"content": "", "animation": "fade", "position": "center"}',
 '[{"key": "content", "type": "textarea", "label": "Overlay Content (HTML)", "required": true}, {"key": "animation", "type": "select", "label": "Animation", "required": true, "options": [{"value": "fade", "label": "Fade"}, {"value": "slide", "label": "Slide"}, {"value": "zoom", "label": "Zoom"}]}, {"key": "position", "type": "select", "label": "Position", "required": true, "options": [{"value": "center", "label": "Center"}, {"value": "top", "label": "Top"}, {"value": "bottom", "label": "Bottom"}]}]'
),
('modify-css-action', 'action', 'Style Modification', 'Modify CSS', 'Modify CSS properties of elements', 'Palette',
 '{"selector": "", "property": "", "value": ""}',
 '[{"key": "selector", "type": "css-selector", "label": "Element Selector", "required": true}, {"key": "property", "type": "text", "label": "CSS Property", "required": true}, {"key": "value", "type": "text", "label": "CSS Value", "required": true}]'
),
('redirect-action', 'action', 'Navigation', 'Redirect', 'Redirect visitor to another page', 'ExternalLink',
 '{"url": "", "delay": 0, "newTab": false}',
 '[{"key": "url", "type": "url", "label": "Redirect URL", "required": true}, {"key": "delay", "type": "number", "label": "Delay (ms)", "required": true, "default": 0}, {"key": "newTab", "type": "boolean", "label": "Open in New Tab", "required": true, "default": false}]'
),
('custom-event-action', 'action', 'Analytics', 'Custom Event', 'Send custom analytics event', 'BarChart',
 '{"eventName": "", "eventData": "{}"}',
 '[{"key": "eventName", "type": "text", "label": "Event Name", "required": true}, {"key": "eventData", "type": "textarea", "label": "Event Data (JSON)", "required": false, "default": "{}"}]'
)
ON CONFLICT (id) DO NOTHING;

-- Note: Demo workflow templates will be created after first user signup
-- You can run this separately after creating your first user:
/*
INSERT INTO public.workflow_templates (created_by, name, description, category, is_public, nodes, connections) VALUES 
(
  (SELECT id FROM auth.users LIMIT 1),
  'Mobile CTA Optimization',
  'Optimize call-to-action buttons for mobile users',
  'Device Optimization',
  true,
  '[
    {
      "id": "trigger-1",
      "type": "trigger",
      "category": "Device & Browser",
      "name": "Device Type",
      "description": "Trigger for mobile devices",
      "icon": "Smartphone",
      "position": {"x": 100, "y": 50},
      "config": {"deviceType": "mobile"},
      "inputs": [],
      "outputs": ["output"]
    },
    {
      "id": "action-1",
      "type": "action",
      "category": "Content Modification",
      "name": "Replace Text",
      "description": "Replace button text for mobile",
      "icon": "Type",
      "position": {"x": 400, "y": 50},
      "config": {
        "selector": ".cta-button, button, .btn",
        "newText": "Tap to Get Started",
        "originalText": "Click to Get Started"
      },
      "inputs": ["input"],
      "outputs": ["output"]
    }
  ]',
  '[
    {
      "id": "conn-1",
      "sourceNodeId": "trigger-1",
      "targetNodeId": "action-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]'
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'UTM Google Personalization',
  'Personalize content for visitors from Google',
  'Traffic Source',
  true,
  '[
    {
      "id": "trigger-2",
      "type": "trigger",
      "category": "Traffic Source",
      "name": "UTM Parameters",
      "description": "Trigger for Google traffic",
      "icon": "Link",
      "position": {"x": 100, "y": 50},
      "config": {
        "parameter": "utm_source",
        "value": "google",
        "operator": "equals"
      },
      "inputs": [],
      "outputs": ["output"]
    },
    {
      "id": "action-2",
      "type": "action",
      "category": "Content Modification",
      "name": "Replace Text",
      "description": "Replace headline for Google traffic",
      "icon": "Type",
      "position": {"x": 400, "y": 50},
      "config": {
        "selector": "h1, .hero-headline",
        "newText": "Welcome from Google! Special offer inside."
      },
      "inputs": ["input"],
      "outputs": ["output"]
    }
  ]',
  '[
    {
      "id": "conn-2",
      "sourceNodeId": "trigger-2",
      "targetNodeId": "action-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]'
);
*/

-- Create views for easier data access
CREATE OR REPLACE VIEW public.workflows_with_nodes AS
SELECT 
  w.*,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', wn.id,
        'type', wn.type,
        'category', wn.category,
        'name', wn.name,
        'description', wn.description,
        'icon', wn.icon,
        'position', wn.position,
        'config', wn.config,
        'inputs', wn.inputs,
        'outputs', wn.outputs
      )
    ) FILTER (WHERE wn.id IS NOT NULL),
    '[]'::json
  ) as nodes,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', wc.id,
        'sourceNodeId', wc.source_node_id,
        'targetNodeId', wc.target_node_id,
        'sourceHandle', wc.source_handle,
        'targetHandle', wc.target_handle
      )
    ) FILTER (WHERE wc.id IS NOT NULL),
    '[]'::json
  ) as connections
FROM public.workflows w
LEFT JOIN public.workflow_nodes wn ON w.id = wn.workflow_id
LEFT JOIN public.workflow_connections wc ON w.id = wc.workflow_id
GROUP BY w.id;

-- Grant access to the view
GRANT SELECT ON public.workflows_with_nodes TO authenticated;

-- Create function to save workflow with nodes and connections
CREATE OR REPLACE FUNCTION public.save_workflow_complete(
  p_workflow_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_is_active BOOLEAN,
  p_status TEXT,
  p_target_url TEXT,
  p_nodes JSONB,
  p_connections JSONB
) RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Insert or update workflow
  IF p_workflow_id IS NULL THEN
    INSERT INTO public.workflows (user_id, name, description, is_active, status, target_url)
    VALUES (p_user_id, p_name, p_description, p_is_active, p_status, p_target_url)
    RETURNING id INTO v_workflow_id;
  ELSE
    UPDATE public.workflows
    SET name = p_name,
        description = p_description,
        is_active = p_is_active,
        status = p_status,
        target_url = p_target_url,
        updated_at = NOW()
    WHERE id = p_workflow_id AND user_id = p_user_id
    RETURNING id INTO v_workflow_id;
    
    -- Delete existing nodes and connections
    DELETE FROM public.workflow_connections WHERE workflow_id = v_workflow_id;
    DELETE FROM public.workflow_nodes WHERE workflow_id = v_workflow_id;
  END IF;
  
  -- Insert nodes
  IF p_nodes IS NOT NULL AND jsonb_array_length(p_nodes) > 0 THEN
    INSERT INTO public.workflow_nodes (id, workflow_id, node_type_id, type, category, name, description, icon, position, config, inputs, outputs)
    SELECT 
      (node->>'id')::TEXT,
      v_workflow_id,
      NULL, -- node_type_id can be set if needed
      (node->>'type')::TEXT,
      (node->>'category')::TEXT,
      (node->>'name')::TEXT,
      (node->>'description')::TEXT,
      (node->>'icon')::TEXT,
      (node->'position')::JSONB,
      (node->'config')::JSONB,
      ARRAY(SELECT jsonb_array_elements_text(node->'inputs')),
      ARRAY(SELECT jsonb_array_elements_text(node->'outputs'))
    FROM jsonb_array_elements(p_nodes) AS node;
  END IF;
  
  -- Insert connections
  IF p_connections IS NOT NULL AND jsonb_array_length(p_connections) > 0 THEN
    INSERT INTO public.workflow_connections (id, workflow_id, source_node_id, target_node_id, source_handle, target_handle)
    SELECT 
      (conn->>'id')::TEXT,
      v_workflow_id,
      (conn->>'sourceNodeId')::TEXT,
      (conn->>'targetNodeId')::TEXT,
      (conn->>'sourceHandle')::TEXT,
      (conn->>'targetHandle')::TEXT
    FROM jsonb_array_elements(p_connections) AS conn;
  END IF;
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('user-assets', 'user-assets', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('workflow-exports', 'workflow-exports', false, 10485760, ARRAY['application/json', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own exports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own exports" ON storage.objects
  FOR SELECT USING (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own exports" ON storage.objects
  FOR DELETE USING (bucket_id = 'workflow-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_workflow_session ON public.analytics_events(workflow_id, session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_api_key ON public.user_api_keys(api_key);

-- Indexes for new analytics tables
CREATE INDEX IF NOT EXISTS idx_visitor_events_session_id ON public.visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_page_url ON public.visitor_events(page_url);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON public.visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_events_event_type ON public.visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_visitor_events_utm_source ON public.visitor_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_visitor_events_device_type ON public.visitor_events(device_type);
CREATE INDEX IF NOT EXISTS idx_page_analytics_page_url ON public.page_analytics(page_url);
CREATE INDEX IF NOT EXISTS idx_page_analytics_date ON public.page_analytics(date);
CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON public.conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_workflow_id ON public.conversion_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_conversion_type ON public.conversion_events(conversion_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at ON public.conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_utm_analytics_date ON public.utm_analytics(date);
CREATE INDEX IF NOT EXISTS idx_utm_analytics_utm_source ON public.utm_analytics(utm_source);
CREATE INDEX IF NOT EXISTS idx_workflow_page_mappings_workflow_id ON public.workflow_page_mappings(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_page_mappings_page_url ON public.workflow_page_mappings(page_url);

-- Create function to clean up old sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_activity < NOW() - INTERVAL '24 hours'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's workflow statistics
CREATE OR REPLACE FUNCTION public.get_user_workflow_stats(p_user_id UUID)
RETURNS TABLE (
  total_workflows INTEGER,
  active_workflows INTEGER,
  total_executions INTEGER,
  total_events INTEGER,
  avg_success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT w.id)::INTEGER as total_workflows,
    COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END)::INTEGER as active_workflows,
    COALESCE(SUM(was.total_executions), 0)::INTEGER as total_executions,
    COALESCE(SUM(was.total_events), 0)::INTEGER as total_events,
    CASE 
      WHEN SUM(was.total_executions) > 0 
      THEN (SUM(was.successful_executions)::NUMERIC / SUM(was.total_executions) * 100)
      ELSE 0 
    END as avg_success_rate
  FROM public.workflows w
  LEFT JOIN public.workflow_analytics_summary was ON w.id = was.workflow_id
  WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to find workflows matching a page URL
CREATE OR REPLACE FUNCTION public.find_workflows_for_page_url(
  p_page_url TEXT
) RETURNS TABLE (
  workflow_id UUID,
  user_id UUID,
  workflow_name TEXT,
  target_url TEXT,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as workflow_id,
    w.user_id,
    w.name as workflow_name,
    w.target_url,
    CASE 
      WHEN w.target_url = '*' THEN 'universal'
      WHEN w.target_url = p_page_url THEN 'exact'
      WHEN w.target_url LIKE '%/%' AND p_page_url LIKE '%' || w.target_url || '%' THEN 'path'
      WHEN p_page_url LIKE '%' || w.target_url || '%' THEN 'contains'
      ELSE 'no_match'
    END as match_type
  FROM public.workflows w
  WHERE w.is_active = true 
    AND w.status = 'active'
    AND (
      w.target_url = '*' OR
      w.target_url = p_page_url OR
      p_page_url LIKE '%' || w.target_url || '%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track comprehensive visitor event
CREATE OR REPLACE FUNCTION public.track_visitor_event(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_user_id UUID,
  p_event_type TEXT,
  p_page_url TEXT,
  p_page_title TEXT,
  p_referrer_url TEXT,
  p_utm_source TEXT,
  p_utm_medium TEXT,
  p_utm_campaign TEXT,
  p_utm_content TEXT,
  p_utm_term TEXT,
  p_device_type TEXT,
  p_browser_name TEXT,
  p_browser_version TEXT,
  p_operating_system TEXT,
  p_screen_resolution TEXT,
  p_viewport_size TEXT,
  p_user_agent TEXT,
  p_ip_address INET,
  p_country_code TEXT,
  p_city TEXT,
  p_element_selector TEXT,
  p_element_text TEXT,
  p_element_attributes JSONB,
  p_form_data JSONB,
  p_scroll_depth INTEGER,
  p_time_on_page INTEGER,
  p_conversion_value DECIMAL,
  p_custom_properties JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_workflow_rec RECORD;
BEGIN
  -- Insert the visitor event
  INSERT INTO public.visitor_events (
    session_id, visitor_id, user_id, event_type, page_url, page_title, referrer_url,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    device_type, browser_name, browser_version, operating_system,
    screen_resolution, viewport_size, user_agent, ip_address,
    country_code, city, element_selector, element_text, element_attributes,
    form_data, scroll_depth, time_on_page, conversion_value, custom_properties
  ) VALUES (
    p_session_id, p_visitor_id, p_user_id, p_event_type, p_page_url, p_page_title, p_referrer_url,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_device_type, p_browser_name, p_browser_version, p_operating_system,
    p_screen_resolution, p_viewport_size, p_user_agent, p_ip_address,
    p_country_code, p_city, p_element_selector, p_element_text, p_element_attributes,
    p_form_data, p_scroll_depth, p_time_on_page, p_conversion_value, p_custom_properties
  ) RETURNING id INTO v_event_id;

  -- Link event to workflows that match the page URL
  FOR v_workflow_rec IN 
    SELECT workflow_id, user_id FROM public.find_workflows_for_page_url(p_page_url)
  LOOP
    -- Insert/update workflow page mapping
    INSERT INTO public.workflow_page_mappings (
      workflow_id, page_url, target_url_pattern, total_matches, last_matched
    ) 
    SELECT 
      v_workflow_rec.workflow_id, 
      p_page_url, 
      w.target_url, 
      1, 
      NOW()
    FROM public.workflows w 
    WHERE w.id = v_workflow_rec.workflow_id
    ON CONFLICT (workflow_id, page_url) DO UPDATE
    SET total_matches = workflow_page_mappings.total_matches + 1,
        last_matched = NOW();

    -- If this is a conversion event, track it
    IF p_event_type IN ('form_submit', 'purchase', 'signup', 'download', 'conversion') THEN
      INSERT INTO public.conversion_events (
        session_id, visitor_id, user_id, workflow_id, conversion_type,
        page_url, element_selector, conversion_value, form_data,
        utm_source, utm_medium, utm_campaign
      ) VALUES (
        p_session_id, p_visitor_id, p_user_id, v_workflow_rec.workflow_id, p_event_type,
        p_page_url, p_element_selector, p_conversion_value, p_form_data,
        p_utm_source, p_utm_medium, p_utm_campaign
      );
    END IF;
  END LOOP;

  -- Update page analytics summary
  INSERT INTO public.page_analytics (
    page_url, date, total_visits, unique_visitors, total_pageviews
  ) VALUES (
    p_page_url, CURRENT_DATE, 
    CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END
  )
  ON CONFLICT (page_url, date) DO UPDATE
  SET total_visits = public.page_analytics.total_visits + CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
      total_pageviews = public.page_analytics.total_pageviews + CASE WHEN p_event_type = 'page_view' THEN 1 ELSE 0 END,
      updated_at = NOW();

  -- Update UTM analytics if UTM parameters present
  IF p_utm_source IS NOT NULL AND p_event_type = 'page_view' THEN
    INSERT INTO public.utm_analytics (
      date, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      total_visits, unique_visitors
    ) VALUES (
      CURRENT_DATE, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
      1, 1
    )
    ON CONFLICT (date, utm_source, utm_medium, utm_campaign, utm_content, utm_term) DO UPDATE
    SET total_visits = public.utm_analytics.total_visits + 1,
        updated_at = NOW();
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get comprehensive analytics for a user
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_analytics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  total_visitors INTEGER,
  total_pageviews INTEGER,
  total_sessions INTEGER,
  total_conversions INTEGER,
  conversion_rate DECIMAL,
  top_pages JSONB,
  top_utm_sources JSONB,
  device_breakdown JSONB,
  daily_stats JSONB
) AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - INTERVAL '1 day' * p_days;
  
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ve.visitor_id)::INTEGER as total_visitors,
    COUNT(CASE WHEN ve.event_type = 'page_view' THEN 1 END)::INTEGER as total_pageviews,
    COUNT(DISTINCT ve.session_id)::INTEGER as total_sessions,
    COUNT(CASE WHEN ve.event_type IN ('form_submit', 'purchase', 'signup', 'conversion') THEN 1 END)::INTEGER as total_conversions,
    CASE 
      WHEN COUNT(DISTINCT ve.session_id) > 0 
      THEN (COUNT(CASE WHEN ve.event_type IN ('form_submit', 'purchase', 'signup', 'conversion') THEN 1 END)::DECIMAL / COUNT(DISTINCT ve.session_id) * 100)
      ELSE 0 
    END as conversion_rate,
    
    -- Top pages
    (SELECT json_agg(json_build_object('page_url', page_url, 'visits', visits))
     FROM (
       SELECT ve2.page_url, COUNT(*) as visits
       FROM public.visitor_events ve2
       JOIN public.find_workflows_for_page_url(ve2.page_url) fw ON fw.user_id = p_user_id
       WHERE ve2.created_at >= v_start_date AND ve2.event_type = 'page_view'
       GROUP BY ve2.page_url
       ORDER BY visits DESC
       LIMIT 10
     ) top_pages_sub
    ) as top_pages,
    
    -- Top UTM sources
    (SELECT json_agg(json_build_object('utm_source', utm_source, 'visits', visits))
     FROM (
       SELECT COALESCE(ve3.utm_source, 'direct') as utm_source, COUNT(*) as visits
       FROM public.visitor_events ve3
       JOIN public.find_workflows_for_page_url(ve3.page_url) fw ON fw.user_id = p_user_id
       WHERE ve3.created_at >= v_start_date AND ve3.event_type = 'page_view'
       GROUP BY utm_source
       ORDER BY visits DESC
       LIMIT 5
     ) top_utm_sub
    ) as top_utm_sources,
    
    -- Device breakdown
    (SELECT json_agg(json_build_object('device_type', device_type, 'count', count))
     FROM (
       SELECT COALESCE(ve4.device_type, 'unknown') as device_type, COUNT(*) as count
       FROM public.visitor_events ve4
       JOIN public.find_workflows_for_page_url(ve4.page_url) fw ON fw.user_id = p_user_id
       WHERE ve4.created_at >= v_start_date
       GROUP BY device_type
     ) device_sub
    ) as device_breakdown,
    
    -- Daily stats for the last 30 days
    (SELECT json_agg(json_build_object('date', date, 'visitors', visitors, 'pageviews', pageviews, 'conversions', conversions))
     FROM (
       SELECT 
         ve5.created_at::DATE as date,
         COUNT(DISTINCT ve5.visitor_id) as visitors,
         COUNT(CASE WHEN ve5.event_type = 'page_view' THEN 1 END) as pageviews,
         COUNT(CASE WHEN ve5.event_type IN ('form_submit', 'purchase', 'signup', 'conversion') THEN 1 END) as conversions
       FROM public.visitor_events ve5
       JOIN public.find_workflows_for_page_url(ve5.page_url) fw ON fw.user_id = p_user_id
       WHERE ve5.created_at >= v_start_date
       GROUP BY date
       ORDER BY date
     ) daily_sub
    ) as daily_stats
    
  FROM public.visitor_events ve
  JOIN public.find_workflows_for_page_url(ve.page_url) fw ON fw.user_id = p_user_id
  WHERE ve.created_at >= v_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.save_workflow_complete TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_analytics_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_workflow_execution TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workflow_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_workflows_for_page_url TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.track_visitor_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_analytics TO authenticated;

-- Note: get_active_workflows_for_url should be accessible via API key, not auth
GRANT EXECUTE ON FUNCTION public.get_active_workflows_for_url TO anon, authenticated;

/*
=============================================================================
SCHEMA DOCUMENTATION
=============================================================================

This schema provides a complete workflow automation system with:

1. USER MANAGEMENT
   - users: Extended auth.users with profile data
   - user_api_keys: API keys for external access

2. WORKFLOW SYSTEM
   - workflows: Main workflow definitions
   - workflow_nodes: Individual nodes within workflows
   - workflow_connections: Connections between nodes
   - node_types: Available node types and their configurations
   - workflow_templates: Shareable workflow templates

3. ANALYTICS & TRACKING
   - analytics_events: All user interaction events
   - workflow_executions: Workflow execution history
   - workflow_analytics_summary: Aggregated daily analytics
   - user_sessions: Active user sessions

4. VIEWS
   - workflows_with_nodes: Complete workflow data with nodes/connections
   - workflow_performance_daily: Daily performance metrics
   - workflow_realtime_analytics: Real-time analytics data

5. KEY FUNCTIONS
   - save_workflow_complete(): Save workflow with all nodes/connections
   - get_active_workflows_for_url(): Get workflows for external sites
   - track_analytics_event(): Track user interactions
   - track_workflow_execution(): Track workflow runs
   - manage_user_session(): Manage user sessions
   - get_user_workflow_stats(): Get user statistics

6. SECURITY
   - Row Level Security (RLS) enabled on all tables
   - Users can only access their own data
   - API key authentication for external access
   - Public templates with proper access control

7. STORAGE BUCKETS
   - user-assets: User uploaded images/assets
   - workflow-exports: Workflow export files

USAGE NOTES:
- All timestamps are in UTC
- Workflow nodes and connections are stored separately for flexibility
- Analytics are aggregated daily for performance
- API keys use the format: wf_[32-byte-hex]
- Sessions expire after 24 hours of inactivity

=============================================================================
*/ 