# Journey Tracker Integration Guide

## What is Journey Tracker?

The Journey Tracker is a **cookie-free analytics system** that tracks user behavior across your website without storing any cookies or personal data. It tracks:

- Page visits and navigation patterns
- Time on page
- Scroll depth
- User interactions (clicks, form submissions)
- Intent scoring
- Traffic sources (UTM parameters, referrers)
- Device information

## Quick Start Integration

### Method 1: Direct Script Include (Simplest)

Add this to your website's HTML (before closing `</body>` tag):

```html
<!-- Cookie-Free Journey Tracker -->
<script src="https://cdn.jsdelivr.net/gh/amankotia-ai/TrackFlow-App@main/public/journey-tracker.js"></script>

<script>
  // Initialize the journey tracker
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
    enableTracking: true,
    debug: false, // Set to true during development
    sendInterval: 30000, // Send data every 30 seconds
    maxJourneyLength: 50 // Track up to 50 pages in journey
  });

  // Start tracking
  journeyTracker.initialize();
  
  console.log('✅ Journey Tracker initialized');
</script>
```

### Method 2: Self-Hosted (Recommended)

1. **Copy the journey tracker file:**
   ```bash
   # Copy from your TrackFlow project
   cp public/journey-tracker.js /path/to/your/website/js/
   ```

2. **Add to your HTML:**

```html
<!-- Cookie-Free Journey Tracker -->
<script src="/js/journey-tracker.js"></script>

<script>
  // Initialize with your configuration
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://your-trackflow-backend.com/api/journey',
    enableTracking: true,
    debug: true, // Enable debug during setup
    sendInterval: 30000,
    maxJourneyLength: 50,
    
    // Optional: Custom configuration
    intentScoring: {
      pageViewWeight: 1,
      timeOnPageWeight: 2,
      scrollDepthWeight: 1.5,
      interactionWeight: 3
    }
  });

  // Initialize the tracker
  journeyTracker.initialize();
</script>
```

## Complete Integration Example

Here's a complete HTML example showing how to integrate the journey tracker:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website with Journey Tracking</title>
</head>
<body>
  
  <!-- Your website content here -->
  <header>
    <h1>Welcome to My Website</h1>
  </header>
  
  <main>
    <p>Your content here...</p>
  </main>

  <!-- Journey Tracker Integration -->
  <script src="/js/journey-tracker.js"></script>
  <script>
    // Initialize Journey Tracker
    const journeyTracker = new CookieFreeJourneyTracker({
      apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
      enableTracking: true,
      debug: true, // See tracking events in console
      sendInterval: 30000, // Send updates every 30 seconds
      maxJourneyLength: 50,
      
      // Intent scoring weights (optional)
      intentScoring: {
        pageViewWeight: 1,
        timeOnPageWeight: 2,
        scrollDepthWeight: 1.5,
        interactionWeight: 3
      }
    });

    // Initialize the tracker
    journeyTracker.initialize();
    
    // Optional: Track custom events
    journeyTracker.trackEvent({
      type: 'button_click',
      category: 'engagement',
      label: 'signup_button',
      value: 'header'
    });
    
    // Optional: Access journey data
    const journey = journeyTracker.getCurrentJourney();
    console.log('Current Journey:', journey);
    
    // Optional: Get intent score
    const intentScore = journeyTracker.getIntentScore();
    console.log('Intent Score:', intentScore);
  </script>
</body>
</html>
```

## Configuration Options

### Basic Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | string | Required | Your TrackFlow backend API endpoint |
| `enableTracking` | boolean | `true` | Enable/disable tracking |
| `debug` | boolean | `false` | Enable console logging for debugging |
| `sendInterval` | number | `30000` | How often to send data (milliseconds) |
| `maxJourneyLength` | number | `50` | Max pages to track in journey |

### Advanced Configuration

```javascript
const journeyTracker = new CookieFreeJourneyTracker({
  // Required
  apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
  
  // Optional - Tracking Settings
  enableTracking: true,
  debug: false,
  sendInterval: 30000,
  maxJourneyLength: 50,
  
  // Optional - Intent Scoring Weights
  intentScoring: {
    pageViewWeight: 1,        // Weight for each page view
    timeOnPageWeight: 2,      // Weight for time spent
    scrollDepthWeight: 1.5,   // Weight for scroll depth
    interactionWeight: 3      // Weight for interactions (clicks, forms)
  },
  
  // Optional - Session Settings
  sessionTimeout: 1800000,    // 30 minutes session timeout
  
  // Optional - Privacy Settings
  respectDoNotTrack: true,    // Respect browser DNT setting
  anonymizeIP: true           // Anonymize IP addresses
});
```

## API Methods

### Core Methods

```javascript
// Initialize tracking
journeyTracker.initialize();

