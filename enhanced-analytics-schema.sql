-- Enhanced Analytics System - Complete SQL Script
-- This script adds comprehensive analytics tracking with workflow-URL linking
-- Run this after your existing supabase-schema.sql

-- =====================================================================
-- NEW ANALYTICS TABLES
-- =====================================================================

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

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

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

-- =====================================================================
-- ANALYTICS FUNCTIONS (Create before RLS policies that reference them)
-- =====================================================================

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

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.find_workflows_for_page_url TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.track_visitor_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_analytics TO authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY (After functions are created)
-- =====================================================================

-- Enable Row Level Security on new tables
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_page_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

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

-- =====================================================================
-- SUMMARY
-- =====================================================================

-- This script creates a comprehensive analytics system that:
-- 1. Tracks all visitor events with full context (UTM, device, etc.)
-- 2. Automatically links events to workflows based on target URLs
-- 3. Aggregates data for easy reporting and visualization
-- 4. Maintains security with Row Level Security policies
-- 5. Provides functions for easy data retrieval and analysis
--
-- The system captures:
-- - Page views, clicks, form submissions, conversions
-- - UTM parameters for attribution tracking
-- - Device/browser information for segmentation
-- - Time-based metrics and user journeys
-- - Automatic workflow-to-page mapping
--
-- Usage:
-- 1. Run this script in your Supabase SQL editor
-- 2. Update your client-side tracking to use the enhanced endpoints
-- 3. Analytics will be automatically linked to workflows based on target URLs
-- 4. Use the comprehensive analytics dashboard to view insights 