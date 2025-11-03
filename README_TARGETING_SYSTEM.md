# 🎯 TrackFlow Targeting System - Complete Guide

> **How we target classes, operations, and trigger nodes for websites using React 18 + TypeScript**

---

## 📚 Documentation Index

This guide explains how TrackFlow implements **intelligent element targeting** and **workflow automation** using your modern tech stack.

### Quick Navigation

1. **[REACT_WORKFLOW_TARGETING_GUIDE.md](./REACT_WORKFLOW_TARGETING_GUIDE.md)** - Complete architectural guide
2. **[QUICK_REFERENCE_TARGETING.md](./QUICK_REFERENCE_TARGETING.md)** - Quick reference for triggers & actions
3. **[ARCHITECTURE_FLOW_DIAGRAM.md](./ARCHITECTURE_FLOW_DIAGRAM.md)** - Visual architecture diagrams
4. **[IMPLEMENTATION_COOKBOOK.md](./IMPLEMENTATION_COOKBOOK.md)** - Copy-paste code snippets

### Code Examples

- **[examples/SelectorBuilder.tsx](./examples/SelectorBuilder.tsx)** - Element selector builder component
- **[examples/TriggerNodeExample.tsx](./examples/TriggerNodeExample.tsx)** - Building trigger nodes
- **[examples/ActionNodeExample.tsx](./examples/ActionNodeExample.tsx)** - Building action nodes

---

## 🎯 Executive Summary

### The Problem

TrackFlow needs to:
1. **Target DOM elements** reliably across different websites
2. **Trigger workflows** based on user behavior
3. **Execute actions** that modify website content/behavior
4. **Track user journeys** without cookies (GDPR-friendly)

### The Solution

```
React/TypeScript UI (Builder)
       ↓
Supabase Database (Storage)
       ↓
Vanilla JS Runtime (Executor)
       ↓
Target Website DOM (Modification)
```

**Key Innovation**: Multi-strategy element targeting with intelligent fallbacks

---

## 🏗️ System Architecture

### Tech Stack Mapping

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **UI Builder** | React 18, TypeScript, Vite, Tailwind, shadcn/ui | Create & configure workflows |
| **Forms** | React Hook Form, Zod | Validate configuration |
| **Data** | TanStack Query, Supabase | Fetch & persist workflows |
| **Runtime** | Vanilla JavaScript | Execute on client websites |
| **Targeting** | Multi-strategy CSS selectors | Find DOM elements reliably |
| **Tracking** | Journey Tracker (cookie-free) | Track user behavior |

### Data Flow

```typescript
// 1. User builds workflow in React
const workflow = {
  nodes: [
    { type: 'trigger', name: 'Page Visits', config: { visitCount: 3 } },
    { type: 'action', name: 'Replace Text', config: { selector: '.hero', newText: 'Welcome!' } }
  ],
  connections: [{ sourceNodeId: 'trigger-1', targetNodeId: 'action-1' }]
};

// 2. Saved to Supabase via TanStack Query
await saveWorkflow.mutateAsync(workflow);

// 3. Loaded by vanilla JS on client website
const workflows = await fetch('/api/workflows/active').then(r => r.json());

// 4. Triggered by user behavior
if (pageVisits >= 3) {
  executeAction({ selector: '.hero', newText: 'Welcome!' });
}

// 5. Element resolved using strategies
const element = resolveElement([
  { selector: '#hero-text', type: 'id', reliability: 95 },
  { selector: '[data-testid="hero"]', type: 'attribute', reliability: 90 },
  { selector: '.hero-text', type: 'class', reliability: 70 }
]);

// 6. DOM modified
element.textContent = 'Welcome!';
```

---

## 🎯 Element Targeting System

### The Challenge

A simple selector like `.button` might match multiple elements:

```html
<button class="button">Sign Up</button>
<button class="button">Learn More</button>
<button class="button">Contact</button>
```

**Problem**: Which button should we target?

### The Solution: Multi-Strategy Targeting

