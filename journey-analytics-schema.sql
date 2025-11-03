-- ============================================================================
-- TrackFlow Journey Analytics Schema (Cookie-Free)
-- Cookie-free user journey tracking and buying intent detection
-- ============================================================================

-- Create user_journeys table to store session-based journey data
CREATE TABLE IF NOT EXISTS public.user_journeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Journey metadata
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Landing & exit pages
  landing_page TEXT,
  exit_page TEXT,
  referrer TEXT,
  
  -- UTM attribution
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Device & browser info
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  timezone TEXT,
  
  -- Journey metrics
  page_count INTEGER DEFAULT 0,
  event_count INTEGER DEFAULT 0,
  total_time_ms INTEGER DEFAULT 0,
  avg_time_per_page_ms INTEGER DEFAULT 0,
  avg_scroll_depth NUMERIC(5,2) DEFAULT 0,
  
  -- Buying intent analytics
  intent_score NUMERIC(3,2) DEFAULT 0, -- 0.00 to 1.00
  intent_level TEXT, -- low, medium, high
  intent_signals_count INTEGER DEFAULT 0,
  
  -- Visit tracking
  visit_number INTEGER DEFAULT 1,
  days_since_first_visit INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_journeys_session_id ON public.user_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_user_id ON public.user_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_intent_level ON public.user_journeys(intent_level);
