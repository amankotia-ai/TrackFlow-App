import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createClient as createClickHouseClient } from '@clickhouse/client';

// Load environment variables
dotenv.config();

// Dynamic import will be used for hierarchical scrape to avoid module resolution issues

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client - aligned with frontend configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://xlzihfstoqdbgdegqkoi.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsemloZnN0b3FkYmdkZWdxa29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMTUzMDQsImV4cCI6MjA2ODU5MTMwNH0.uE0aEwBJN-sQCesYVjKNJdRyBAaaI_q0tFkSlTBilHw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize ClickHouse client
const clickhouseHost = process.env.CLICKHOUSE_HOST || 'http://localhost:8123';
const clickhouseConfigured = !!process.env.CLICKHOUSE_HOST;

const clickhouse = createClickHouseClient({
  url: clickhouseHost,
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
  clickhouse_settings: {
    // efficient handling for async inserts
    async_insert: 1,
    wait_for_async_insert: 0,
  },
});

console.log('📊 ClickHouse client initialized');
console.log('   📍 Host:', clickhouseHost);
console.log('   ✅ Configured:', clickhouseConfigured ? 'Yes (env vars set)' : 'No (using defaults)');


// Service role client for demo workflows (bypasses RLS)
const supabaseServiceRole = createClient(
  supabaseUrl, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🔗 Supabase connection initialized');
console.log('📋 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Anon Key:', supabaseKey ? 'Set ✅' : 'Missing ❌');
console.log('🔑 Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✅' : 'Missing ❌ (using anon key as fallback)');

// IP Geolocation cache (in-memory, resets on server restart)
const ipCountryCache = new Map();
const IP_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

// Event deduplication cache (prevents duplicate page_view events)
const eventDedupCache = new Map();
const EVENT_DEDUP_TTL = 1000 * 60 * 5; // 5 minute cache (same page view within 5 min = duplicate)
const MAX_DEDUP_CACHE_SIZE = 10000; // Prevent memory bloat

/**
 * Generate a deduplication hash for an event
 * Rounds timestamp to nearest minute to catch near-simultaneous requests
 */
function generateEventDedupHash(event) {
  const visitorId = event.visitorId || '';
  const sessionId = event.sessionId || '';
  const eventType = event.eventType || '';
  const pageUrl = event.pageUrl || event.pageContext?.url || '';
  // Round to nearest minute for dedup
  const timeKey = Math.floor(Date.now() / (1000 * 60));
  return `${visitorId}:${sessionId}:${eventType}:${pageUrl}:${timeKey}`;
}

/**
 * Check if an event is a duplicate (and mark it if not)
 * Returns true if duplicate, false if new
 */
function isDuplicateEvent(event) {
  // Only dedup page_view events
  if (event.eventType !== 'page_view') {
    return false;
  }

  const hash = generateEventDedupHash(event);
  const now = Date.now();
  
  // Clean old entries if cache is getting too large
  if (eventDedupCache.size > MAX_DEDUP_CACHE_SIZE) {
    const cutoff = now - EVENT_DEDUP_TTL;
    for (const [key, timestamp] of eventDedupCache) {
      if (timestamp < cutoff) {
        eventDedupCache.delete(key);
      }
    }
  }

  // Check if we've seen this event recently
  const lastSeen = eventDedupCache.get(hash);
  if (lastSeen && (now - lastSeen) < EVENT_DEDUP_TTL) {
    return true; // Duplicate
  }

  // Mark as seen
  eventDedupCache.set(hash, now);
  return false; // New event
}

// Generate anonymous name from visitor ID (deterministic)
function generateAnonymousName(visitorId) {
  const adjectives = ['Swift', 'Happy', 'Clever', 'Brave', 'Quiet', 'Bold', 'Eager', 'Wise', 'Gentle', 'Rapid', 'Calm', 'Bright'];
  const animals = ['Tiger', 'Eagle', 'Fox', 'Bear', 'Wolf', 'Owl', 'Hawk', 'Panda', 'Lion', 'Falcon', 'Dolphin', 'Raven'];
  
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
    hash = hash & hash;
  }
  hash = Math.abs(hash);
  
  const adjIndex = hash % adjectives.length;
  const animalIndex = Math.floor(hash / adjectives.length) % animals.length;
  
  return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
}

// Get country code from IP address using free API
async function getCountryFromIP(ip) {
  // Skip local/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'US'; // Default to US for local development
  }

  // Check cache first
  const cached = ipCountryCache.get(ip);
  if (cached && cached.timestamp > Date.now() - IP_CACHE_TTL) {
    return cached.countryCode;
  }

  try {
    // Use ip-api.com (free, no API key required, 45 requests/minute limit)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      timeout: 2000 // 2 second timeout
    });
    
    if (response.data && response.data.status === 'success' && response.data.countryCode) {
      const countryCode = response.data.countryCode;
      ipCountryCache.set(ip, { countryCode, timestamp: Date.now() });
      console.log(`🌍 IP ${ip} → ${countryCode}`);
      return countryCode;
    }
  } catch (error) {
    console.log(`⚠️ IP lookup failed for ${ip}:`, error.message);
  }

  // Default to 'US' if lookup fails (better than 'unknown' for map display)
  return 'US';
}

// Get client IP from request (handles proxies)
function getClientIP(req) {
  // Railway/Cloudflare/Nginx proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Cloudflare specific
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  
  // True-Client-IP (some CDNs)
  if (req.headers['true-client-ip']) {
    return req.headers['true-client-ip'];
  }
  
  return req.ip || req.connection?.remoteAddress || '';
}

// Check if frontend was built
const buildExists = fs.existsSync(path.join(__dirname, 'build'));
const indexExists = fs.existsSync(path.join(__dirname, 'build', 'index.html'));
console.log('🏗️ Frontend Build Status:');
console.log('   📁 build/ directory:', buildExists ? 'Exists ✅' : 'Missing ❌');
console.log('   📄 build/index.html:', indexExists ? 'Exists ✅' : 'Missing ❌');

// Trust proxy for Railway deployment (allows correct IP detection)
app.set('trust proxy', true);

// CORS for all origins
app.use(cors({
  origin: '*', // Allow all origins for workflow script delivery
  credentials: false, // Set to false when origin is '*'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'ngrok-skip-browser-warning', 'X-API-Key']
}));
app.use(express.json({ limit: '10mb' }));

// Handle preflight requests for all routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, ngrok-skip-browser-warning, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(200).end();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Serve test HTML files from root directory
app.use(express.static(__dirname, { 
  extensions: ['html'],
  index: false 
}));

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>TrackFlow API Documentation</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; }
          .header { text-align: center; color: #333; }
          .endpoint { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
          .code { background: #000; color: #0f0; padding: 1rem; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🕷️ TrackFlow API Documentation</h1>
          <p>✅ Online and Ready | Railway Deployment</p>
          <p>Web Scraping + Element Tracking + Workflow Automation</p>
        </div>
        
        <div class="endpoint">
          <h3>POST /api/scrape</h3>
          <p>Extract data from any website</p>
          <div class="code">
curl -X POST ${req.protocol}://${req.get('host')}/api/scrape \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{"url": "https://example.com"}'
          </div>
        </div>
        
        <div class="endpoint">
          <h3>GET /tracking-script.js</h3>
          <p>Element tracking script for websites</p>
          <div class="code">
&lt;script src="${req.protocol}://${req.get('host')}/tracking-script.js"&gt;&lt;/script&gt;
          </div>
        </div>
        
        <div class="endpoint">
          <h3>POST /api/analytics/track</h3>
          <p>Track user interactions and events</p>
        </div>
        
        <div class="endpoint">
          <h3>GET /api/health</h3>
          <p>Check server status</p>
          <div class="code">
curl ${req.protocol}://${req.get('host')}/api/health
          </div>
        </div>
      </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    supabase: {
      url: supabaseUrl,
      connected: !!supabase
    },
    endpoints: {
      workflows: 'GET /api/workflows/active',
      unified_system: 'GET /api/unified-workflow-system.js',
      anti_flicker: 'GET /api/anti-flicker.js',
      journey_tracker: 'GET /journey-tracker.js',
      journey_update: 'POST /api/journey-update',
      analytics: 'POST /api/analytics/track',
      edge_function: 'https://xlzihfstoqdbgdegqkoi.supabase.co/functions/v1/track-execution'
    }
  });
});

