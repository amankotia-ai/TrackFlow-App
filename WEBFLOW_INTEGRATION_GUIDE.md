# Webflow Integration Guide

## 🎯 How URL Targeting Works

The unified workflow system automatically determines which workflows to run on which pages using **URL targeting patterns** configured in your workflow dashboard.

## 📍 URL Targeting Options

When creating a workflow in the dashboard, you set a **Target URL** that determines where it runs:

### 1. **Universal (`*`)**
```
Target URL: *
```
- Runs on **ALL pages** of your website
- Good for: Global elements like headers, footers, exit intent popups

### 2. **Specific Page**
```
Target URL: /pricing
Target URL: /about
Target URL: /contact
```
- Runs only on pages containing that path
- Good for: Page-specific optimizations

### 3. **Page Pattern**
```
Target URL: /blog/
Target URL: /product/
Target URL: /category/
```
- Runs on all pages starting with that pattern
- Good for: Section-wide optimizations

### 4. **Full URL**
```
Target URL: https://yoursite.webflow.io/landing-page
Target URL: https://yoursite.com/special-offer
```
- Runs only on exact URL matches
- Good for: Campaign-specific landing pages

## 🌐 Webflow Integration Methods

### Method 1: Site-Wide Integration (Recommended)

Add this to your Webflow site's **Custom Code** → **Footer Code**:

```html
<!-- Unified Workflow System - Add to Footer -->
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

**Result**: All workflows will automatically load and execute based on their URL targeting.

### Method 2: Page-Specific Integration

Add this to specific pages in **Page Settings** → **Custom Code** → **Footer Code**:

```html
<!-- Only on specific pages -->
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

### Method 3: Conditional Integration

```html
<!-- Advanced: Only load on certain conditions -->
<script>
  // Example: Only load on landing pages
  if (window.location.pathname.includes('/landing/')) {
    const script = document.createElement('script');
    script.src = 'https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js';
    document.head.appendChild(script);
  }
</script>
```

## 🎛️ How Workflow Assignment Works

Here's the complete flow:

### 1. **Page Load**
```
User visits: https://yoursite.com/pricing
```

### 2. **System Initialization**
```javascript
// Unified system starts automatically
window.workflowSystem = new UnifiedWorkflowSystem();
```

### 3. **Workflow Fetching**
```javascript
// System fetches workflows for current URL
GET /api/workflows/active?url=https://yoursite.com/pricing
```

### 4. **Server-Side Filtering**
```javascript
// Server returns workflows that match the URL
workflows.filter(workflow => {
  if (workflow.target_url === '*') return true;           // Universal
  if (url.includes(workflow.target_url)) return true;     // Pattern match
  return false;
});
```

### 5. **Client-Side Execution**
```javascript
// System processes triggers and executes actions
workflows.forEach(workflow => {
  // Check triggers (device type, UTM, etc.)
  // Execute connected actions if triggered
});
```

## 📊 Real-World Examples

### Example 1: Mobile CTA Optimization

**Dashboard Configuration:**
- **Workflow Name**: "Mobile CTA Optimization"
- **Target URL**: `*` (all pages)
- **Trigger**: Device Type = Mobile
- **Action**: Replace Text on `.cta-button` with "Tap to Start"

**Webflow Integration:**
```html
<!-- In Webflow Footer Code -->
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

**Result**: On mobile devices, all CTA buttons site-wide change to "Tap to Start"

### Example 2: Pricing Page Personalization

**Dashboard Configuration:**
- **Workflow Name**: "Google Ads Pricing"
- **Target URL**: `/pricing`
- **Trigger**: UTM Source = google
- **Action**: Replace Text on `.hero-headline` with "Special Google Offer!"

**Webflow Integration:**
```html
<!-- In Webflow Footer Code -->
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

**Result**: Visitors from Google Ads see personalized pricing headline

### Example 3: Blog Exit Intent

**Dashboard Configuration:**
- **Workflow Name**: "Blog Exit Intent"
- **Target URL**: `/blog/`
- **Trigger**: Exit Intent
- **Action**: Display Overlay with newsletter signup

**Webflow Integration:**
```html
<!-- In Webflow Footer Code -->
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```

**Result**: Popup appears when users try to leave blog pages

## 🔧 Advanced URL Targeting

### Custom URL Matching Logic

You can enhance the server-side URL matching in `railway-server.js`:

```javascript
// Enhanced URL matching
const activeWorkflows = workflows.filter(workflow => {
  const targetUrl = workflow.target_url;
  const currentUrl = new URL(url);
  
  // Universal match
  if (targetUrl === '*') return true;
  
  // Exact match
  if (targetUrl === url) return true;
  
  // Path match
  if (currentUrl.pathname.includes(targetUrl)) return true;
  
  // Regex pattern match (advanced)
  if (targetUrl.startsWith('regex:')) {
    const pattern = targetUrl.replace('regex:', '');
    return new RegExp(pattern).test(url);
  }
  
  // Domain match
  if (targetUrl.startsWith('domain:')) {
    const domain = targetUrl.replace('domain:', '');
    return currentUrl.hostname.includes(domain);
  }
  
  return false;
});
```

