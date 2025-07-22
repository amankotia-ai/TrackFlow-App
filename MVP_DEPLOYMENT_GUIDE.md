# 🚀 MVP Production Deployment (Quick Start)

## 🎯 Goal: Production in 2 Hours

This guide gets your workflow automation system live with minimal setup. Full production features can be added later.

## ⚡ Quick Setup (30 minutes)

### 1. Supabase Setup (10 minutes)

1. Go to [supabase.com](https://supabase.com) → Create project
2. Go to SQL Editor → Run this schema:

```sql
-- Minimal MVP schema
CREATE TABLE workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  target_url TEXT DEFAULT '*',
  nodes JSONB NOT NULL DEFAULT '[]',
  connections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo workflows
INSERT INTO workflows (name, is_active, nodes, connections) VALUES 
('Mobile CTA Optimization', true, 
 '[{"id":"trigger-1","type":"trigger","name":"Device Type","config":{"deviceType":"mobile"}},{"id":"action-1","type":"action","name":"Replace Text","config":{"selector":".cta-button, button, .btn","newText":"Tap to Get Started","originalText":"Click to Get Started"}}]',
 '[{"id":"conn-1","sourceNodeId":"trigger-1","targetNodeId":"action-1"}]'
),
('UTM Google Personalization', true,
 '[{"id":"trigger-2","type":"trigger","name":"UTM Parameters","config":{"parameter":"utm_source","value":"google","operator":"equals"}},{"id":"action-2","type":"action","name":"Replace Text","config":{"selector":"h1, .hero-headline","newText":"Welcome from Google! Special offer inside."}}]',
 '[{"id":"conn-2","sourceNodeId":"trigger-2","targetNodeId":"action-2"}]'
);

-- Basic analytics table
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  event_type TEXT,
  element_selector TEXT,
  page_url TEXT,
  device_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_data JSONB DEFAULT '{}'
);
```

3. Go to Settings → API → Copy these:
   - Project URL
   - Anon public key

### 2. Update Your Server (10 minutes)

Install Supabase:
```bash
npm install @supabase/supabase-js dotenv
```

Replace your server.js workflow storage section:
```javascript
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Replace the in-memory workflowStorage with this:
app.get('/api/workflows/active', async (req, res) => {
  try {
    const requestUrl = req.query.url || '';
    console.log(`🎯 Fetching workflows from Supabase for: ${requestUrl}`);
    
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    
    console.log(`🎯 Found ${workflows.length} active workflows`);
    
    res.json({
      success: true,
      workflows: workflows,
      count: workflows.length,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Supabase error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      timestamp: new Date()
    });
  }
});

// Update analytics endpoint
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (events && events.length > 0) {
      // Save to Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert(events.map(event => ({
          session_id: event.sessionId,
          event_type: event.eventType,
          element_selector: event.elementSelector,
          page_url: event.pageContext?.pathname,
          device_type: event.userContext?.deviceType,
          event_data: event.eventData || {}
        })));
      
      if (error) console.error('Analytics save error:', error);
    }
    
    res.json({ success: true, received: events?.length || 0 });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to save analytics' });
  }
});
```

### 3. Environment Variables (5 minutes)

Create `.env` file:
```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3001
NODE_ENV=production
```

### 4. Test Locally (5 minutes)

```bash
npm start
# Visit http://localhost:3001/workflow-demo
# Check console for "Fetching workflows from Supabase"
```

## 🌐 Deploy to Production (30 minutes)

### Option A: Vercel (Recommended - Easiest)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/server.js" }]
}
```

3. Deploy:
```bash
vercel --prod
```

4. Add environment variables:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

5. Redeploy:
```bash
vercel --prod
```

### Option B: Railway (Alternative)

1. Go to [railway.app](https://railway.app)
2. Connect GitHub repo
3. Add environment variables in dashboard
4. Deploy automatically

## 🔗 Update Your Integration Code (15 minutes)

Replace your tracking script URL in websites:

**Before:**
```html
<script src="http://localhost:3001/enhanced-tracking-script.js"></script>
```

**After:**
```html
<script src="https://your-vercel-url.vercel.app/enhanced-tracking-script.js"></script>
```

## ✅ MVP Launch Checklist (15 minutes)

- [ ] Supabase database created with workflows
- [ ] Server updated to use Supabase
- [ ] Environment variables set
- [ ] Deployed to Vercel/Railway
- [ ] Test workflow execution on live site
- [ ] Analytics data flowing to Supabase

## 🧪 Quick Test

1. Visit your deployed demo: `https://your-url.vercel.app/workflow-demo`
2. Check browser console for workflow logs
3. Try different device sizes (mobile triggers)
4. Add `?utm_source=google` to URL
5. Check Supabase dashboard for analytics data

## 📊 Monitor Your MVP

### View Data in Supabase
- Go to Supabase Dashboard → Table Editor
- Check `workflows` table for your workflows
- Check `analytics_events` table for tracked events

### Basic Monitoring
- Vercel dashboard shows function logs
- Supabase dashboard shows database usage
- Browser dev tools show client-side logs

## 🚀 You're Live!

Your workflow automation system is now in production! 

### What You Have:
✅ **Working Workflows**: Device detection, UTM personalization  
✅ **Real-time Tracking**: All user interactions tracked  
✅ **FOUC Prevention**: Smooth content loading  
✅ **Scalable Database**: Supabase handles scaling  
✅ **Global CDN**: Fast script delivery via Vercel  

### Next Steps (Optional):
- Add custom domain
- Set up monitoring alerts  
- Add more workflow types
- Implement user authentication
- Add analytics dashboard

## 🆘 Quick Troubleshooting

**Workflows not loading?**
- Check Supabase URL/keys in environment variables
- Verify workflows exist in Supabase table

**Scripts not loading?**
- Check CORS settings in server
- Verify deployment URL is correct

**No analytics data?**
- Check browser network tab for API calls
- Verify Supabase table permissions

---

**Total Time: ~2 hours**  
**Monthly Cost: $0** (using free tiers)  
**Scalability: Handles 1000s of users** without changes

This MVP gives you a production-ready workflow automation system that you can iterate on! 