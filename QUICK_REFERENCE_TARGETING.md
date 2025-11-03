# 🎯 Quick Reference: Element Targeting & Workflow Operations

## Element Targeting Cheat Sheet

### CSS Selector Priority (Best to Worst)

| Priority | Selector Type | Example | Reliability | Use Case |
|----------|---------------|---------|-------------|----------|
| ⭐⭐⭐⭐⭐ | ID | `#signup-button` | 95% | Unique elements |
| ⭐⭐⭐⭐ | Data Attribute | `[data-testid="cta"]` | 90% | Test/automation friendly |
| ⭐⭐⭐ | Unique Class Combo | `.hero .cta-primary` | 75% | Specific components |
| ⭐⭐ | nth-of-type | `.button:nth-of-type(1)` | 70% | Positional targeting |
| ⭐ | Generic Class | `.button` | 50% | Multiple matches |

---

## Trigger Types Quick Reference

### Visitor Behavior

```typescript
// Page Visits
{
  triggerType: 'page-visits',
  visitCount: 3,
  timeframe: 'session' // 'session' | 'day' | 'week' | 'month'
}

// Time on Page  
{
  triggerType: 'time-on-page',
  duration: 30,
  unit: 'seconds' // 'seconds' | 'minutes'
}

// Scroll Depth
{
  triggerType: 'scroll-depth',
  percentage: 50, // 0-100
  element: '#section-id' // optional
}

// User Journey
{
  triggerType: 'user-journey',
  pages: ['/home', '/pricing', '/signup'],
  order: 'any', // 'any' | 'sequence'
  minIntentScore: 0.7 // optional, 0-1
}
```

### Traffic Source

```typescript
// UTM Parameters
{
  triggerType: 'utm-parameters',
  parameter: 'utm_source', // 'utm_source' | 'utm_medium' | etc.
  operator: 'equals', // 'equals' | 'contains' | 'starts_with' | 'exists'
  value: 'google'
}

// Device Type
{
  triggerType: 'device-type',
  device: 'mobile' // 'mobile' | 'tablet' | 'desktop'
}
```

### User Interaction

```typescript
// Element Click
{
  triggerType: 'element-click',
  selector: '.cta-button',
  requireText: false,
  textContent: '' // optional
}

// Exit Intent
{
  triggerType: 'exit-intent',
  showOnce: true // optional
}

// Form Interaction
{
  triggerType: 'form-interaction',
  formSelector: '#contact-form',
  field: 'email' // optional
}
```

---

## Action Types Quick Reference

### Content Modification

```typescript
// Replace Text
{
  actionType: 'replace-text',
  selector: '.hero-headline',
  newText: 'Welcome!',
  animation: 'fade' // 'none' | 'fade' | 'slide' | 'scale'
}

// Change Style
{
  actionType: 'change-style',
  selector: '.cta-button',
  styleProperty: 'backgroundColor',
  styleValue: '#ff0000',
  applyToAll: false
}

// Replace Image
{
  actionType: 'replace-image',
  selector: '.hero-image',
  newImageUrl: 'https://example.com/image.jpg',
  animation: 'crossfade'
}
```

### Element Visibility

```typescript
// Hide Element
{
  actionType: 'hide-element',
  selector: '.popup',
  animation: 'fade',
  removeFromDOM: false
}

// Show Element
{
  actionType: 'show-element',
  selector: '.special-offer',
  animation: 'slide'
}

// Add/Remove Class
{
  actionType: 'add-class',
  selector: '.button',
  className: 'highlighted',
  toggle: false // true = toggle, false = add only
}
```

### Display Actions

```typescript
// Display Overlay
{
  actionType: 'display-overlay',
  type: 'modal', // 'modal' | 'banner' | 'corner-notification' | 'fullscreen'
  content: '<h2>Special Offer!</h2>',
  position: 'center', // for banner: 'top' | 'bottom'
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showCloseButton: true,
  autoCloseDelay: 5000, // optional, in ms
  ctaText: 'Learn More', // optional
  ctaLink: 'https://example.com' // optional
}
```