### Advanced Pattern Examples

| Target URL | Matches | Use Case |
|------------|---------|-----------|
| `*` | All pages | Global workflows |
| `/pricing` | `/pricing`, `/pricing-plans` | Pricing pages |
| `regex:^/blog/\d+` | `/blog/123`, `/blog/456` | Individual blog posts |
| `domain:staging` | All staging subdomains | Staging-only workflows |
| `?utm_source=google` | URLs with Google UTM | Campaign-specific |

## 🎨 Webflow-Specific Considerations

### 1. **Element Selectors**

Webflow generates specific classes. Use these patterns:

```css
/* Webflow class selectors */
.hero-headline-2
.button-primary
.section-hero
.text-block-3

/* Generic selectors (more reliable) */
h1
.btn
[data-automation="cta-button"]
```

### 2. **Webflow Designer Elements**

Target common Webflow elements:

```javascript
// Common Webflow element patterns
{
  "selector": ".hero-heading",        // Hero headlines
  "selector": ".button",              // Buttons
  "selector": ".rich-text h2",        // Rich text headings
  "selector": ".navbar-brand",        // Logo/brand
  "selector": ".footer-link",         // Footer links
}
```

### 3. **Responsive Considerations**

```javascript
// Works automatically with device type triggers
Device Type: Mobile  → Target mobile users
Device Type: Desktop → Target desktop users
```

## 🧪 Testing Your Integration

### 1. **Basic Test**

Add this to any Webflow page to verify the system loads:

```html
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
<script>
  setTimeout(() => {
    if (window.workflowSystem) {
      console.log('✅ Workflow system loaded');
      console.log('Workflows:', window.workflowSystem.workflows.size);
    } else {
      console.log('❌ Workflow system not found');
    }
  }, 2000);
</script>
```

### 2. **Debug Mode Test**

```html
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
<script>
  setTimeout(() => {
    if (window.workflowSystem) {
      window.workflowSystem.config.debug = true;
      console.log('🎯 Debug mode enabled');
    }
  }, 1000);
</script>
```

### 3. **URL Targeting Test**

Create test workflows with different URL patterns and verify they load correctly:

```javascript
// Check in browser console
console.log('Current URL:', window.location.href);
console.log('Loaded workflows:', window.workflowSystem.workflows.size);
```

## 🚀 Step-by-Step Webflow Setup

### Step 1: Create Workflows in Dashboard
1. Go to your workflow dashboard
2. Create new workflow
3. Set **Target URL** (e.g., `/pricing`, `*`, `/blog/`)
4. Configure triggers (Device Type, UTM, etc.)
5. Configure actions (Replace Text, Hide Element, etc.)
6. **Activate** the workflow

### Step 2: Add Script to Webflow
1. In Webflow Designer → Project Settings
2. Go to **Custom Code** tab
3. Add to **Footer Code**:
```html
<script src="https://trackflow-webapp-production.up.railway.app/api/unified-workflow-system.js"></script>
```
4. **Publish** your site

### Step 3: Test
1. Visit your Webflow site
2. Open browser Developer Tools
3. Check Console for workflow system messages
4. Verify workflows execute based on triggers

## 🔍 Troubleshooting

### No Workflows Loading?
```javascript
// Check in console:
window.workflowSystem.workflows.size  // Should be > 0
```

**Solutions:**
- Verify workflow is **Active** in dashboard
- Check **Target URL** matches current page
- Ensure workflow **Status** is "active"

### Actions Not Executing?
```javascript
// Enable debug mode:
window.workflowSystem.config.debug = true;
```

**Solutions:**
- Check **CSS selectors** match Webflow elements
- Verify **trigger conditions** are met
- Test **element exists** on page

### Integration Not Working?

**Check these:**
- Script loads correctly (no 404 errors)
- No JavaScript errors in console
- Webflow site is published with custom code
- Server endpoint is accessible

## 📈 Best Practices

### 1. **URL Targeting Strategy**
- Use `*` for global changes (header, footer)
- Use specific paths for page optimizations
- Use patterns for section-wide changes

### 2. **Element Selection**
- Use stable selectors (IDs when available)
- Test selectors in Webflow preview
- Avoid auto-generated class names when possible

### 3. **Performance**
- Workflows load once per page
- Actions execute immediately when triggered
- No ongoing server requests after initial load

---

**Result**: Your Webflow sites automatically personalize based on user behavior, device type, traffic source, and more - without any custom development! 🎯 