// Get current journey data
const journey = journeyTracker.getCurrentJourney();

// Get intent score (0-1)
const score = journeyTracker.getIntentScore();

// Track custom event
journeyTracker.trackEvent({
  type: 'video_watch',
  category: 'engagement',
  label: 'product_demo',
  value: 'homepage'
});

// Track conversion
journeyTracker.trackConversion({
  type: 'signup',
  value: 99.99,
  currency: 'USD'
});

// Get days since first visit
const days = journeyTracker.getDaysSinceFirstVisit();

// Check if returning visitor
const isReturning = journeyTracker.isReturningVisitor();
```

## Integration with TrackFlow Workflows

The Journey Tracker works seamlessly with the Unified Workflow System:

```html
<!-- Load both systems -->
<script src="/js/journey-tracker.js"></script>
<script src="/js/unifiedWorkflowSystem.js"></script>

<script>
  // 1. Initialize Journey Tracker
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
    enableTracking: true,
    debug: true
  });
  journeyTracker.initialize();
  
  // 2. Initialize Workflow System
  const workflowSystem = new UnifiedWorkflowSystem({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app',
    debug: true
  });
  
  // 3. They work together automatically!
  // Journey Tracker collects data
  // Workflow System uses that data for triggers
  
  // Example: Trigger workflow based on intent score
  setInterval(() => {
    const intentScore = journeyTracker.getIntentScore();
    if (intentScore > 0.7) {
      console.log('High intent user detected!');
      // Workflows with "User Journey" triggers will activate
    }
  }, 10000);
</script>
```

## React/Next.js Integration

```typescript
// components/JourneyTrackerProvider.tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    CookieFreeJourneyTracker: any;
  }
}

export function JourneyTrackerProvider({ children }: { children: React.ReactNode }) {
  const trackerRef = useRef<any>(null);

  useEffect(() => {
    // Load the script
    const script = document.createElement('script');
    script.src = '/js/journey-tracker.js';
    script.async = true;

    script.onload = () => {
      if (window.CookieFreeJourneyTracker) {
        trackerRef.current = new window.CookieFreeJourneyTracker({
          apiEndpoint: process.env.NEXT_PUBLIC_TRACKFLOW_API || 
                       'https://trackflow-app-production.up.railway.app/api/journey',
          enableTracking: true,
          debug: process.env.NODE_ENV === 'development',
          sendInterval: 30000
        });

        trackerRef.current.initialize();
        console.log('✅ Journey Tracker initialized');
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return <>{children}</>;
}

// Usage in _app.tsx or app/layout.tsx
import { JourneyTrackerProvider } from '@/components/JourneyTrackerProvider';

export default function App({ Component, pageProps }) {
  return (
    <JourneyTrackerProvider>
      <Component {...pageProps} />
    </JourneyTrackerProvider>
  );
}
```

## WordPress Integration

Add this to your theme's `footer.php` or use a plugin like "Insert Headers and Footers":

```php
<!-- Journey Tracker -->
<script src="<?php echo get_template_directory_uri(); ?>/js/journey-tracker.js"></script>
<script>
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
    enableTracking: true,
    debug: false,
    sendInterval: 30000
  });
  
  journeyTracker.initialize();
</script>
```

## Webflow Integration

1. Go to **Project Settings > Custom Code**
2. Add this to **Footer Code**:

```html
<script src="https://cdn.jsdelivr.net/gh/amankotia-ai/TrackFlow-App@main/public/journey-tracker.js"></script>
<script>
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
    enableTracking: true,
    debug: false,
    sendInterval: 30000
  });
  
  journeyTracker.initialize();