```typescript
interface TargetingStrategy {
  selector: string;              // CSS selector
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child';
  reliability: number;           // 0-100, higher = more reliable
  description: string;
  isUnique: boolean;
}

// Example: Multiple strategies for one element
const buttonStrategies = [
  { selector: '#signup-btn', type: 'id', reliability: 95, isUnique: true },
  { selector: '[data-testid="signup"]', type: 'attribute', reliability: 90, isUnique: true },
  { selector: '.button.primary', type: 'class', reliability: 75, isUnique: false },
  { selector: 'header .cta .button:first-child', type: 'path', reliability: 80, isUnique: true }
];
```

### Resolution Process

```
1. Try highest reliability strategy (ID)
   ├─ Found 1 element? ✓ Use it
   └─ Found 0? Try next strategy

2. Try second strategy (Data Attribute)
   ├─ Found 1 element? ✓ Use it
   └─ Found multiple? Disambiguate

3. Disambiguation Methods:
   ├─ Match original text content
   ├─ Match exact position
   ├─ Match attributes
   └─ First visible element

4. Return element or fail gracefully
```

### Real-World Example

```typescript
// User configures action in React UI
const actionConfig = {
  selector: '.cta-button',           // User-friendly selector
  selectorStrategies: [              // Auto-generated strategies
    { selector: '#hero-cta', type: 'id', reliability: 95 },
    { selector: '[data-action="signup"]', type: 'attribute', reliability: 90 },
    { selector: '.hero .cta-button', type: 'class', reliability: 75 }
  ],
  originalText: 'Get Started',       // For disambiguation
  newText: 'Start Free Trial'
};

// Runtime resolution
const result = resolveElement(
  actionConfig.selectorStrategies,
  { originalText: actionConfig.originalText },
  'Replace Text'
);

if (result.success) {
  result.element.textContent = actionConfig.newText;
}
```

---

## 🔥 Trigger System

### Trigger Types

| Category | Trigger | Description | Config Example |
|----------|---------|-------------|----------------|
| **Behavior** | Page Visits | After N page views | `{ visitCount: 3, timeframe: 'session' }` |
| **Behavior** | Time on Page | After N seconds | `{ duration: 30, unit: 'seconds' }` |
| **Behavior** | Scroll Depth | After scrolling N% | `{ percentage: 50 }` |
| **Behavior** | User Journey | After visiting pages | `{ pages: ['/pricing', '/signup'], order: 'any' }` |
| **Source** | UTM Parameters | Based on UTM values | `{ parameter: 'utm_source', value: 'google' }` |
| **Source** | Device Type | Based on device | `{ device: 'mobile' }` |
| **Interaction** | Element Click | When element clicked | `{ selector: '.cta-button' }` |
| **Interaction** | Exit Intent | When user tries to leave | `{ showOnce: true }` |
| **Interaction** | Form Focus | When form field focused | `{ formSelector: '#contact-form' }` |

### Trigger Evaluation Flow

```javascript
// 1. Event occurs (scroll, click, navigation, etc.)
trackEvent({ type: 'scroll_depth', depth: 75 });

// 2. Load active workflows
const workflows = await getActiveWorkflows();

// 3. Evaluate each workflow's triggers
for (const workflow of workflows) {
  const trigger = workflow.nodes.find(n => n.type === 'trigger');
  
  if (evaluateTrigger(trigger, eventData)) {
    // 4. Find connected actions
    const actions = getConnectedActions(workflow, trigger.id);
    
    // 5. Execute actions
    await executeActions(actions);
  }
}
```

### Example: Journey-Based Trigger

```typescript
// User configuration in React
const journeyTrigger = {
  type: 'trigger',
  name: 'User Journey',
  config: {
    triggerType: 'user-journey',
    pages: ['/home', '/pricing', '/features'],
    order: 'any',          // Visit in any order
    minIntentScore: 0.7    // High-intent users only
  }
};

// Runtime evaluation
function evaluateUserJourneyTrigger(trigger, eventData) {
  const journey = window.journeyTracker.getAnalytics();
  
  // Check if all pages were visited
  const pagesVisited = trigger.config.pages.every(page =>
    journey.pagePaths.includes(page)
  );
  
  // Check intent score threshold
  const intentMatch = journey.intentScore >= trigger.config.minIntentScore;
  
  return pagesVisited && intentMatch;
}
```