### Navigation

```typescript
// Redirect
{
  actionType: 'redirect',
  url: 'https://example.com/page',
  delay: 0, // ms
  openInNewTab: false,
  passUtmParameters: true
}
```

---

## Multi-Strategy Targeting Example

```typescript
// In your React component
const elementConfig = {
  selector: '.cta-button',
  selectorStrategies: [
    {
      selector: '#signup-btn',
      type: 'id',
      reliability: 95,
      description: 'Unique ID selector',
      isUnique: true
    },
    {
      selector: '[data-testid="signup"]',
      type: 'attribute',
      reliability: 90,
      description: 'Data attribute selector',
      isUnique: true
    },
    {
      selector: '.cta-button.primary',
      type: 'class',
      reliability: 75,
      description: 'Class combination',
      isUnique: false
    },
    {
      selector: 'header .hero .cta-button:nth-of-type(1)',
      type: 'nth-of-type',
      reliability: 80,
      description: 'Position-based selector',
      isUnique: true
    }
  ],
  originalText: 'Sign Up', // For text-based disambiguation
  position: 0 // For positional disambiguation if needed
};
```

---

## React Hook Form + Zod Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const actionSchema = z.object({
  selector: z.string().min(1, 'Selector is required'),
  newText: z.string().min(1, 'Text is required'),
  animation: z.enum(['none', 'fade', 'slide', 'scale'])
});

type ActionForm = z.infer<typeof actionSchema>;

// Use in component
const { register, handleSubmit, formState: { errors } } = useForm<ActionForm>({
  resolver: zodResolver(actionSchema),
  defaultValues: node.config
});

const onSubmit = (data: ActionForm) => {
  onNodeUpdate({ ...node, config: data });
};
```

---

## TanStack Query Hooks Pattern

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch workflows
const { data: workflows, isLoading } = useQuery({
  queryKey: ['workflows'],
  queryFn: () => workflowService.getWorkflows(),
  staleTime: 30000
});

// Save workflow
const saveWorkflow = useMutation({
  mutationFn: (workflow: Workflow) => workflowService.saveWorkflow(workflow),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
  }
});

// Usage
await saveWorkflow.mutateAsync(updatedWorkflow);
```

---

## Element Resolution Flow

```
1. Try Highest Reliability Strategy (ID, Data Attr)
   ↓
2. Found 1 element? ✓ Return it
   ↓
3. Found 0 elements? → Try next strategy
   ↓
4. Found multiple? → Disambiguate
   ├─ Match original text content
   ├─ Match exact text content
   ├─ Use position index
   ├─ Match attributes
   └─ First visible element
   ↓
5. Return element or fail gracefully
```

---

## Common Patterns

### Pattern 1: Click Trigger → Text Replacement

```typescript
// Workflow setup
const workflow = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      name: 'Element Click',
      config: {
        triggerType: 'element-click',
        selector: '.learn-more-btn'
      }
    },
    {
      id: 'action-1',
      type: 'action',
      name: 'Replace Text',
      config: {
        actionType: 'replace-text',
        selector: '.hero-headline',
        newText: 'Welcome Back!',
        animation: 'fade'
      }
    }
  ],
  connections: [
    {
      id: 'conn-1',
      sourceNodeId: 'trigger-1',
      targetNodeId: 'action-1'
    }
  ]
};
```

### Pattern 2: High-Intent Journey → Overlay

```typescript
const workflow = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      name: 'User Journey',
      config: {
        triggerType: 'user-journey',
        pages: ['/pricing', '/features', '/about'],
        order: 'any',
        minIntentScore: 0.7
      }
    },
    {
      id: 'action-1',
      type: 'action',
      name: 'Display Overlay',
      config: {
        actionType: 'display-overlay',
        type: 'modal',
        content: '<h2>Ready to get started?</h2><p>Book a demo now!</p>',
        showCloseButton: true,
        ctaText: 'Book Demo',
        ctaLink: '/demo'
      }
    }
  ]
};
```