// Quick test endpoint for unified workflow system
app.get('/api/test-unified-system', (req, res) => {
  try {
    const scriptExists = fs.existsSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js'));
    const scriptStats = scriptExists ? fs.statSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js')) : null;
    
    res.json({
      status: 'success',
      unified_system_script: {
        exists: scriptExists,
        size: scriptStats ? scriptStats.size : null,
        modified: scriptStats ? scriptStats.mtime : null
      },
      script_url: `${req.protocol}://${req.get('host')}/api/unified-workflow-system.js`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve tracking script endpoint
app.get('/tracking-script.js', (req, res) => {
  try {
    const trackingScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTracker.js'), 'utf8');
    const callback = req.query.callback;
    
    // Set proper headers for JavaScript with enhanced CORS and ngrok handling
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Enhanced ngrok-specific headers
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    
    // Handle ngrok browser warning bypass
    if (req.headers['ngrok-skip-browser-warning'] || req.query['ngrok-skip-browser-warning']) {
      res.setHeader('ngrok-skip-browser-warning', 'any');
    }
    
    console.log('📦 Serving tracking script to:', req.get('origin') || req.ip);
    console.log('📦 JSONP callback:', callback || 'none');
    
    // Ensure the response is treated as JavaScript
    res.type('application/javascript');
    
    // If callback parameter is provided, wrap in JSONP
    if (callback) {
      console.log('🔄 Serving as JSONP with callback:', callback);
      // Escape the script content for safe JSON embedding
      const escapedScript = JSON.stringify(trackingScript);
      const jsonpResponse = `${callback}(${escapedScript});`;
      res.send(jsonpResponse);
    } else {
      // Serve as regular JavaScript
      res.send(trackingScript);
    }
  } catch (error) {
    console.error('❌ Error serving tracking script:', error);
    const callback = req.query.callback;
    if (callback) {
      // Return error via JSONP callback
      res.status(500).type('application/javascript').send(`${callback}("console.error('Failed to load tracking script: ${error.message}');");`);
    } else {
      res.status(500).setHeader('Content-Type', 'application/json').json({ 
        error: 'Failed to load tracking script',
        message: error.message 
      });
    }
  }
});

// Serve enhanced tracking script endpoint
app.get('/enhanced-tracking-script.js', (req, res) => {
  try {
    const enhancedTrackingScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTrackerEnhanced.js'), 'utf8');
    
    // Set proper headers for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('ngrok-skip-browser-warning', 'true');
    
    console.log('🎯 Serving enhanced tracking script with workflow integration');
    res.send(enhancedTrackingScript);
  } catch (error) {
    console.error('❌ Error serving enhanced tracking script:', error);
    res.status(500).json({ error: 'Failed to load enhanced tracking script' });
  }
});

// Serve workflow executor script
app.get('/api/workflow-executor.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  const workflowExecutorScript = fs.readFileSync(path.join(__dirname, 'src/utils/workflowExecutor.js'), 'utf8');
  console.log('📦 Serving workflow executor script');
  res.send(workflowExecutorScript);
});

// Serve unified workflow system
app.get('/api/unified-workflow-system.js', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const unifiedSystemScript = fs.readFileSync(path.join(__dirname, 'src/utils/unifiedWorkflowSystem.js'), 'utf8');
    console.log('📦 Serving unified workflow system script to:', req.get('origin') || req.ip);
    res.send(unifiedSystemScript);
  } catch (error) {
    console.error('❌ Error serving unified workflow system script:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load unified workflow system script',
      details: error.message 
    });
  }
});

// Serve anti-flicker script
app.get('/api/anti-flicker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  try {
    const antiFlickerScript = fs.readFileSync(path.join(__dirname, 'src/utils/antiFlickerScript.js'), 'utf8');
    console.log('📦 Serving anti-flicker script');
    res.send(antiFlickerScript);
  } catch (error) {
    console.error('❌ Anti-flicker script not found:', error.message);
    res.status(404).send('// Anti-flicker script not found');
  }
});

// Serve TrackFlow Core script (unified identity & deduplication - MUST LOAD FIRST)
app.get('/trackflow-core.js', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const trackflowCoreScript = fs.readFileSync(path.join(__dirname, 'public/trackflow-core.js'), 'utf8');
    console.log('🎯 Serving TrackFlow Core script to:', req.get('origin') || req.ip);
    res.send(trackflowCoreScript);
  } catch (error) {
    console.error('❌ TrackFlow Core script not found:', error.message);
    res.status(404).send('// TrackFlow Core script not found');
  }
});

// Also serve TrackFlow Core from /api/ path for consistency
app.get('/api/trackflow-core.js', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const trackflowCoreScript = fs.readFileSync(path.join(__dirname, 'public/trackflow-core.js'), 'utf8');
    console.log('🎯 Serving TrackFlow Core script (API path) to:', req.get('origin') || req.ip);
    res.send(trackflowCoreScript);
  } catch (error) {
    console.error('❌ TrackFlow Core script not found:', error.message);
    res.status(404).send('// TrackFlow Core script not found');
  }
});

// Serve journey tracker script (cookie-free analytics)
app.get('/journey-tracker.js', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const journeyTrackerScript = fs.readFileSync(path.join(__dirname, 'public/journey-tracker.js'), 'utf8');
    console.log('🛤️ Serving journey tracker script to:', req.get('origin') || req.ip);
    res.send(journeyTrackerScript);
  } catch (error) {
    console.error('❌ Journey tracker script not found:', error.message);
    res.status(404).send('// Journey tracker script not found');
  }
});

// Also serve from /api/ path for consistency
app.get('/api/journey-tracker.js', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    const journeyTrackerScript = fs.readFileSync(path.join(__dirname, 'public/journey-tracker.js'), 'utf8');
    console.log('🛤️ Serving journey tracker script (API path) to:', req.get('origin') || req.ip);
    res.send(journeyTrackerScript);
  } catch (error) {
    console.error('❌ Journey tracker script not found:', error.message);
    res.status(404).send('// Journey tracker script not found');
  }
});

// Legacy endpoint - deprecated, use unified system instead
app.get('/api/element-tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  const elementTrackerScript = fs.readFileSync(path.join(__dirname, 'src/utils/elementTrackerEnhanced.js'), 'utf8');
  console.log('📦 Serving element tracker script (legacy)');
  res.send(elementTrackerScript);
});