---

## ⚡ Action System

### Action Types

| Category | Action | Description | Config Example |
|----------|--------|-------------|----------------|
| **Content** | Replace Text | Change text content | `{ selector: '.headline', newText: 'Welcome!' }` |
| **Content** | Replace Image | Change image source | `{ selector: 'img.hero', newImageUrl: 'url' }` |
| **Style** | Change Style | Modify CSS | `{ selector: '.btn', styleProperty: 'color', styleValue: '#ff0000' }` |
| **Style** | Add Class | Add CSS class | `{ selector: '.btn', className: 'highlighted' }` |
| **Visibility** | Hide Element | Hide element | `{ selector: '.popup', animation: 'fade' }` |
| **Visibility** | Show Element | Show element | `{ selector: '.offer', animation: 'slide' }` |
| **Display** | Display Overlay | Show popup/banner | `{ type: 'modal', content: 'html' }` |
| **Navigation** | Redirect | Redirect user | `{ url: 'https://...', delay: 0 }` |

### Action Execution Flow

```javascript
async function executeAction(action) {
  // 1. Resolve target element
  const result = resolveElement(
    action.config.selectorStrategies,
    { originalText: action.config.originalText },
    action.name
  );
  
  if (!result.success) {
    console.error('Element not found');
    return { success: false };
  }
  
  // 2. Execute operation
  switch (action.name) {
    case 'Replace Text':
      result.element.textContent = action.config.newText;
      break;
    
    case 'Change Style':
      result.element.style[action.config.styleProperty] = action.config.styleValue;
      break;
    
    case 'Hide Element':
      result.element.style.display = 'none';
      break;
  }
  
  // 3. Track execution
  trackExecution(action.id, { success: true });
  
  return { success: true, element: result.element };
}
```

---

## 🛤️ Cookie-Free Journey Tracking

### Storage Strategy

| Data Type | Storage | Persistence | Privacy |
|-----------|---------|-------------|---------|
| Current Journey | sessionStorage | Browser session | Auto-deleted on close |
| Visit Count | localStorage | User-controlled | User can clear |
| UTM Attribution | localStorage | User-controlled | User can clear |
| Real-time Events | In-memory | Current page | No persistence |

**Zero cookies. 100% GDPR-friendly.**

### Intent Score Calculation

```javascript
// Factors contributing to intent score:
const intentScore = 
  (highIntentPages * 0.25) +      // 25% - pricing, checkout pages
  (formInteractions * 0.20) +      // 20% - email, phone fields
  (timeOnSite * 0.15) +            // 15% - > 2 minutes
  (pageDepth * 0.10) +             // 10% - > 3 pages
  (returnVisits * 0.15) +          // 15% - multiple sessions
  (intentSignals * 0.20) +         // 20% - demo, contact requests
  (scrollDepth * 0.10);            // 10% - > 50% scrolled

// Classification:
// 0.70 - 1.00 = HIGH (hot lead)
// 0.40 - 0.69 = MEDIUM (warm lead)
// 0.00 - 0.39 = LOW (cold lead)
```

---

## 📦 React Components

### Key Components

```
src/
├── components/
│   ├── WorkflowBuilder.tsx       # Main workflow canvas
│   ├── WorkflowNode.tsx          # Visual node representation
│   ├── NodeConfigPanel.tsx       # Configuration sidebar
│   ├── NodeLibrary.tsx           # Available nodes library
│   ├── SelectorBuilder.tsx       # CSS selector builder
│   └── IntegrationModal.tsx      # Code generation
│
├── hooks/
│   ├── useWorkflows.ts           # TanStack Query hooks
│   ├── useWebScraper.ts          # Website scraping
│   └── useAutoSave.ts            # Auto-save functionality
│
├── services/
│   ├── workflowService.ts        # API client
│   └── aiService.ts              # AI-powered features
│
├── types/
│   └── workflow.ts               # TypeScript definitions
│
└── utils/
    ├── elementTargeting.ts       # Element resolution
    └── journeyTracker.js         # Journey tracking
```

