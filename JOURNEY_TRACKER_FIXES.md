# Journey Tracker Fixes Required

## Issues Summary

The Journey Tracker loads and works locally but has 2 issues preventing server-side analytics sync.

---

## 🔴 Issue #1: `.initialize()` Method Error

**Error:** `journeyTracker.initialize is not a function`  
**Location:** Target website HTML (line 48)

**Cause:** The journey tracker auto-initializes in the constructor. The `.initialize()` method is deprecated.

**Fix:** Remove this line from the target website:
```html
<!-- ❌ Remove this line -->
journeyTracker.initialize();
```

**Current implementation:**
```html
<script src="https://trackflow-app-production.up.railway.app/journey-tracker.js"></script>
<script>
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api',
    enableTracking: true,
    debug: true
  });
  // ✅ That's it - no .initialize() needed
</script>
```

---

## 🔴 Issue #2: Journey Update Endpoint Failures

**Error:** 
- `POST /api/journey-update` → 404 (Not Found)
- `POST /api/journey-update` → 500 (Internal Server Error)

**Cause:** Database function `update_journey_from_client` doesn't exist or RLS policies are blocking it.

**Impact:** Analytics data isn't being saved to Supabase (but workflows still work fine)

### Fix Options:

### Option A: Create Missing Database Function (Recommended)

Create the `update_journey_from_client` function in Supabase:

```sql
CREATE OR REPLACE FUNCTION update_journey_from_client(
  p_session_id TEXT,
  p_analytics JSONB,
  p_pages JSONB DEFAULT NULL,
  p_is_final BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journey_id UUID;
  v_page_record JSONB;
BEGIN
  -- Insert or update journey
  INSERT INTO user_journeys (
    session_id,
    intent_score,
    intent_level,
    page_count,
    event_count,
    total_time_ms,
    landing_page,
    current_page,
    utm_source,
    utm_medium,
    utm_campaign,
    device_type,
    browser,
    visit_number,
    days_since_first_visit,
    referrer,
    is_active,
    started_at,
    last_activity_at
  )
  VALUES (
    p_session_id,
    (p_analytics->>'intentScore')::DECIMAL,
    p_analytics->>'intentLevel',
    (p_analytics->>'pageCount')::INTEGER,
    (p_analytics->>'eventCount')::INTEGER,
    (p_analytics->>'sessionDuration')::BIGINT,
    p_analytics->>'landingPage',
    p_analytics->>'currentPage',
    p_analytics->'utm'->>'source',
    p_analytics->'utm'->>'medium',
    p_analytics->'utm'->>'campaign',
    p_analytics->'device'->>'type',
    p_analytics->'device'->>'browser',
    (p_analytics->>'visitNumber')::INTEGER,
    (p_analytics->>'daysSinceFirstVisit')::INTEGER,
    p_analytics->>'referrer',
    NOT p_is_final,
    NOW(),
    NOW()
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET
    intent_score = EXCLUDED.intent_score,
    intent_level = EXCLUDED.intent_level,
    page_count = EXCLUDED.page_count,
    event_count = EXCLUDED.event_count,
    total_time_ms = EXCLUDED.total_time_ms,
    current_page = EXCLUDED.current_page,
    is_active = NOT p_is_final,
    last_activity_at = NOW()
  RETURNING id INTO v_journey_id;

  -- Insert page records if provided
  IF p_pages IS NOT NULL THEN
    FOR v_page_record IN SELECT * FROM jsonb_array_elements(p_pages)
    LOOP
      INSERT INTO journey_pages (
        journey_id,
        page_path,
        page_title,
        time_on_page_ms,
        scroll_depth,
        interaction_count,
        entered_at
      )
      VALUES (
        v_journey_id,
        v_page_record->>'path',
        v_page_record->>'title',
        (v_page_record->>'timeOnPage')::BIGINT,
        (v_page_record->>'scrollDepth')::DECIMAL,
        (v_page_record->>'interactions')::INTEGER,
        to_timestamp((v_page_record->>'timestamp')::BIGINT / 1000)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_journey_id;
END;
$$;
```

**Then create the required tables if they don't exist:**

```sql
-- User journeys table
CREATE TABLE IF NOT EXISTS user_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  intent_score DECIMAL(3,2) DEFAULT 0,
  intent_level TEXT DEFAULT 'low',
  page_count INTEGER DEFAULT 0,
  event_count INTEGER DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0,
  landing_page TEXT,
  current_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  browser TEXT,
  visit_number INTEGER DEFAULT 1,
  days_since_first_visit INTEGER DEFAULT 0,
  referrer TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journey pages table
CREATE TABLE IF NOT EXISTS journey_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES user_journeys(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_on_page_ms BIGINT DEFAULT 0,
  scroll_depth DECIMAL(5,2) DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  page_sequence INTEGER,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_journeys_session_id ON user_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_intent_score ON user_journeys(intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_journey_pages_journey_id ON journey_pages(journey_id);
```

### Option B: Disable Server Sync (Quick Fix)

If you don't need server-side analytics, disable the API endpoint in the tracker:

```html
<script>
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: null, // ✅ Disables server sync
    enableTracking: true,
    debug: false
  });
</script>
```

**Note:** Journey tracking will still work locally (sessionStorage/localStorage), but data won't be saved to the database.

---

## Priority

| Issue | Priority | Impact | Difficulty |
|-------|----------|--------|-----------|
| `.initialize()` call | Low | Console warning only | Easy (1 min) |
| Database function | Medium | No analytics in DB | Medium (15 min) |

---

## Verification

After fixes, you should see:
- ✅ No console errors
- ✅ `POST /api/journey-update` returns 200 OK
- ✅ Journey data appears in `user_journeys` table in Supabase

Test by running in console:
```javascript
window.journeyTracker.sendJourneyUpdate()
```

Should return success without errors.