### Pattern 3: UTM Source → Style Change

```typescript
const workflow = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      name: 'UTM Parameters',
      config: {
        triggerType: 'utm-parameters',
        parameter: 'utm_source',
        operator: 'equals',
        value: 'facebook'
      }
    },
    {
      id: 'action-1',
      type: 'action',
      name: 'Change Style',
      config: {
        actionType: 'change-style',
        selector: '.hero',
        styleProperty: 'backgroundColor',
        styleValue: '#1877f2' // Facebook blue
      }
    }
  ]
};
```

---

## Testing Selectors in Browser Console

```javascript
// Test if selector exists
document.querySelector('.my-selector'); // Returns first element or null

// Count matches
document.querySelectorAll('.my-selector').length; // Returns count

// Test targeting strategies
const strategies = [
  '#my-id',
  '[data-testid="my-element"]',
  '.my-class'
];

strategies.forEach(sel => {
  const matches = document.querySelectorAll(sel).length;
  console.log(`${sel}: ${matches} matches`);
});

// Test journey tracker
window.journeyTracker.getAnalytics();

// Test workflow system
window.unifiedWorkflowSystem.getActiveWorkflows();
```

---

## Debugging Tips

### Check Element Targeting

```javascript
// Enable debug mode
window.TRACKFLOW_DEBUG = true;

// Check targeting result
const result = window.unifiedWorkflowSystem.targetElementWithStrategies(
  { selector: '.my-element', selectorStrategies: [...] },
  {},
  'Replace Text'
);
console.log('Targeting result:', result);
```

### Monitor Workflow Execution

```javascript
// Listen for workflow events
window.addEventListener('trackflow:workflow:triggered', (e) => {
  console.log('Workflow triggered:', e.detail);
});

window.addEventListener('trackflow:action:executed', (e) => {
  console.log('Action executed:', e.detail);
});
```

### Check Journey Data

```javascript
// View current journey
const analytics = window.journeyTracker.getAnalytics();
console.log('Intent Score:', analytics.intentScore);
console.log('Pages Visited:', analytics.pagePaths);
console.log('Intent Level:', analytics.intentLevel);
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Element not found" | Invalid selector | Use SelectorBuilder to test, add fallback strategies |
| "Multiple elements match" | Non-unique selector | Add more specific class, use data attributes, or add disambiguation context |
| "Trigger not firing" | Condition not met | Check event tracking, verify trigger config, enable debug mode |
| "Action not executing" | Element not ready | Add delay, use mutation observer, check page load timing |
| "Workflow not active" | Status is draft/paused | Change workflow status to "active" |

---

## Best Practices Checklist

- ✅ Use ID or data attributes for most reliable targeting
- ✅ Provide 3+ targeting strategies per element
- ✅ Include original text for text-based disambiguation
- ✅ Test selectors in browser console before deploying
- ✅ Use TypeScript for type safety
- ✅ Validate form data with Zod schemas
- ✅ Handle errors gracefully with try-catch
- ✅ Use TanStack Query for server state
- ✅ Enable debug mode during development
- ✅ Track execution metrics for monitoring

---

## Performance Optimization

```typescript
// Debounce frequent events
import { debounce } from 'lodash';

const handleScroll = debounce(() => {
  trackEvent({ type: 'scroll_depth', depth: getScrollDepth() });
}, 200);

// Throttle scroll tracking
import { throttle } from 'lodash';

const handleScroll = throttle(() => {
  trackEvent({ type: 'scroll' });
}, 500);

// Memoize expensive computations
import { useMemo } from 'react';

const strategies = useMemo(() => 
  generateTargetingStrategies(element),
  [element.selector, element.id]
);
```

---

**Pro Tip**: Always test your workflows on a staging environment before deploying to production!