### Example Component

```typescript
// WorkflowBuilder.tsx
import { useWorkflow, useSaveWorkflow } from '../hooks/useWorkflows';

export const WorkflowBuilder = ({ workflowId }) => {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const saveWorkflow = useSaveWorkflow();

  const handleSave = async (updatedWorkflow) => {
    await saveWorkflow.mutateAsync(updatedWorkflow);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <WorkflowCanvas
      workflow={workflow}
      onSave={handleSave}
    />
  );
};
```

---

## 🚀 Getting Started

### 1. Read the Guides

- Start with **[REACT_WORKFLOW_TARGETING_GUIDE.md](./REACT_WORKFLOW_TARGETING_GUIDE.md)** for architecture overview
- Use **[QUICK_REFERENCE_TARGETING.md](./QUICK_REFERENCE_TARGETING.md)** as a cheat sheet
- Refer to **[IMPLEMENTATION_COOKBOOK.md](./IMPLEMENTATION_COOKBOOK.md)** for code examples

### 2. Explore Examples

- Check **[examples/SelectorBuilder.tsx](./examples/SelectorBuilder.tsx)** for element targeting UI
- Review **[examples/TriggerNodeExample.tsx](./examples/TriggerNodeExample.tsx)** for trigger configuration
- Study **[examples/ActionNodeExample.tsx](./examples/ActionNodeExample.tsx)** for action configuration

### 3. Understand the Flow

```
User creates workflow in React
    ↓
Saves to Supabase via TanStack Query
    ↓
Client website loads vanilla JS executor
    ↓
Event triggers workflow evaluation
    ↓
Multi-strategy targeting finds element
    ↓
Action modifies DOM
    ↓
Execution tracked in database
```

---

## 💡 Key Takeaways

### ✅ What Makes TrackFlow Unique

1. **Multi-Strategy Targeting**: Never rely on a single CSS selector
2. **Type-Safe**: Full TypeScript support from UI to database
3. **Cookie-Free**: 100% GDPR-compliant journey tracking
4. **Universal Runtime**: Vanilla JS works on any website
5. **Intelligent Fallbacks**: Graceful degradation when elements change
6. **Real-time Validation**: React Hook Form + Zod catch errors early

### 🎯 Best Practices

- Always provide 3+ targeting strategies per element
- Use ID or data attributes when possible (highest reliability)
- Include original text for text-based disambiguation
- Test selectors in browser console before deploying
- Enable debug mode during development
- Track execution metrics for monitoring

### 🚫 Common Pitfalls to Avoid

- Don't rely on single fragile selectors (e.g., `div > div > button:nth-child(3)`)
- Don't use `any` type in TypeScript - be explicit
- Don't ignore targeting errors - handle them gracefully
- Don't track every scroll event - use debouncing
- Don't forget to update workflow status to "active"

---

## 📞 Need Help?

- **Architecture Questions**: See [ARCHITECTURE_FLOW_DIAGRAM.md](./ARCHITECTURE_FLOW_DIAGRAM.md)
- **Code Examples**: Check [IMPLEMENTATION_COOKBOOK.md](./IMPLEMENTATION_COOKBOOK.md)
- **Quick Reference**: Use [QUICK_REFERENCE_TARGETING.md](./QUICK_REFERENCE_TARGETING.md)
- **Complete Guide**: Read [REACT_WORKFLOW_TARGETING_GUIDE.md](./REACT_WORKFLOW_TARGETING_GUIDE.md)

---

## 🎉 Summary

TrackFlow uses:

- **React 18 + TypeScript** for type-safe workflow building
- **Multi-strategy targeting** for reliable element resolution
- **Vanilla JavaScript runtime** for universal compatibility
- **Cookie-free tracking** for privacy compliance
- **TanStack Query** for efficient data management
- **Zod validation** for runtime type checking

**Result**: A powerful, reliable, privacy-friendly workflow automation system that works on any website!

---

**Ready to build workflows?** Start with the [REACT_WORKFLOW_TARGETING_GUIDE.md](./REACT_WORKFLOW_TARGETING_GUIDE.md)! 🚀