// Handle preflight requests for tracking script
app.options('/tracking-script.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Analytics endpoint for tracking events
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { events, visitorId: bodyVisitorId, sessionId: bodySessionId } = req.body;
    
    console.log('📊 Received analytics events:', events?.length || 0);
    
    if (events && events.length > 0) {
      // Get country code from client IP (server-side geolocation)
      const clientIP = getClientIP(req);
      const serverCountryCode = await getCountryFromIP(clientIP);
      
      // Filter out duplicate events (server-side deduplication)
      const originalCount = events.length;
      const dedupedEvents = events.filter(event => !isDuplicateEvent(event));
      const duplicateCount = originalCount - dedupedEvents.length;
      
      if (duplicateCount > 0) {
        console.log(`⏭️ Filtered ${duplicateCount} duplicate page_view events (server-side dedup)`);
      }
      
      // Skip if all events were duplicates
      if (dedupedEvents.length === 0) {
        console.log('⏭️ All events were duplicates, skipping');
        return res.json({ 
          success: true, 
          received: originalCount,
          processed: 0,
          duplicatesFiltered: duplicateCount,
          timestamp: new Date().toISOString()
        });
      }
      
      // Async insert to ClickHouse analytics_events (using deduped events)
      try {
        await clickhouse.insert({
          table: 'analytics_events',
          values: dedupedEvents.map(event => ({
            event_type: event.eventType,
            page_url: event.pageContext?.url || event.pageUrl || '',
            element_selector: event.elementSelector || '',
            timestamp: new Date().toISOString(),
            session_id: event.sessionId || bodySessionId || '',
            visitor_id: event.visitorId || bodyVisitorId || '',
            user_id: event.userId ? String(event.userId) : null,
            workflow_id: event.workflowId ? String(event.workflowId) : null,
            metadata: JSON.stringify(event.eventData || {}),
            device_type: event.deviceType || 'desktop',
            browser_info: JSON.stringify(event.browserInfo || {}),
            country_code: serverCountryCode || event.countryCode || event.eventData?.countryCode || 'US'
          })),
          format: 'JSONEachRow',
        });
        console.log(`✅ Events flushed to ClickHouse (visitor: ${bodyVisitorId || dedupedEvents[0]?.visitorId}, country: ${serverCountryCode}, deduped: ${dedupedEvents.length}/${originalCount})`);
      } catch (chError) {
        console.error('⚠️ ClickHouse insert failed (continuing):', chError.message);
      }

      // Also insert page_view events to page_views table for visitor tracking (using deduped events)
      const pageViewEvents = dedupedEvents.filter(e => e.eventType === 'page_view');
      if (pageViewEvents.length > 0) {
        try {
          await clickhouse.insert({
            table: 'page_views',
            values: pageViewEvents.map(event => ({
              visitor_id: event.visitorId || bodyVisitorId || '',
              session_id: event.sessionId || bodySessionId || '',
              page_url: event.pageContext?.url || event.pageUrl || '',
              page_path: event.pageContext?.pathname || new URL(event.pageUrl || 'http://localhost').pathname || '',
              page_title: event.pageContext?.title || event.eventData?.title || '',
              referrer: event.pageContext?.referrer || event.eventData?.referrer || '',
              timestamp: new Date().toISOString(),
              time_on_page_ms: 0,
              scroll_depth: 0,
              country_code: serverCountryCode || event.countryCode || 'US',
              device_type: event.deviceType || 'desktop',
              browser: event.browserInfo?.browser || ''
            })),
            format: 'JSONEachRow',
          });
          console.log(`✅ Page views tracked for visitor: ${bodyVisitorId || pageViewEvents[0]?.visitorId}`);
        } catch (pvError) {
          console.error('⚠️ Page views insert failed:', pvError.message);
        }
      }

      // Update or create visitor record (using deduped events)
      const firstEvent = dedupedEvents[0];
      const visitorId = firstEvent?.visitorId || bodyVisitorId;
      if (visitorId) {
        try {
          const now = new Date();
          // Use ReplacingMergeTree - insert will update existing record
          await clickhouse.insert({
            table: 'visitors',
            values: [{
              visitor_id: visitorId,
              anonymous_name: firstEvent?.anonymousName || generateAnonymousName(visitorId),
              first_seen: now,
              last_seen: now,
              total_sessions: 1,
              total_page_views: pageViewEvents.length,
              total_events: dedupedEvents.length,
              country_code: serverCountryCode || firstEvent?.countryCode || 'US',
              primary_device: firstEvent?.deviceType || 'desktop',
              primary_browser: firstEvent?.browserInfo?.browser || ''
            }],
            format: 'JSONEachRow',
          });
          console.log(`✅ Visitor record updated: ${visitorId}`);
        } catch (visitorError) {
          console.error('⚠️ Visitor insert failed:', visitorError.message);
        }
      }

      dedupedEvents.forEach(event => {
        console.log('📊 Event:', event.eventType, serverCountryCode, event.pageContext?.pathname || event.pageUrl);
      });
    }
    
    res.json({ 
      success: true, 
      received: events?.length || 0,
      processed: events ? events.length - (events.length - (events?.length || 0)) : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to save analytics' });
  }
});

