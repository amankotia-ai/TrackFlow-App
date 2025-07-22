# Element-Based Event Tracking - Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Element Selection Strategies](#element-selection-strategies)
3. [Event Types and Tracking](#event-types-and-tracking)
4. [Technical Architecture](#technical-architecture)
5. [Integration with Workflows](#integration-with-workflows)
6. [Performance Optimization](#performance-optimization)
7. [Use Cases and Examples](#use-cases-and-examples)
8. [Implementation Guidelines](#implementation-guidelines)

## Overview

Element-based event tracking enables the workflow builder to monitor user interactions with specific HTML elements and trigger workflows based on these interactions. This capability provides granular control over user experience personalization and conversion optimization.

### Key Benefits
- **Granular Tracking**: Monitor specific elements rather than entire pages
- **Real-time Triggers**: Trigger workflows based on user interactions
- **Behavioral Insights**: Understand how users interact with specific elements
- **Conversion Optimization**: Optimize elements based on interaction data
- **A/B Testing**: Track performance of different element variations

## Element Selection Strategies

### 1. CSS Selector-Based Selection
```typescript
interface ElementSelector {
  type: 'css-selector';
  selector: string;
  description: string;
}

// Examples
const selectors = {
  allCTAs: '.cta-button, .btn-primary, [data-cta]',
  formInputs: 'input[type="text"], input[type="email"], textarea',
  navigationItems: '.nav-link, .menu-item',
  pricingElements: '.pricing-card, .price-display',
  socialProof: '.testimonial, .review, .rating'
};
```

### 2. Data Attribute-Based Selection
```typescript
interface DataAttributeSelector {
  type: 'data-attribute';
  attribute: string;
  value?: string;
  operator: 'equals' | 'contains' | 'starts-with' | 'exists';
}

// Examples
const dataSelectors = {
  trackableButtons: { attribute: 'data-track', operator: 'exists' },
  conversionElements: { attribute: 'data-conversion', value: 'true', operator: 'equals' },
  abTestVariants: { attribute: 'data-test-variant', operator: 'contains' }
};
```

### 3. XPath-Based Selection
```typescript
interface XPathSelector {
  type: 'xpath';
  expression: string;
  description: string;
}

// Examples
const xpathSelectors = {
  formFields: '//form//input[@type="text"]',
  clickableElements: '//*[@onclick or @role="button"]',
  dynamicContent: '//div[contains(@class, "dynamic-content")]'
};
```

### 4. Dynamic Element Detection
```typescript
interface DynamicElementConfig {
  parentSelector: string;
  childSelector: string;
  eventTypes: string[];
  autoTrack: boolean;
}

// Example: Track dynamically added CTAs
const dynamicConfig = {
  parentSelector: '#content-area',
  childSelector: '.cta-button',
  eventTypes: ['click', 'hover'],
  autoTrack: true
};
```

## Event Types and Tracking

### 1. Mouse Events
```typescript
interface MouseEventTracking {
  eventType: 'click' | 'hover' | 'mouseenter' | 'mouseleave' | 'mousedown' | 'mouseup';
  trackingData: {
    elementId: string;
    elementText: string;
    elementClasses: string[];
    clickCoordinates?: { x: number; y: number };
    hoverDuration?: number;
  };
}

// Implementation
const trackMouseEvents = (selector: string, events: string[]) => {
  const elements = document.querySelectorAll(selector);
  events.forEach(eventType => {
    elements.forEach(element => {
      element.addEventListener(eventType, (e) => {
        trackEvent({
          type: eventType,
          element: element,
          data: extractElementData(element, e)
        });
      });
    });
  });
};
```

### 2. Form Events
```typescript
interface FormEventTracking {
  eventType: 'submit' | 'input' | 'change' | 'focus' | 'blur' | 'validation';
  trackingData: {
    formId: string;
    fieldName: string;
    fieldType: string;
    fieldValue?: string;
    validationErrors?: string[];
    completionTime?: number;
  };
}

// Implementation
const trackFormEvents = (formSelector: string) => {
  const forms = document.querySelectorAll(formSelector);
  forms.forEach(form => {
    // Track form submission
    form.addEventListener('submit', (e) => {
      trackFormSubmission(form, e);
    });
    
    // Track field interactions
    const fields = form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      field.addEventListener('input', (e) => {
        trackFieldInteraction(field, 'input', e);
      });
      
      field.addEventListener('blur', (e) => {
        trackFieldInteraction(field, 'blur', e);
      });
    });
  });
};
```

### 3. Keyboard Events
```typescript
interface KeyboardEventTracking {
  eventType: 'keydown' | 'keyup' | 'keypress';
  trackingData: {
    elementId: string;
    keyCode: number;
    keyValue: string;
    modifierKeys: string[];
    inputValue?: string;
  };
}

// Implementation
const trackKeyboardEvents = (selector: string) => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    element.addEventListener('keydown', (e) => {
      trackKeyboardEvent(element, 'keydown', e);
    });
  });
};
```

### 4. Scroll and Visibility Events
```typescript
interface ScrollEventTracking {
  eventType: 'scroll' | 'intersection' | 'visibility';
  trackingData: {
    elementId: string;
    scrollDepth: number;
    visibilityPercentage: number;
    timeInView: number;
    scrollDirection: 'up' | 'down';
  };
}

// Implementation using Intersection Observer
const trackElementVisibility = (selector: string) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        trackVisibilityEvent(entry.target, entry.intersectionRatio);
      }
    });
  });
  
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => observer.observe(element));
};
```

## Technical Architecture

### 1. Event Tracking Service
```typescript
interface EventTrackingService {
  // Core tracking methods
  trackElement(selector: string, events: string[], config?: TrackingConfig): void;
  untrackElement(selector: string): void;
  pauseTracking(): void;
  resumeTracking(): void;
  
  // Data collection
  getEventData(elementId: string, timeRange?: TimeRange): EventData[];
  getElementAnalytics(selector: string): ElementAnalytics;
  
  // Real-time processing
  onEvent(callback: (event: TrackedEvent) => void): void;
  onThresholdReached(callback: (threshold: EventThreshold) => void): void;
}

class ElementEventTracker implements EventTrackingService {
  private eventListeners: Map<string, EventListener[]> = new Map();
  private trackedElements: Set<string> = new Set();
  private eventQueue: TrackedEvent[] = [];
  private observers: Map<string, IntersectionObserver> = new Map();
  
  trackElement(selector: string, events: string[], config?: TrackingConfig) {
    const elements = document.querySelectorAll(selector);
    const listeners: EventListener[] = [];
    
    elements.forEach(element => {
      events.forEach(eventType => {
        const listener = this.createEventListener(element, eventType, config);
        element.addEventListener(eventType, listener);
        listeners.push(listener);
      });
    });
    
    this.eventListeners.set(selector, listeners);
    this.trackedElements.add(selector);
  }
  
  private createEventListener(element: Element, eventType: string, config?: TrackingConfig) {
    return (event: Event) => {
      const trackedEvent: TrackedEvent = {
        timestamp: Date.now(),
        elementId: element.id || this.generateElementId(element),
        elementSelector: this.getElementSelector(element),
        eventType,
        eventData: this.extractEventData(event, element),
        pageContext: this.getPageContext(),
        userContext: this.getUserContext()
      };
      
      this.processEvent(trackedEvent);
    };
  }
}
```

### 2. Event Data Management
```typescript
interface TrackedEvent {
  timestamp: number;
  elementId: string;
  elementSelector: string;
  eventType: string;
  eventData: any;
  pageContext: PageContext;
  userContext: UserContext;
}

interface EventThreshold {
  selector: string;
  eventType: string;
  count: number;
  timeWindow: number;
  condition: 'greater-than' | 'less-than' | 'equals';
}

class EventDataManager {
  private events: TrackedEvent[] = [];
  private thresholds: EventThreshold[] = [];
  
  addEvent(event: TrackedEvent) {
    this.events.push(event);
    this.checkThresholds(event);
    this.cleanupOldEvents();
  }
  
  private checkThresholds(event: TrackedEvent) {
    this.thresholds.forEach(threshold => {
      if (this.matchesThreshold(event, threshold)) {
        const recentEvents = this.getRecentEvents(threshold.selector, threshold.eventType, threshold.timeWindow);
        
        if (this.thresholdConditionMet(recentEvents.length, threshold)) {
          this.triggerThresholdReached(threshold, recentEvents);
        }
      }
    });
  }
  
  private thresholdConditionMet(count: number, threshold: EventThreshold): boolean {
    switch (threshold.condition) {
      case 'greater-than': return count > threshold.count;
      case 'less-than': return count < threshold.count;
      case 'equals': return count === threshold.count;
      default: return false;
    }
  }
}
```

### 3. Dynamic Element Tracking
```typescript
class DynamicElementTracker {
  private mutationObserver: MutationObserver;
  private trackedSelectors: Set<string> = new Set();
  
  constructor() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkNewElement(node as Element);
          }
        });
      });
    });
  }
  
  startTracking() {
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  private checkNewElement(element: Element) {
    this.trackedSelectors.forEach(selector => {
      if (element.matches(selector)) {
        this.trackElement(element, selector);
      }
      
      const matchingChildren = element.querySelectorAll(selector);
      matchingChildren.forEach(child => {
        this.trackElement(child, selector);
      });
    });
  }
  
  addSelector(selector: string) {
    this.trackedSelectors.add(selector);
    
    // Track existing elements
    const existingElements = document.querySelectorAll(selector);
    existingElements.forEach(element => {
      this.trackElement(element, selector);
    });
  }
}
```

## Integration with Workflows

### 1. Element-Based Trigger Nodes
```typescript
interface ElementEventTrigger extends WorkflowNode {
  type: 'trigger';
  category: 'Element Events';
  config: {
    elementSelector: string;
    eventType: string;
    threshold?: EventThreshold;
    conditions?: ElementEventCondition[];
  };
}

// Example trigger configurations
const elementTriggers = {
  ctaClickTrigger: {
    elementSelector: '.cta-button',
    eventType: 'click',
    threshold: { count: 1, timeWindow: 60000 }
  },
  
  formSubmissionTrigger: {
    elementSelector: 'form',
    eventType: 'submit',
    conditions: [
      { field: 'completionTime', operator: 'less-than', value: 300000 }
    ]
  },
  
  scrollDepthTrigger: {
    elementSelector: '.content-section',
    eventType: 'intersection',
    threshold: { count: 1, timeWindow: 300000 }
  }
};
```

### 2. Event-Driven Action Nodes
```typescript
interface EventDrivenAction extends WorkflowNode {
  type: 'action';
  category: 'Event-Driven';
  config: {
    triggerEvent: string;
    actionType: 'show-element' | 'hide-element' | 'modify-content' | 'track-analytics';
    targetElement?: string;
    actionData?: any;
  };
}

// Example action configurations
const eventDrivenActions = {
  showThankYouMessage: {
    triggerEvent: 'form-submission-success',
    actionType: 'show-element',
    targetElement: '#thank-you-message'
  },
  
  trackConversion: {
    triggerEvent: 'cta-click',
    actionType: 'track-analytics',
    actionData: {
      eventName: 'conversion_attempt',
      eventCategory: 'engagement'
    }
  },
  
  updateProgressBar: {
    triggerEvent: 'form-field-complete',
    actionType: 'modify-content',
    targetElement: '#progress-bar',
    actionData: {
      updateType: 'increment',
      value: 25
    }
  }
};
```

### 3. Workflow Integration Example
```typescript
const elementTrackingWorkflow = {
  id: 'smart-form-tracking',
  name: 'Smart Form Tracking and Optimization',
  nodes: [
    {
      id: 'form-interaction-trigger',
      type: 'trigger',
      category: 'Element Events',
      name: 'Form Field Interaction',
      config: {
        elementSelector: 'input[type="email"], input[type="text"]',
        eventType: 'focus',
        threshold: { count: 1, timeWindow: 300000 }
      }
    },
    {
      id: 'progressive-form-action',
      type: 'action',
      category: 'Event-Driven',
      name: 'Show Progressive Form',
      config: {
        triggerEvent: 'form-field-focus',
        actionType: 'show-element',
        targetElement: '#progressive-form-fields'
      }
    },
    {
      id: 'form-submission-trigger',
      type: 'trigger',
      category: 'Element Events',
      name: 'Form Submission',
      config: {
        elementSelector: 'form',
        eventType: 'submit',
        conditions: [
          { field: 'completionTime', operator: 'less-than', value: 300000 }
        ]
      }
    },
    {
      id: 'success-message-action',
      type: 'action',
      category: 'Event-Driven',
      name: 'Show Success Message',
      config: {
        triggerEvent: 'form-submission-success',
        actionType: 'show-element',
        targetElement: '#success-message'
      }
    }
  ]
};
```

## Performance Optimization

### 1. Event Delegation
```typescript
class OptimizedEventTracker {
  private delegatedEvents: Map<string, EventListener> = new Map();
  
  trackWithDelegation(containerSelector: string, targetSelector: string, eventType: string) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const listener = (event: Event) => {
      const target = event.target as Element;
      if (target.matches(targetSelector)) {
        this.processEvent({
          element: target,
          eventType,
          event
        });
      }
    };
    
    container.addEventListener(eventType, listener);
    this.delegatedEvents.set(`${containerSelector}-${eventType}`, listener);
  }
}
```

### 2. Throttling and Debouncing
```typescript
class ThrottledEventTracker {
  private throttledEvents: Map<string, number> = new Map();
  
  trackWithThrottling(selector: string, eventType: string, throttleMs: number = 100) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.addEventListener(eventType, (event) => {
        const key = `${element.id}-${eventType}`;
        const now = Date.now();
        const lastEvent = this.throttledEvents.get(key) || 0;
        
        if (now - lastEvent >= throttleMs) {
          this.throttledEvents.set(key, now);
          this.processEvent({ element, eventType, event });
        }
      });
    });
  }
}
```

### 3. Batch Processing
```typescript
class BatchEventProcessor {
  private eventQueue: TrackedEvent[] = [];
  private batchSize: number = 10;
  private batchTimeout: number = 1000;
  private processingTimer?: number;
  
  addEvent(event: TrackedEvent) {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.processBatch();
    } else if (!this.processingTimer) {
      this.processingTimer = window.setTimeout(() => {
        this.processBatch();
      }, this.batchTimeout);
    }
  }
  
  private processBatch() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = undefined;
    }
    
    const batch = this.eventQueue.splice(0, this.batchSize);
    this.sendBatchToAnalytics(batch);
  }
}
```

## Use Cases and Examples

### 1. Conversion Tracking
```typescript
// Track all CTA button clicks
const conversionTracking = {
  selectors: ['.cta-button', '.btn-primary', '[data-conversion]'],
  events: ['click'],
  analytics: {
    eventName: 'conversion_attempt',
    eventCategory: 'engagement',
    customDimensions: {
      buttonText: (element) => element.textContent,
      buttonLocation: (element) => getElementLocation(element)
    }
  }
};
```

### 2. Form Analytics
```typescript
// Track form interactions and completion
const formAnalytics = {
  selectors: ['form'],
  events: ['submit', 'input', 'focus', 'blur'],
  tracking: {
    fieldCompletion: true,
    formAbandonment: true,
    completionTime: true,
    validationErrors: true
  }
};
```

### 3. Content Engagement
```typescript
// Track content section visibility and interaction
const contentEngagement = {
  selectors: ['.content-section', '.article', '.product-card'],
  events: ['intersection', 'click', 'hover'],
  metrics: {
    timeInView: true,
    scrollDepth: true,
    interactionRate: true
  }
};
```

### 4. Navigation Tracking
```typescript
// Track navigation menu interactions
const navigationTracking = {
  selectors: ['.nav-link', '.menu-item', '.breadcrumb'],
  events: ['click', 'hover'],
  analytics: {
    userJourney: true,
    navigationPatterns: true,
    dropOffPoints: true
  }
};
```

### 5. Error Monitoring
```typescript
// Track form errors and broken links
const errorTracking = {
  selectors: ['form', 'a[href]'],
  events: ['submit', 'click'],
  errorDetection: {
    formValidation: true,
    brokenLinks: true,
    networkErrors: true
  }
};
```

## Implementation Guidelines

## 🚀 IMPLEMENTATION PROGRESS

### ✅ COMPLETED - Phase 1A: Core Tracking Infrastructure (Day 1)
**Status: COMPLETED** ✅
- ✅ **Element Tracking JavaScript Library** (`src/utils/elementTracker.js`)
  - Complete client-side tracking system with batching and throttling
  - Automatic tracking of clicks, form interactions, element visibility
  - Real-time event processing with session management
  - Dynamic element detection using MutationObserver
  - Performance optimized with event delegation and batch processing

- ✅ **Server-Side Analytics Endpoints** (`server.js`)
  - `/api/analytics/track` - Receives and processes tracking events
  - `/api/workflows/trigger-check` - Evaluates workflow triggers 
  - Mock workflow trigger evaluation system
  - Batch event processing with detailed console logging

- ✅ **Integration Code Generator** (`src/utils/integrationCodeGenerator.ts`)
  - Automatic generation of HTML head and body code snippets
  - Workflow-specific trigger configuration
  - Test page generation for integration testing
  - Complete implementation instructions

- ✅ **Integration Modal UI** (`src/components/IntegrationModal.tsx`)
  - Professional code snippet display with syntax highlighting
  - Copy-to-clipboard functionality with visual feedback
  - Step-by-step implementation instructions
  - Test page download functionality
  - Integrated into WorkflowBuilder with context-aware display

- ✅ **Element-Based Trigger Nodes** (`src/data/nodeTemplates.ts`)
  - Element Click Trigger - Track specific element clicks
  - Form Interaction Trigger - Monitor form field interactions
  - Element Visibility Trigger - Track when elements enter viewport
  - Element Hover Trigger - Monitor hover/touch interactions
  - All with configurable CSS selectors and thresholds

- ✅ **Enhanced Server-Side Trigger Evaluation** (`server.js`)
  - Comprehensive trigger matching for all element-based events
  - Detailed logging for debugging and monitoring
  - Support for multiple action types with animation options
  - Playbook-specific trigger evaluation

- ✅ **Enhanced Client-Side Action Execution** (`integrationCodeGenerator.ts`)
  - Multiple element targeting with `querySelectorAll`
  - Advanced animations (fade, slide, bounce)
  - New action types: `add_class`, `remove_class`, `modify_style`, `track_event`
  - Comprehensive logging with trigger attribution

- ✅ **Demo Workflow Created** (`workflowTemplates.ts`)
  - "Element Tracking Demo" - Comprehensive showcase workflow
  - 4 different element-based triggers with corresponding actions
  - Demonstrates CTA clicks, form interactions, visibility tracking, hover events
  - Ready for end-to-end testing

- ✅ **External Testing Infrastructure** (Ngrok Integration)
  - Enhanced server with static script serving at `/tracking-script.js`
  - Comprehensive CORS configuration for external domains
  - NgrokConfigModal component for easy setup guidance
  - Integration with IntegrationModal for seamless URL management
  - Dynamic code generation supporting both local and ngrok URLs
  - Complete Webflow/external site testing capability
  - **FIXED**: Express version compatibility issue resolved (downgraded to 4.19.2)

### Phase 1: Basic Element Tracking (Week 1)
1. **Set up Event Tracking Service**
   - Implement basic event listener management
   - Create element selection utilities
   - Build event data collection system

2. **Create Element-Based Triggers**
   - Implement CSS selector-based triggers
   - Add basic event types (click, hover, submit)
   - Create threshold-based triggering

3. **Basic Integration**
   - Connect element tracking to workflow system
   - Implement simple event-driven actions
   - Add basic analytics integration

### Phase 2: Advanced Features (Week 2)
1. **Dynamic Element Tracking**
   - Implement MutationObserver for dynamic content
   - Add automatic element detection
   - Create element lifecycle management

2. **Performance Optimization**
   - Implement event delegation
   - Add throttling and debouncing
   - Create batch processing system

3. **Advanced Event Types**
   - Add scroll and visibility tracking
   - Implement keyboard event tracking
   - Create custom business events

### Phase 3: Analytics and Optimization (Week 3)
1. **Analytics Integration**
   - Connect to Google Analytics
   - Implement custom event tracking
   - Create analytics dashboards

2. **A/B Testing Integration**
   - Track element performance
   - Implement automatic optimization
   - Create performance reports

3. **Advanced Use Cases**
   - Implement conversion tracking
   - Add form analytics
   - Create engagement measurement

### Implementation Checklist
- [ ] Set up event tracking service
- [ ] Implement element selection strategies
- [ ] Create event data management system
- [ ] Build dynamic element tracking
- [ ] Add performance optimizations
- [ ] Integrate with workflow system
- [ ] Connect to analytics platforms
- [ ] Create monitoring and debugging tools
- [ ] Add documentation and examples
- [ ] Implement testing framework

## Conclusion

Element-based event tracking provides powerful capabilities for understanding user behavior and creating highly personalized experiences. By implementing this system, the workflow builder can:

1. **Track granular user interactions** with specific elements
2. **Trigger workflows based on element events** in real-time
3. **Optimize user experience** based on interaction data
4. **Improve conversion rates** through targeted interventions
5. **Gain deep insights** into user behavior patterns

The key to success is implementing a robust, performant system that can handle dynamic content while providing rich data for workflow optimization. 