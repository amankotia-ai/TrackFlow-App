# Workflow Integration Guide

## Quick Start

To integrate TrackFlow workflows into your website, you need to add the tracking script with your actual workflow ID from the database.

## Step 1: Get Your Workflow ID

1. Go to your TrackFlow dashboard
2. Open the workflow you want to use
3. Copy the workflow ID (it looks like: `0861bb24-0005-40db-a8f2-0d5a012623bf`)

## Step 2: Add the Integration Code

Add this code to your website's `<head>` section:

```html
<!-- TrackFlow Integration -->
<script>
  // Replace with your actual workflow ID from the database
  window.ELEMENT_TRACKING_CONFIG = {
    workflowId: 'YOUR-WORKFLOW-ID-HERE', // e.g., '0861bb24-0005-40db-a8f2-0d5a012623bf'
    apiEndpoint: "https://trackflow-webapp-production.up.railway.app/api/analytics/track",
    workflowEndpoint: "https://trackflow-webapp-production.up.railway.app",
    debug: false, // Set to true for debugging
    autoTrack: true
  };
</script>

<!-- Load TrackFlow Scripts -->
<script src="https://trackflow-webapp-production.up.railway.app/enhanced-tracking-script.js"></script>
<script src="https://trackflow-webapp-production.up.railway.app/workflow-executor.js"></script>
```

## Step 3: Test Your Integration

1. Open your website with the integration code
2. Open the browser console (F12)
3. Look for messages starting with 🎯
4. You should see:
   - "Enhanced Element Tracker: Initializing..."
   - "Workflow Executor: Initialized"
   - "Loading workflows..."

## Common Issues

### "Tracker failed to initialize"
- Make sure you're using the `enhanced-tracking-script.js` (not just `tracking-script.js`)
- Check that both scripts are loading successfully
- Verify your workflow ID is correct

### "Workflow not found or inactive"
- Make sure your workflow is activated in the dashboard
- Verify the workflow ID matches exactly
- Check that the target URL is set to `*` or matches your page

### Triggers not firing
- Check the browser console for detailed logs
- Verify your trigger conditions match the page state
- Look for messages like "Evaluating trigger: Device Type"

## Example Integration

Here's a complete example for a page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
  
  <!-- TrackFlow Integration -->
  <script>
    window.ELEMENT_TRACKING_CONFIG = {
      workflowId: '0861bb24-0005-40db-a8f2-0d5a012623bf',
      apiEndpoint: "https://trackflow-webapp-production.up.railway.app/api/analytics/track",
      workflowEndpoint: "https://trackflow-webapp-production.up.railway.app",
      debug: true,
      autoTrack: true
    };
  </script>
  
  <script src="https://trackflow-webapp-production.up.railway.app/enhanced-tracking-script.js"></script>
  <script src="https://trackflow-webapp-production.up.railway.app/workflow-executor.js"></script>
</head>
<body>
  <h1 class="hero-headline">Welcome to My Site</h1>
  <button class="cta-button">Get Started</button>
</body>
</html>
```

## Debugging Tips

1. **Enable Debug Mode**: Set `debug: true` in the config
2. **Check Network Tab**: Ensure scripts are loading (200 status)
3. **Console Logs**: Look for workflow evaluation messages
4. **Test Triggers**: Use simple triggers like "Device Type" first

## Advanced Configuration

### Custom Selectors
Track specific elements by adding custom selectors:

```javascript
window.ELEMENT_TRACKING_CONFIG = {
  workflowId: 'YOUR-WORKFLOW-ID',
  // ... other config
  customSelectors: [
    '.special-button',
    '#important-form',
    '[data-track="true"]'
  ]
};
```

### Multiple Workflows
To use multiple workflows on the same page, the enhanced tracker will load all active workflows for your account automatically. Just ensure they have the correct target URL set.

## Support

If you're still having issues:
1. Check the browser console for error messages
2. Verify your workflow is active and properly configured
3. Test with a simple workflow first (e.g., Device Type trigger → Replace Text action) 