</script>
```

## Shopify Integration

1. Go to **Online Store > Themes > Actions > Edit Code**
2. Open `theme.liquid`
3. Add before `</body>`:

```liquid
<!-- Journey Tracker -->
<script src="https://cdn.jsdelivr.net/gh/amankotia-ai/TrackFlow-App@main/public/journey-tracker.js"></script>
<script>
  const journeyTracker = new CookieFreeJourneyTracker({
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api/journey',
    enableTracking: true,
    debug: false,
    sendInterval: 30000
  });
  
  journeyTracker.initialize();
  
  // Track Shopify-specific events
  {% if template contains 'product' %}
    journeyTracker.trackEvent({
      type: 'product_view',
      category: 'ecommerce',
      label: '{{ product.title }}',
      value: {{ product.price | money_without_currency }}
    });
  {% endif %}
  
  {% if template == 'cart' %}
    journeyTracker.trackEvent({
      type: 'cart_view',
      category: 'ecommerce',
      value: {{ cart.total_price | money_without_currency }}
    });
  {% endif %}
</script>
```

## Testing Your Integration

### 1. Check Console Logs

Enable debug mode and check browser console:

```javascript
const journeyTracker = new CookieFreeJourneyTracker({
  debug: true, // Enable debug
  // ... other config
});
```

You should see logs like:
```
✅ Journey Tracker initialized
📄 Page tracked: /homepage
🔄 Journey data sent to server
```

### 2. Inspect Journey Data

```javascript
// Check current journey
console.log('Journey:', journeyTracker.getCurrentJourney());

// Check intent score
console.log('Intent Score:', journeyTracker.getIntentScore());

// Check session data
console.log('Session Storage:', sessionStorage.getItem('userJourney'));
```

### 3. Verify API Calls

Open browser DevTools > Network tab and look for calls to your API endpoint.

## Privacy & GDPR Compliance

The Journey Tracker is designed to be privacy-first:

✅ **No cookies** - Uses sessionStorage instead  
✅ **No personal data** - Tracks behavior, not identity  
✅ **No cross-site tracking**  
✅ **Respects Do Not Track** (when enabled)  
✅ **IP anonymization** (when enabled)  

### Enable Privacy Features

```javascript
const journeyTracker = new CookieFreeJourneyTracker({
  respectDoNotTrack: true,    // Respect browser DNT
  anonymizeIP: true,          // Anonymize IP addresses
  enableTracking: !navigator.doNotTrack // Auto-disable if DNT set
});
```

## Troubleshooting

### Tracker Not Initializing

```javascript
// Check if class exists
if (typeof CookieFreeJourneyTracker === 'undefined') {
  console.error('Journey Tracker script not loaded');
} else {
  console.log('Journey Tracker available');
}
```

### No Data Being Sent

1. Check API endpoint is correct
2. Check CORS settings on your backend
3. Verify sendInterval isn't too long
4. Check browser console for errors

### SessionStorage Issues

```javascript
// Check if sessionStorage is available
if (typeof(Storage) !== "undefined") {
  console.log('SessionStorage available');
} else {
  console.error('SessionStorage not supported');
}
```

## What Data is Tracked?

The Journey Tracker collects:

```javascript
{
  sessionId: 'unique-session-id',
  pages: [
    {
      path: '/homepage',
      title: 'Home',
      enteredAt: 1699000000000,
      exitedAt: 1699000030000,
      timeOnPage: 30000,
      scrollDepth: 75,
      interactions: ['click:.cta-button', 'submit:#contact-form']
    }
  ],
  trafficSource: {
    referrer: 'https://google.com',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'summer-sale'
  },
  device: {
    type: 'desktop',
    browser: 'Chrome',
    os: 'MacOS'
  },
  intentScore: 0.75
}
```

## Next Steps

1. ✅ Add the journey tracker script to your website
2. ✅ Initialize with your API endpoint
3. ✅ Test in debug mode
4. ✅ Verify data is being collected
5. ✅ Integrate with TrackFlow workflows
6. ✅ Monitor analytics in your TrackFlow dashboard

## Support

For issues or questions:
- Check the console logs (debug mode)
- Review network requests
- Verify API endpoint is accessible
- Check CORS configuration on backend

## File Locations

- **Public Distribution**: `/public/journey-tracker.js`
- **Source**: `/src/utils/journeyTracker.js`
- **Schema**: `/journey-analytics-schema.sql`
- **Documentation**: `/JOURNEY_TRACKING_IMPLEMENTATION.md`