// Get active workflows endpoint
app.get('/api/workflows/active', async (req, res) => {
  try {
    const { url } = req.query;
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    console.log('📋 Fetching active workflows for:', url);
    console.log('🔑 API Key provided:', apiKey ? 'Yes' : 'No');
    console.log('🌐 Origin:', req.get('origin') || 'Not set');
    console.log('🔗 Referer:', req.get('referer') || 'Not set');
    
    if (apiKey) {
      // Use API key authentication for external access
      console.log('🔑 Using API key authentication');
      
      const { data: workflows, error } = await supabase.rpc('get_active_workflows_for_url', {
        p_api_key: apiKey,
        p_url: url || ''
      });
      
      if (error) {
        console.error('❌ API key authentication failed:', error);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ Found ${workflows.length} workflows via API key`);
      
      return res.json({
        success: true,
        workflows: workflows,
        count: workflows.length,
        url,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fallback to demo workflows using service role (bypasses RLS)
    console.log('⚠️ No API key provided, using service role for demo workflows');
    
    // Use service role client to access demo workflows (bypasses RLS)
    const { data: workflows, error } = await supabaseServiceRole
      .from('workflows_with_nodes')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(10); // Limit demo workflows for security
    
    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error hint:', error.hint || 'No additional hint');
      
      // Provide specific error message for RLS issues
      let errorMessage = 'Failed to fetch workflows from database';
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        errorMessage = 'Database access blocked by security policies. Please use API key authentication.';
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        debug: this.config?.debug ? {
          originalError: error.message,
          hint: error.hint,
          details: error.details
        } : undefined,
        timestamp: new Date().toISOString()
      });
    }
    
    // Enhanced URL matching logic
    const activeWorkflows = workflows.filter(workflow => {
      const targetUrl = workflow.target_url;
      
      if (!targetUrl || !url) return false;
      
      try {
        const currentUrl = new URL(url);
        
        // Universal match - runs on all pages
        if (targetUrl === '*') {
          console.log(`✅ Universal match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Exact URL match
        if (targetUrl === url) {
          console.log(`✅ Exact match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Path-based matching
        if (targetUrl.startsWith('/')) {
          const matches = currentUrl.pathname.includes(targetUrl);
          if (matches) {
            console.log(`✅ Path match for workflow: ${workflow.name} (${targetUrl})`);
          }
          return matches;
        }
        
        // Domain-based matching
        if (targetUrl.includes('.')) {
          const matches = currentUrl.hostname.includes(targetUrl);
          if (matches) {
            console.log(`✅ Domain match for workflow: ${workflow.name} (${targetUrl})`);
          }
          return matches;
        }
        
        // Query parameter matching
        if (targetUrl.includes('?') || targetUrl.includes('=')) {
          const targetParams = new URLSearchParams(targetUrl.split('?')[1] || targetUrl);
          const currentParams = currentUrl.searchParams;
          
          for (const [key, value] of targetParams) {
            if (currentParams.get(key) !== value) {
              return false;
            }
          }
          console.log(`✅ Query param match for workflow: ${workflow.name}`);
          return true;
        }
        
        // Regex pattern matching (advanced)
        if (targetUrl.startsWith('regex:')) {
          const pattern = targetUrl.replace('regex:', '');
          const regex = new RegExp(pattern);
          const matches = regex.test(url);
          if (matches) {
            console.log(`✅ Regex match for workflow: ${workflow.name} (${pattern})`);
          }
          return matches;
        }
        
        // Subdomain matching
        if (targetUrl.startsWith('subdomain:')) {
          const subdomain = targetUrl.replace('subdomain:', '');
          const matches = currentUrl.hostname.startsWith(subdomain + '.');
          if (matches) {
            console.log(`✅ Subdomain match for workflow: ${workflow.name} (${subdomain})`);
          }
          return matches;
        }
        
        // Contains matching (fallback)
        const matches = url.includes(targetUrl);
        if (matches) {
          console.log(`✅ Contains match for workflow: ${workflow.name} (${targetUrl})`);
        }
        return matches;
        
      } catch (urlError) {
        console.warn(`⚠️ Invalid URL format: ${url}, using simple string matching`);
        // Fallback to simple string matching if URL parsing fails
        return url.includes(targetUrl);
      }
    });
    
    console.log(`✅ Found ${activeWorkflows.length} active workflows for URL: ${url}`);
    
    // Log which workflows matched for debugging
    activeWorkflows.forEach(workflow => {
      console.log(`📋 Active workflow: ${workflow.name} (target: ${workflow.target_url})`);
    });
    
    res.json({
      success: true,
      workflows: activeWorkflows,
      count: activeWorkflows.length,
      url,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching workflows:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch workflows',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint to create a demo workflow (for debugging only)
app.post('/api/workflows/create-demo', async (req, res) => {
  try {
    console.log('🧪 Creating demo workflow for testing...');
    
    // First, create a test user (or use existing)
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID for testing
    
    const demoWorkflow = {
      id: 'demo-workflow-' + Date.now(),
      user_id: testUserId,
      name: 'Demo Mobile Workflow',
      description: 'Test workflow for mobile devices',
      is_active: true,
      status: 'active',
      target_url: '*', // Works on all pages
      executions: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const demoNodes = [
      {
        id: 'trigger-1',
        type: 'trigger',
        category: 'Device & Browser',
        name: 'Device Type',
        description: 'Trigger for mobile devices',
        icon: 'Smartphone',
        position: { x: 100, y: 50 },
        config: { deviceType: 'mobile' },
        inputs: [],
        outputs: ['output']
      },
      {
        id: 'action-1',
        type: 'action',
        category: 'Content Modification',
        name: 'Replace Text',
        description: 'Replace text for mobile users',
        icon: 'Type',
        position: { x: 400, y: 50 },
        config: {
          selector: 'h1, .hero-title, .main-title',
          newText: 'Mobile-Optimized Title!'
        },
        inputs: ['input'],
        outputs: []
      }
    ];
    
    const demoConnections = [
      {
        id: 'conn-1',
        sourceNodeId: 'trigger-1',
        targetNodeId: 'action-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ];
    
    // Insert workflow using the save_workflow_complete function
    const { data: workflowId, error } = await supabase.rpc('save_workflow_complete', {
      p_workflow_id: null, // Create new
      p_user_id: testUserId,
      p_name: demoWorkflow.name,
      p_description: demoWorkflow.description,
      p_is_active: demoWorkflow.is_active,
      p_status: demoWorkflow.status,
      p_target_url: demoWorkflow.target_url,
      p_nodes: demoNodes,
      p_connections: demoConnections
    });
    
    if (error) {
      console.error('❌ Failed to create demo workflow:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create demo workflow',
        details: error.message
      });
    }
    
    console.log('✅ Demo workflow created with ID:', workflowId);
    
    res.json({
      success: true,
      workflowId: workflowId,
      message: 'Demo workflow created successfully',
      workflow: {
        ...demoWorkflow,
        id: workflowId,
        nodes: demoNodes,
        connections: demoConnections
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating demo workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create demo workflow',
      details: error.message
    });
  }
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`🕷️ Scraping: ${url}`);

    // Add protocol if missing
    let targetUrl = url;
    if (!url.startsWith('http')) {
      targetUrl = `https://${url}`;
    }

    // Fetch with timeout
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Remove noise
    $('script, style, noscript').remove();
    
    const elements = [];
    
    // Extract text elements
    $('body *').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 500) {
        const tag = el.name;
        const $el = $(el);
        
        elements.push({
          tag,
          text: text.substring(0, 200),
          selector: tag + ($el.attr('class') ? `.${$el.attr('class').split(' ')[0]}` : ''),
          attributes: {
            id: $el.attr('id'),
            class: $el.attr('class'),
            href: $el.attr('href')
          }
        });
      }
    });

    // Remove duplicates - no limit on results
    const uniqueElements = elements
      .filter((el, i, arr) => arr.findIndex(e => e.text === el.text) === i);

    console.log(`✅ Extracted ${uniqueElements.length} elements`);

    res.json({
      success: true,
      data: uniqueElements,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      count: uniqueElements.length
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL not found';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      url: req.body?.url,
      timestamp: new Date().toISOString()
    });
  }
});