CREATE INDEX IF NOT EXISTS idx_user_journeys_intent_score ON public.user_journeys(intent_score);
CREATE INDEX IF NOT EXISTS idx_user_journeys_started_at ON public.user_journeys(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_journeys_active ON public.user_journeys(is_active) WHERE is_active = true;


-- Create journey_pages table to track individual page visits within a journey
CREATE TABLE IF NOT EXISTS public.journey_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.user_journeys(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  
  -- Page info
  page_path TEXT NOT NULL,
  page_url TEXT,
  page_title TEXT,
  referrer TEXT,
  
  -- Timing
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  time_on_page_ms INTEGER DEFAULT 0,
  
  -- Engagement metrics
  scroll_depth NUMERIC(5,2) DEFAULT 0, -- 0 to 100
  interaction_count INTEGER DEFAULT 0,
  
  -- Page sequence
  page_sequence INTEGER, -- Order in the journey (1, 2, 3, etc.)
  
  -- Viewport at time of visit
  viewport_width INTEGER,
  viewport_height INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_journey_pages_journey_id ON public.journey_pages(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_pages_session_id ON public.journey_pages(session_id);
CREATE INDEX IF NOT EXISTS idx_journey_pages_page_path ON public.journey_pages(page_path);
CREATE INDEX IF NOT EXISTS idx_journey_pages_sequence ON public.journey_pages(journey_id, page_sequence);


-- Create journey_events table to track specific events within a journey
CREATE TABLE IF NOT EXISTS public.journey_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.user_journeys(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.journey_pages(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- click, form_focus, scroll, etc.
  event_target TEXT, -- Element selector or description
  event_data JSONB,
  
  -- Classification
  is_intent_signal BOOLEAN DEFAULT false,
  intent_category TEXT, -- pricing, checkout, form_interaction, etc.
  
  -- Context
  page_path TEXT,
  page_sequence INTEGER,
  
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_journey_events_journey_id ON public.journey_events(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_session_id ON public.journey_events(session_id);
CREATE INDEX IF NOT EXISTS idx_journey_events_type ON public.journey_events(event_type);
CREATE INDEX IF NOT EXISTS idx_journey_events_intent ON public.journey_events(is_intent_signal) WHERE is_intent_signal = true;
CREATE INDEX IF NOT EXISTS idx_journey_events_occurred_at ON public.journey_events(occurred_at DESC);


-- Create journey_intent_signals table for detailed intent tracking
CREATE TABLE IF NOT EXISTS public.journey_intent_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.user_journeys(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.journey_events(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Signal details
  signal_type TEXT NOT NULL, -- pricing_page_visit, checkout_attempt, form_submit, etc.
  signal_strength NUMERIC(3,2), -- 0.00 to 1.00
  signal_category TEXT, -- high_intent, medium_intent, low_intent
  
  -- Context
  page_path TEXT,
  event_target TEXT,
  additional_data JSONB,
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_intent_signals_journey_id ON public.journey_intent_signals(journey_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_session_id ON public.journey_intent_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_intent_signals_type ON public.journey_intent_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_intent_signals_category ON public.journey_intent_signals(signal_category);


-- Create journey_funnels table to track predefined conversion funnels
CREATE TABLE IF NOT EXISTS public.journey_funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Funnel steps (ordered array of page paths)
  steps JSONB NOT NULL, -- [{"path": "/home", "name": "Landing"}, {"path": "/pricing", "name": "Pricing"}, ...]
  
  -- Funnel metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Create journey_funnel_progress table to track user progress through funnels
CREATE TABLE IF NOT EXISTS public.journey_funnel_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.user_journeys(id) ON DELETE CASCADE NOT NULL,
  funnel_id UUID REFERENCES public.journey_funnels(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  
  -- Progress tracking
  current_step INTEGER DEFAULT 0,
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  
  -- Drop-off tracking
  dropped_at_step INTEGER,
  drop_off_page TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_to_complete_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(journey_id, funnel_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_funnel_progress_journey_id ON public.journey_funnel_progress(journey_id);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_funnel_id ON public.journey_funnel_progress(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_progress_completed ON public.journey_funnel_progress(is_completed);


-- Create journey_analytics_summary for daily aggregated analytics
CREATE TABLE IF NOT EXISTS public.journey_analytics_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  
  -- Journey metrics
  total_journeys INTEGER DEFAULT 0,
  active_journeys INTEGER DEFAULT 0,
  completed_journeys INTEGER DEFAULT 0,
  
  -- Intent metrics
  high_intent_journeys INTEGER DEFAULT 0,
  medium_intent_journeys INTEGER DEFAULT 0,
  low_intent_journeys INTEGER DEFAULT 0,
  avg_intent_score NUMERIC(3,2),
  
  -- Engagement metrics
  avg_pages_per_journey NUMERIC(5,2),
  avg_session_duration_ms INTEGER,
  avg_scroll_depth NUMERIC(5,2),
  
  -- Traffic sources
  utm_sources JSONB, -- {"google": 150, "facebook": 80, ...}
  device_breakdown JSONB, -- {"mobile": 500, "desktop": 300, ...}
  
  -- Top pages
  top_landing_pages JSONB,
  top_exit_pages JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_journey_summary_date ON public.journey_analytics_summary(date DESC);


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update journey from client data
CREATE OR REPLACE FUNCTION public.update_journey_from_client(
  p_session_id TEXT,
  p_analytics JSONB,
  p_pages JSONB DEFAULT NULL,
  p_is_final BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journey_id UUID;
  v_page JSONB;
  v_page_id UUID;
  v_sequence INTEGER := 1;
BEGIN
  -- Insert or update journey
  INSERT INTO public.user_journeys (
    session_id,
    landing_page,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    device_type,
    browser,
    os,
    viewport_width,
    viewport_height,
    language,
    timezone,
    page_count,
    event_count,
    total_time_ms,
    avg_time_per_page_ms,
    avg_scroll_depth,
    intent_score,
    intent_level,
    intent_signals_count,
    visit_number,
    days_since_first_visit,
    last_activity_at,
    is_active
  )
  VALUES (
    p_session_id,
    p_analytics->>'landingPage',
    p_analytics->>'referrer',
    p_analytics->'utm'->>'source',
    p_analytics->'utm'->>'medium',
    p_analytics->'utm'->>'campaign',
    p_analytics->'utm'->>'term',
    p_analytics->'utm'->>'content',
    p_analytics->'device'->>'type',
    p_analytics->'device'->>'browser',
    p_analytics->'device'->>'os',
    (p_analytics->'device'->'viewport'->>'width')::INTEGER,
    (p_analytics->'device'->'viewport'->>'height')::INTEGER,
    p_analytics->'device'->>'language',
    p_analytics->'device'->>'timezone',
    (p_analytics->>'pageCount')::INTEGER,
    (p_analytics->>'eventCount')::INTEGER,
    (p_analytics->>'sessionDuration')::INTEGER,
    (p_analytics->>'avgTimePerPage')::INTEGER,
    (p_analytics->>'avgScrollDepth')::NUMERIC,
    (p_analytics->>'intentScore')::NUMERIC,
    p_analytics->>'intentLevel',
    (p_analytics->>'intentSignals')::INTEGER,
    (p_analytics->>'visitNumber')::INTEGER,
    (p_analytics->>'daysSinceFirstVisit')::INTEGER,
    NOW(),
    NOT p_is_final
  )
  ON CONFLICT (session_id) DO UPDATE
  SET
    page_count = (p_analytics->>'pageCount')::INTEGER,
    event_count = (p_analytics->>'eventCount')::INTEGER,
    total_time_ms = (p_analytics->>'sessionDuration')::INTEGER,
    avg_time_per_page_ms = (p_analytics->>'avgTimePerPage')::INTEGER,
    avg_scroll_depth = (p_analytics->>'avgScrollDepth')::NUMERIC,
    intent_score = (p_analytics->>'intentScore')::NUMERIC,
    intent_level = p_analytics->>'intentLevel',
    intent_signals_count = (p_analytics->>'intentSignals')::INTEGER,
    last_activity_at = NOW(),
    is_active = NOT p_is_final,
    ended_at = CASE WHEN p_is_final THEN NOW() ELSE NULL END,
    exit_page = CASE WHEN p_is_final THEN p_analytics->>'currentPage' ELSE exit_page END,
    updated_at = NOW()
  RETURNING id INTO v_journey_id;

  -- Insert or update pages if provided
  IF p_pages IS NOT NULL THEN
    FOR v_page IN SELECT * FROM jsonb_array_elements(p_pages)
    LOOP
      INSERT INTO public.journey_pages (
        journey_id,
        session_id,
        page_path,
        page_title,
        time_on_page_ms,
        scroll_depth,
        interaction_count,
        page_sequence
      )
      VALUES (
        v_journey_id,
        p_session_id,
        v_page->>'path',
        v_page->>'title',
        (v_page->>'timeOnPage')::INTEGER,
        (v_page->>'scrollDepth')::NUMERIC,
        (v_page->>'interactions')::INTEGER,
        v_sequence
      )
      ON CONFLICT DO NOTHING;
      
      v_sequence := v_sequence + 1;
    END LOOP;
  END IF;

  RETURN v_journey_id;
END;
$$;


-- Function to calculate journey analytics for a date range
CREATE OR REPLACE FUNCTION public.calculate_journey_analytics(
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  total_journeys BIGINT,
  high_intent_count BIGINT,
  avg_intent_score NUMERIC,
  avg_pages NUMERIC,
  avg_duration NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(started_at) as date,
    COUNT(*) as total_journeys,
    COUNT(*) FILTER (WHERE intent_level = 'high') as high_intent_count,
    AVG(intent_score) as avg_intent_score,
    AVG(page_count) as avg_pages,
    AVG(total_time_ms / 1000.0) as avg_duration
  FROM public.user_journeys
  WHERE DATE(started_at) >= p_start_date
    AND (p_end_date IS NULL OR DATE(started_at) <= p_end_date)
  GROUP BY DATE(started_at)
  ORDER BY date DESC;
END;
$$;


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_funnel_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Policies for user_journeys
CREATE POLICY "Users can view their own journeys"
  ON public.user_journeys
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert journeys"
  ON public.user_journeys
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update journeys"
  ON public.user_journeys
  FOR UPDATE
  USING (true);

-- Policies for journey_pages
CREATE POLICY "Users can view their journey pages"
  ON public.journey_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_journeys
      WHERE id = journey_pages.journey_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert journey pages"
  ON public.journey_pages
  FOR INSERT
  WITH CHECK (true);

-- Similar policies for other tables...
CREATE POLICY "Users can view their journey events"
  ON public.journey_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_journeys
      WHERE id = journey_events.journey_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert journey events"
  ON public.journey_events
  FOR INSERT
  WITH CHECK (true);

-- Journey funnels are visible to all authenticated users
CREATE POLICY "Authenticated users can view funnels"
  ON public.journey_funnels
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create funnels"
  ON public.journey_funnels
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Analytics summary is visible to all authenticated users
CREATE POLICY "Authenticated users can view analytics summary"
  ON public.journey_analytics_summary
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_journeys IS 'Cookie-free user journey sessions with buying intent analytics';
COMMENT ON TABLE public.journey_pages IS 'Individual page visits within a user journey';
COMMENT ON TABLE public.journey_events IS 'Events and interactions within a user journey';
COMMENT ON TABLE public.journey_intent_signals IS 'Detected buying intent signals';
COMMENT ON TABLE public.journey_funnels IS 'Predefined conversion funnels';
COMMENT ON TABLE public.journey_funnel_progress IS 'User progress through conversion funnels';
COMMENT ON TABLE public.journey_analytics_summary IS 'Daily aggregated journey analytics';

COMMENT ON FUNCTION public.update_journey_from_client IS 'Update journey data from client-side tracking (cookie-free)';
COMMENT ON FUNCTION public.calculate_journey_analytics IS 'Calculate journey analytics for a date range';