// Hierarchical scraping endpoint
app.all('/api/hierarchical-scrape', async (req, res) => {
  try {
    const { default: hierarchicalScrapeHandler } = await import('./api/hierarchical-scrape.js');
    hierarchicalScrapeHandler(req, res);
  } catch (error) {
    console.error('Failed to load hierarchical scrape handler:', error);
    res.status(500).json({
      success: false,
      error: 'Hierarchical scraping service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Journey tracking endpoint (cookie-free analytics)
app.post('/api/journey-update', async (req, res) => {
  try {
    const { sessionId, visitorId, anonymousName, analytics, journey, isFinal } = req.body;
    
    if (!sessionId || !analytics) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId and analytics'
      });
    }

    const effectiveVisitorId = visitorId || analytics.visitorId || sessionId;
    const effectiveName = anonymousName || analytics.anonymousName || '';

    console.log(`📊 Journey update received: visitor=${effectiveVisitorId}, session=${sessionId} (${analytics.intentLevel} intent, ${analytics.pageCount} pages)`);

    // Dual-write to ClickHouse
    try {
      // Get country code from client IP (server-side geolocation)
      const clientIP = getClientIP(req);
      const countryCode = await getCountryFromIP(clientIP) || analytics.countryCode || analytics.country || 'US';
      console.log(`📊 Journey update with country: ${countryCode} (IP: ${clientIP})`);
      
      await clickhouse.insert({
        table: 'visitor_journeys',
        values: [{
          session_id: sessionId,
          visitor_id: effectiveVisitorId,
          anonymous_name: effectiveName,
          start_time: analytics.startTime ? new Date(analytics.startTime).toISOString() : new Date().toISOString(),
          end_time: new Date().toISOString(),
          page_count: analytics.pageCount || 1,
          event_count: analytics.eventCount || 0,
          device_type: analytics.deviceType || 'desktop',
          browser: analytics.browser || analytics.device?.browser || '',
          country_code: countryCode,
          utm_source: analytics.utmSource || analytics.utm?.source || '',
          utm_campaign: analytics.utmCampaign || analytics.utm?.campaign || '',
          is_active: isFinal ? 0 : 1
        }],
        format: 'JSONEachRow'
      });
      console.log('✅ Journey written to ClickHouse');

      // Update visitor record
      const now = new Date();
      await clickhouse.insert({
        table: 'visitors',
        values: [{
          visitor_id: effectiveVisitorId,
          anonymous_name: effectiveName || generateAnonymousName(effectiveVisitorId),
          first_seen: now,
          last_seen: now,
          total_sessions: 1,
          total_page_views: analytics.pageCount || 1,
          total_events: analytics.eventCount || 0,
          country_code: countryCode,
          primary_device: analytics.deviceType || 'desktop',
          primary_browser: analytics.browser || ''
        }],
        format: 'JSONEachRow'
      });
      console.log(`✅ Visitor record updated from journey: ${effectiveVisitorId}`);

      // Update visitor activity for heatmap
      await clickhouse.insert({
        table: 'visitor_activity',
        values: [{
          visitor_id: effectiveVisitorId,
          activity_date: new Date().toISOString().split('T')[0],
          event_count: analytics.eventCount || 0,
          page_view_count: analytics.pageCount || 1,
          session_count: 1,
          total_time_ms: analytics.sessionDuration || 0
        }],
        format: 'JSONEachRow'
      });
      
    } catch (chError) {
      console.error('⚠️ ClickHouse journey insert failed:', chError.message);
    }

    // Call Supabase function to update journey (non-blocking - don't fail if this errors)
    // ClickHouse is the primary data store for live visitor analytics
    let supabaseJourneyId = null;
    try {
      const { data, error } = await supabaseServiceRole.rpc('update_journey_from_client', {
        p_session_id: sessionId,
        p_analytics: { ...analytics, visitorId: effectiveVisitorId, anonymousName: effectiveName },
        p_pages: journey?.pages || null,
        p_is_final: isFinal || false
      });

      if (error) {
        console.error('⚠️ Supabase journey update failed (non-blocking):', error.message);
      } else {
        supabaseJourneyId = data;
        console.log(`✅ Journey also saved to Supabase: ${data}`);
      }
    } catch (supabaseError) {
      console.error('⚠️ Supabase call failed (non-blocking):', supabaseError.message);
    }

    // Always return success if we got this far - ClickHouse is primary
    res.json({
      success: true,
      journeyId: supabaseJourneyId,
      visitorId: effectiveVisitorId,
      sessionId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Journey tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Journey analytics endpoint - get journey data
app.get('/api/journey/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data, error } = await supabase
      .from('user_journeys')
      .select(`
        *,
        journey_pages(
          id,
          page_path,
          page_title,
          time_on_page_ms,
          scroll_depth,
          interaction_count,
          page_sequence,
          entered_at
        ),
        journey_events(
          id,
          event_type,
          event_target,
          is_intent_signal,
          occurred_at
        )
      `)
      .eq('session_id', sessionId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'Journey not found'
      });
    }

    res.json({
      success: true,
      journey: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching journey:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Journey analytics summary endpoint
app.get('/api/journey-analytics/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const { data, error } = await supabase.rpc('calculate_journey_analytics', {
      p_start_date: startDate || new Date().toISOString().split('T')[0],
      p_end_date: endDate || null
    });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      analytics: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching journey analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// High-intent journeys endpoint (for sales teams)
app.get('/api/journey-analytics/high-intent', async (req, res) => {
  try {
    const { limit = 50, minScore = 0.7 } = req.query;

    const { data, error } = await supabase
      .from('user_journeys')
      .select(`
        session_id,
        intent_score,
        intent_level,
        page_count,
        total_time_ms,
        landing_page,
        utm_source,
        utm_campaign,
        device_type,
        started_at,
        last_activity_at,
        is_active
      `)
      .gte('intent_score', parseFloat(minScore))
      .order('intent_score', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      journeys: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching high-intent journeys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high-intent journeys'
    });
  }
});

// --- Visitor API Endpoints ---

// Get all visitors (paginated, filtered by user's websites)
app.get('/api/visitors', async (req, res) => {
  try {
    const { limit = 50, offset = 0, country } = req.query;
    
    // Verify user authentication
    const user = await verifyUserToken(req);
    
    if (!user) {
      return res.json({
        success: true,
        visitors: [],
        total: 0,
        message: 'Authentication required to view visitor data',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user's website domains
    const userDomains = await getUserWebsiteDomains(user.id);
    
    if (userDomains.length === 0) {
      return res.json({
        success: true,
        visitors: [],
        total: 0,
        message: 'No websites configured. Create a workflow to start tracking.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Build domain filter
    const domainPatterns = userDomains.map(d => `%${d}%`);
    
    // First, get visitor IDs that have visited user's websites
    const visitorIdsQuery = `
      SELECT DISTINCT visitor_id
      FROM analytics_events
      WHERE visitor_id != ''
        ${country ? 'AND country_code = {country:String}' : ''}
        AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
      LIMIT 10000
    `;
    
    const visitorIdsResult = await clickhouse.query({
      query: visitorIdsQuery,
      query_params: { 
        country: country || '',
        ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
      },
      format: 'JSONEachRow'
    });
    
    const allowedVisitorIds = (await visitorIdsResult.json()).map(v => v.visitor_id);
    
    if (allowedVisitorIds.length === 0) {
      return res.json({
        success: true,
        visitors: [],
        total: 0,
        message: 'No visitors found for your websites',
        timestamp: new Date().toISOString()
      });
    }
    
    let query = `
      SELECT 
        visitor_id,
        anonymous_name,
        first_seen,
        last_seen,
        total_sessions,
        total_page_views,
        country_code,
        primary_device,
        primary_browser
      FROM visitors
      WHERE visitor_id IN ({allowedIds:Array(String)})
        ${country ? 'AND country_code = {country:String}' : ''}
      ORDER BY last_seen DESC
      LIMIT {limit:UInt32}
      OFFSET {offset:UInt32}
    `;
    
    const resultSet = await clickhouse.query({
      query,
      query_params: { 
        allowedIds: allowedVisitorIds,
        limit: parseInt(limit), 
        offset: parseInt(offset),
        country: country || ''
      },
      format: 'JSONEachRow'
    });
    
    const visitors = await resultSet.json();
    
    res.json({
      success: true,
      visitors,
      total: allowedVisitorIds.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      domains: userDomains,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching visitors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch visitors' });
  }
});

// Get single visitor with sessions (filtered by user's websites)
app.get('/api/visitors/:visitorId', async (req, res) => {
  try {
    const { visitorId } = req.params;
    
    // Verify user authentication
    const user = await verifyUserToken(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required to view visitor data'
      });
    }
    
    // Get user's website domains
    const userDomains = await getUserWebsiteDomains(user.id);
    
    if (userDomains.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'No websites configured. Create a workflow to start tracking.'
      });
    }
    
    // Build domain filter
    const domainPatterns = userDomains.map(d => `%${d}%`);
    
    // Verify this visitor has visited one of the user's websites
    const accessCheckResult = await clickhouse.query({
      query: `
        SELECT count() as visits
        FROM analytics_events
        WHERE visitor_id = {visitorId:String}
          AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
        LIMIT 1
      `,
      query_params: { 
        visitorId,
        ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
      },
      format: 'JSONEachRow'
    });
    
    const accessCheck = await accessCheckResult.json();
    
    if (!accessCheck[0] || accessCheck[0].visits === '0') {
      return res.status(403).json({ 
        success: false, 
        error: 'This visitor has not accessed your websites'
      });
    }
    
    // Get visitor info
    const visitorResult = await clickhouse.query({
      query: `
        SELECT 
          visitor_id,
          anonymous_name,
          first_seen,
          last_seen,
          total_sessions,
          total_page_views,
          country_code,
          primary_device,
          primary_browser
        FROM visitors
        WHERE visitor_id = {visitorId:String}
        LIMIT 1
      `,
      query_params: { visitorId },
      format: 'JSONEachRow'
    });
    const visitorData = await visitorResult.json();
    
    if (visitorData.length === 0) {
      return res.status(404).json({ success: false, error: 'Visitor not found' });
    }
    
    // Get visitor sessions
    const sessionsResult = await clickhouse.query({
      query: `
        SELECT 
          session_id,
          start_time,
          end_time,
          page_count,
          event_count,
          device_type,
          browser,
          country_code,
          is_active
        FROM visitor_journeys
        WHERE visitor_id = {visitorId:String}
        ORDER BY start_time DESC
        LIMIT 50
      `,
      query_params: { visitorId },
      format: 'JSONEachRow'
    });
    const sessions = await sessionsResult.json();
    
    // Get page views for visitor (only from user's websites)
    const pagesResult = await clickhouse.query({
      query: `
        SELECT 
          session_id,
          page_path,
          page_title,
          timestamp,
          time_on_page_ms,
          scroll_depth
        FROM page_views
        WHERE visitor_id = {visitorId:String}
          AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
        ORDER BY timestamp DESC
        LIMIT 100
      `,
      query_params: { 
        visitorId,
        ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
      },
      format: 'JSONEachRow'
    });
    const pages = await pagesResult.json();
    
    // Get activity heatmap data (last 6 months)
    const activityResult = await clickhouse.query({
      query: `
        SELECT 
          activity_date,
          event_count,
          page_view_count,
          session_count
        FROM visitor_activity
        WHERE visitor_id = {visitorId:String}
          AND activity_date >= today() - 180
        ORDER BY activity_date DESC
      `,
      query_params: { visitorId },
      format: 'JSONEachRow'
    });
    const activity = await activityResult.json();
    
    res.json({
      success: true,
      visitor: visitorData[0],
      sessions,
      pages,
      activity,
      domains: userDomains,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching visitor:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch visitor' });
  }
});

// Get visitors by country (filtered by user's websites)
app.get('/api/visitors/by-country/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const { limit = 50 } = req.query;
    
    console.log(`📊 Fetching visitors for country: ${countryCode}`);
    
    // Check if ClickHouse is properly configured
    if (!clickhouseConfigured) {
      console.warn('⚠️ ClickHouse not configured - returning empty data');
      return res.json({
        success: true,
        countryCode,
        visitors: [],
        recentSessions: [],
        total: 0,
        note: 'ClickHouse not configured',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify user authentication
    const user = await verifyUserToken(req);
    
    if (!user) {
      return res.json({
        success: true,
        countryCode,
        visitors: [],
        recentSessions: [],
        total: 0,
        message: 'Authentication required to view visitor data',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user's website domains
    const userDomains = await getUserWebsiteDomains(user.id);
    
    if (userDomains.length === 0) {
      return res.json({
        success: true,
        countryCode,
        visitors: [],
        recentSessions: [],
        total: 0,
        message: 'No websites configured. Create a workflow to start tracking.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Build domain filter - get visitor IDs from analytics_events that match user's domains
    const domainPatterns = userDomains.map(d => `%${d}%`);
    
    // First, get visitor IDs that have visited user's websites
    const visitorIdsResult = await clickhouse.query({
      query: `
        SELECT DISTINCT visitor_id
        FROM analytics_events
        WHERE country_code = {countryCode:String}
          AND visitor_id != ''
          AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
        LIMIT 1000
      `,
      query_params: { 
        countryCode,
        ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
      },
      format: 'JSONEachRow'
    });
    
    const allowedVisitorIds = (await visitorIdsResult.json()).map(v => v.visitor_id);
    
    if (allowedVisitorIds.length === 0) {
      return res.json({
        success: true,
        countryCode,
        visitors: [],
        recentSessions: [],
        total: 0,
        message: 'No visitors from this country on your websites',
        timestamp: new Date().toISOString()
      });
    }
    
    const resultSet = await clickhouse.query({
      query: `
        SELECT 
          visitor_id,
          anonymous_name,
          first_seen,
          last_seen,
          total_sessions,
          country_code,
          primary_device,
          primary_browser
        FROM visitors
        WHERE country_code = {countryCode:String}
          AND visitor_id IN ({visitorIds:Array(String)})
        ORDER BY last_seen DESC
        LIMIT {limit:UInt32}
      `,
      query_params: { countryCode, visitorIds: allowedVisitorIds, limit: parseInt(limit) },
      format: 'JSONEachRow'
    });
    
    const visitors = await resultSet.json();
    console.log(`✅ Found ${visitors.length} visitors for ${countryCode} (user: ${user.id})`);
    
    // Get recent sessions for these visitors
    const visitorIds = visitors.map(v => v.visitor_id);
    let recentSessions = [];
    
    if (visitorIds.length > 0) {
      const sessionsResult = await clickhouse.query({
        query: `
          SELECT 
            visitor_id,
            session_id,
            start_time,
            end_time,
            page_count,
            is_active,
            browser
          FROM visitor_journeys
          WHERE visitor_id IN ({visitorIds:Array(String)})
            AND start_time >= now() - INTERVAL 24 HOUR
          ORDER BY start_time DESC
          LIMIT 100
        `,
        query_params: { visitorIds },
        format: 'JSONEachRow'
      });
      recentSessions = await sessionsResult.json();
    }
    
    res.json({
      success: true,
      countryCode,
      visitors,
      recentSessions,
      total: visitors.length,
      domains: userDomains,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching visitors by country:', error);
    console.error('   Details:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch visitors',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// --- ClickHouse Analytics API Endpoints ---

// Dashboard Aggregated Stats (filtered by user's websites)
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Verify user authentication
    const user = await verifyUserToken(req);
    
    if (!user) {
      return res.json({
        success: true,
        stats: {
          totalPlaybooks: 0,
          activePlaybooks: 0,
          totalEvents: 0,
          uniqueSessions: 0,
          message: 'Authentication required to view dashboard stats'
        }
      });
    }
    
    // Get user's website domains
    const userDomains = await getUserWebsiteDomains(user.id);
    
    // Parallel fetch: Supabase for user's workflows, ClickHouse for user's events
    const [workflowsResult, eventsResult] = await Promise.all([
        supabase.from('workflows').select('id, status', { count: 'exact' }).eq('user_id', user.id),
        (async () => {
          if (userDomains.length === 0) {
            return { json: () => Promise.resolve([{ total_events: 0, unique_sessions: 0 }]) };
          }
          
          const domainPatterns = userDomains.map(d => `%${d}%`);
          
          return clickhouse.query({
            query: `
                SELECT 
                    count() as total_events,
                    uniq(session_id) as unique_sessions
                FROM analytics_events
                WHERE timestamp > now() - INTERVAL {days:UInt32} DAY
                  AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
            `,
            query_params: { 
              days: parseInt(days),
              ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
            },
            format: 'JSONEachRow'
          });
        })()
    ]);

    const workflows = workflowsResult.data || [];
    const chData = await eventsResult.json();
    const eventStats = chData[0] || { total_events: 0, unique_sessions: 0 };

    res.json({
        success: true,
        stats: {
            totalPlaybooks: workflows.length,
            activePlaybooks: workflows.filter(w => w.status === 'active').length,
            totalEvents: parseInt(eventStats.total_events),
            uniqueSessions: parseInt(eventStats.unique_sessions)
        },
        domains: userDomains
    });
  } catch (error) {
      console.error('Dashboard stats error:', error);
      // Fallback for demo purposes if ClickHouse is not ready
      res.json({
        success: true,
        stats: {
            totalPlaybooks: 0,
            activePlaybooks: 0,
            totalEvents: 0,
            uniqueSessions: 0,
            note: 'ClickHouse unavailable, showing empty stats'
        }
      });
  }
});

// Helper function to verify Supabase JWT and get user
async function verifyUserToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.substring(7);
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            console.log('⚠️ Token verification failed:', error?.message);
            return null;
        }
        return user;
    } catch (error) {
        console.error('❌ Token verification error:', error);
        return null;
    }
}

// Helper function to get user's website domains from their workflows
async function getUserWebsiteDomains(userId) {
    try {
        const { data: workflows, error } = await supabase
            .from('workflows')
            .select('target_url')
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error fetching user workflows:', error);
            return [];
        }
        
        // Extract unique domains from target URLs
        const domains = new Set();
        workflows.forEach(w => {
            if (w.target_url && w.target_url !== '*') {
                try {
                    // Handle different URL formats
                    let domain = w.target_url;
                    if (domain.startsWith('http')) {
                        domain = new URL(domain).hostname;
                    } else if (domain.startsWith('/')) {
                        // Path-based, skip
                        return;
                    }
                    domains.add(domain.toLowerCase());
                } catch (e) {
                    // If it's not a valid URL, try to extract domain pattern
                    const domainMatch = w.target_url.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/);
                    if (domainMatch) {
                        domains.add(domainMatch[0].toLowerCase());
                    }
                }
            }
        });
        
        return Array.from(domains);
    } catch (error) {
        console.error('Error getting user website domains:', error);
        return [];
    }
}

// Real-time Live Users Widget (filtered by user's websites)
app.get('/api/analytics/live', async (req, res) => {
    try {
        // Verify user authentication
        const user = await verifyUserToken(req);
        
        if (!user) {
            // No auth - return 0 live users for security
            return res.json({
                success: true,
                liveUsers: 0,
                message: 'Authentication required to view live data',
                timestamp: new Date().toISOString()
            });
        }
        
        // Get user's website domains
        const userDomains = await getUserWebsiteDomains(user.id);
        
        if (userDomains.length === 0) {
            return res.json({
                success: true,
                liveUsers: 0,
                message: 'No websites configured. Create a workflow to start tracking.',
                timestamp: new Date().toISOString()
            });
        }
        
        // Build domain filter for ClickHouse query
        const domainPatterns = userDomains.map(d => `%${d}%`);
        
        const resultSet = await clickhouse.query({
            query: `
                SELECT uniq(session_id) as live_users 
                FROM analytics_events 
                WHERE timestamp >= now() - INTERVAL 5 MINUTE
                  AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
            `,
            query_params: Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d])),
            format: 'JSONEachRow'
        });
        
        const data = await resultSet.json();
        res.json({
            success: true,
            liveUsers: parseInt(data[0]?.live_users || 0),
            domains: userDomains,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Live users error:', error);
        res.status(500).json({ error: 'Failed to fetch live users' });
    }
});

// Real-time Live Users with Location Data for Globe Visualization (filtered by user's websites)
// Queries analytics_events to stay in sync with /api/analytics/live endpoint
app.get('/api/analytics/live-locations', async (req, res) => {
    try {
        // Check if ClickHouse is properly configured
        if (!clickhouseConfigured) {
            console.log('⚠️ ClickHouse not configured - returning empty locations');
            return res.json({
                success: true,
                locations: [],
                note: 'ClickHouse not configured',
                timestamp: new Date().toISOString()
            });
        }

        // Verify user authentication
        const user = await verifyUserToken(req);
        
        if (!user) {
            // No auth - return empty data for security
            return res.json({
                success: true,
                locations: [],
                message: 'Authentication required to view live data',
                timestamp: new Date().toISOString()
            });
        }
        
        // Get user's website domains
        const userDomains = await getUserWebsiteDomains(user.id);
        
        if (userDomains.length === 0) {
            return res.json({
                success: true,
                locations: [],
                message: 'No websites configured. Create a workflow to start tracking.',
                timestamp: new Date().toISOString()
            });
        }
        
        // Build domain filter for ClickHouse query
        const domainPatterns = userDomains.map(d => `%${d}%`);

        // Query analytics_events for country data (same table as live users count)
        const resultSet = await clickhouse.query({
            query: `
                SELECT 
                    country_code,
                    uniq(session_id) as user_count
                FROM analytics_events
                WHERE timestamp >= now() - INTERVAL 5 MINUTE
                  AND country_code != ''
                  AND country_code != 'unknown'
                  AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
                GROUP BY country_code
                ORDER BY user_count DESC
                LIMIT 100
            `,
            query_params: Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d])),
            format: 'JSONEachRow'
        });
        
        const data = await resultSet.json();
        
        console.log(`🌍 Live locations for user ${user.id}: ${data.length} countries from domains: ${userDomains.join(', ')}`);
        
        res.json({
            success: true,
            locations: data,
            domains: userDomains,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Live locations error:', error);
        console.error('   Details:', error.message);
        // Return empty array on error (ClickHouse may not be available)
        res.json({ 
            success: true, 
            locations: [],
            error: 'ClickHouse query failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Page Visits Data (filtered by user's websites) - tracks ALL page visits, not just workflow-related
app.get('/api/analytics/page-visits', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        // Verify user authentication
        const user = await verifyUserToken(req);
        
        if (!user) {
          return res.json({
            success: true,
            data: {
              totalPageVisits: 0,
              uniqueSessions: 0,
              uniquePages: 0,
              todayVisits: 0,
              visitsByDate: {},
              recentVisits: []
            },
            message: 'Authentication required to view page visits'
          });
        }
        
        // Get user's website domains
        const userDomains = await getUserWebsiteDomains(user.id);
        
        if (userDomains.length === 0) {
          return res.json({
            success: true,
            data: {
              totalPageVisits: 0,
              uniqueSessions: 0,
              uniquePages: 0,
              todayVisits: 0,
              visitsByDate: {},
              recentVisits: []
            },
            message: 'No websites configured. Create a workflow to start tracking.'
          });
        }
        
        const domainPatterns = userDomains.map(d => `%${d}%`);
        
        // Query for page_view events from ClickHouse - this includes ALL page visits
        const [totalResult, dailyResult, recentResult] = await Promise.all([
          // Total stats
          clickhouse.query({
            query: `
              SELECT 
                count() as total_visits,
                uniq(session_id) as unique_sessions,
                uniq(page_url) as unique_pages,
                countIf(toDate(timestamp) = today()) as today_visits
              FROM analytics_events
              WHERE timestamp > now() - INTERVAL {days:UInt32} DAY
                AND event_type = 'page_view'
                AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
            `,
            query_params: { 
              days: parseInt(days),
              ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
            },
            format: 'JSONEachRow'
          }),
          // Daily breakdown
          clickhouse.query({
            query: `
              SELECT 
                toDate(timestamp) as date,
                count() as visits
              FROM analytics_events
              WHERE timestamp > now() - INTERVAL {days:UInt32} DAY
                AND event_type = 'page_view'
                AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
              GROUP BY date
              ORDER BY date ASC
            `,
            query_params: { 
              days: parseInt(days),
              ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
            },
            format: 'JSONEachRow'
          }),
          // Recent visits (last 100)
          clickhouse.query({
            query: `
              SELECT 
                page_url,
                session_id,
                visitor_id,
                device_type,
                country_code,
                timestamp
              FROM analytics_events
              WHERE timestamp > now() - INTERVAL {days:UInt32} DAY
                AND event_type = 'page_view'
                AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
              ORDER BY timestamp DESC
              LIMIT 100
            `,
            query_params: { 
              days: parseInt(days),
              ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
            },
            format: 'JSONEachRow'
          })
        ]);

        const totals = (await totalResult.json())[0] || { total_visits: 0, unique_sessions: 0, unique_pages: 0, today_visits: 0 };
        const dailyData = await dailyResult.json();
        const recentVisits = await recentResult.json();
        
        // Convert daily data to object format
        const visitsByDate = dailyData.reduce((acc, row) => {
          acc[row.date] = parseInt(row.visits);
          return acc;
        }, {});

        res.json({
            success: true,
            data: {
              totalPageVisits: parseInt(totals.total_visits),
              uniqueSessions: parseInt(totals.unique_sessions),
              uniquePages: parseInt(totals.unique_pages),
              todayVisits: parseInt(totals.today_visits),
              visitsByDate,
              recentVisits: recentVisits.map(v => ({
                pageUrl: v.page_url,
                sessionId: v.session_id,
                visitorId: v.visitor_id,
                deviceType: v.device_type,
                countryCode: v.country_code,
                timestamp: v.timestamp
              }))
            },
            domains: userDomains
        });
    } catch (error) {
        console.error('Page visits error:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to fetch page visits',
          data: {
            totalPageVisits: 0,
            uniqueSessions: 0,
            uniquePages: 0,
            todayVisits: 0,
            visitsByDate: {},
            recentVisits: []
          }
        });
    }
});

// Timeseries Data (filtered by user's websites)
app.get('/api/analytics/timeseries', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        // Verify user authentication
        const user = await verifyUserToken(req);
        
        if (!user) {
          return res.json({
            success: true,
            data: [],
            message: 'Authentication required to view timeseries data'
          });
        }
        
        // Get user's website domains
        const userDomains = await getUserWebsiteDomains(user.id);
        
        if (userDomains.length === 0) {
          return res.json({
            success: true,
            data: [],
            message: 'No websites configured. Create a workflow to start tracking.'
          });
        }
        
        const domainPatterns = userDomains.map(d => `%${d}%`);
        
        const resultSet = await clickhouse.query({
            query: `
                SELECT 
                    toDate(timestamp) as date,
                    count() as events,
                    uniq(session_id) as sessions
                FROM analytics_events
                WHERE timestamp > now() - INTERVAL {days:UInt32} DAY
                  AND (${domainPatterns.map((_, i) => `page_url LIKE {domain${i}:String}`).join(' OR ')})
                GROUP BY date
                ORDER BY date ASC
            `,
            query_params: { 
              days: parseInt(days),
              ...Object.fromEntries(domainPatterns.map((d, i) => [`domain${i}`, d]))
            },
            format: 'JSONEachRow'
        });

        const data = await resultSet.json();
        
        res.json({
            success: true,
            data,
            domains: userDomains
        });
    } catch (error) {
        console.error('Timeseries error:', error);
        res.status(500).json({ error: 'Failed to fetch timeseries' });
    }
});

// SPA fallback - serve React app for all non-API routes
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/tracking-') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.html')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Check if build directory exists
  const buildPath = path.join(__dirname, 'build', 'index.html');
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Frontend not built: build/index.html not found');
    console.log('📁 Available files in current directory:', fs.readdirSync(__dirname));
    
    // Serve a basic API-focused landing page instead of 503
    return res.status(200).send(`
      <html>
        <head>
          <title>TrackFlow API Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; }
            .header { text-align: center; color: #333; margin-bottom: 2rem; }
            .endpoint { background: #f5f5f5; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
            .status { color: #22c55e; font-weight: bold; }
            .code { background: #000; color: #0f0; padding: 1rem; font-family: monospace; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚀 TrackFlow API Server</h1>
            <p class="status">✅ Online and Ready</p>
            <p>Frontend building in progress... APIs fully functional!</p>
          </div>
          
          <div class="endpoint">
            <h3>🔧 Active Workflows API</h3>
            <div class="code">GET ${req.protocol}://${req.get('host')}/api/workflows/active</div>
          </div>
          
          <div class="endpoint">
            <h3>📊 Health Check</h3>
            <div class="code">GET ${req.protocol}://${req.get('host')}/api/health</div>
          </div>
          
          <div class="endpoint">
            <h3>🎯 Workflow System Script</h3>
            <div class="code">&lt;script src="${req.protocol}://${req.get('host')}/api/unified-workflow-system.js"&gt;&lt;/script&gt;</div>
          </div>
          
          <div class="endpoint">
            <h3>🕷️ Web Scraping</h3>
            <div class="code">POST ${req.protocol}://${req.get('host')}/api/scrape</div>
          </div>
          
          <p style="text-align: center; margin-top: 2rem;">
            <button onclick="location.reload()" style="padding: 0.5rem 1rem; font-size: 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔄 Refresh for Frontend
            </button>
          </p>
        </body>
      </html>
    `);
  }
  
  // Serve the React app
  res.sendFile(buildPath);
});

app.listen(PORT, () => {
  console.log(`🚀 TrackFlow Platform running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🕷️ Scrape: POST http://localhost:${PORT}/api/scrape`);
  console.log(`🎯 Tracking: http://localhost:${PORT}/tracking-script.js`);
  console.log(`📊 Analytics: POST http://localhost:${PORT}/api/analytics/track`);
  console.log(`📈 Page Visits: GET http://localhost:${PORT}/api/analytics/page-visits`);
  console.log(`🔄 Workflows: GET http://localhost:${PORT}/api/workflows/active`);
  console.log(`🛤️ Journey Tracker: http://localhost:${PORT}/journey-tracker.js`);
  console.log(`📈 Journey Updates: POST http://localhost:${PORT}/api/journey-update`);
  console.log(`🎯 High Intent: GET http://localhost:${PORT}/api/journey-analytics/high-intent`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
});

export default app; 