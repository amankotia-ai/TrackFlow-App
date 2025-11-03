# 🎯 React/TypeScript Workflow Targeting Implementation Guide

## Overview

This guide explains how TrackFlow implements **class operations**, **trigger nodes**, and **element targeting** for website automation using your modern React + TypeScript tech stack.

---

## Architecture Overview

### Tech Stack Integration

```
React 18 + TypeScript (UI Layer)
    ↓
TanStack Query (Data Management)
    ↓
Supabase (Database)
    ↓
Unified Workflow System (Client Runtime - Vanilla JS)
    ↓
Target Website DOM
```

**Key Insight**: The workflow **builder** is React/TypeScript, but the **executor** that runs on client websites is vanilla JavaScript for universal compatibility.

---

## 🏗️ System Components

### 1. **React/TypeScript UI Layer** (`src/components/`)

The workflow builder interface where users create and configure workflows.

#### Key Components:

```typescript
// Main workflow builder
WorkflowBuilder.tsx          // Canvas-based workflow editor
WorkflowNode.tsx             // Visual node representation
NodeConfigPanel.tsx          // Node configuration sidebar
NodeLibrary.tsx              // Available node templates

// Supporting components
ScrapingResults.tsx          // Shows scraped elements from target site
EnvironmentComponents.tsx    // Reusable component library
IntegrationModal.tsx         // Code generation for embedding
```

#### Data Flow:

```typescript
// 1. User selects element from scraped results
const scrapingResult = await scrapeUrl(targetUrl);

// 2. Element data includes multiple targeting strategies
interface ScrapedElement {
  selector: string;                    // Primary CSS selector
  selectorStrategies: TargetingStrategy[];  // Fallback strategies
  textContent: string;
  attributes: Record<string, string>;
  position: { x: number; y: number };
  xpath: string;
  uniqueId?: string;
}

// 3. User configures action with selected element
const actionNode: WorkflowNode = {
  id: 'action-1',
  type: 'action',
  name: 'Replace Text',
  category: 'Content Modification',
  config: {
    selector: '.hero-headline',          // User-facing selector
    selectorStrategies: [...],           // Internal targeting strategies
    newText: 'Welcome!',
    originalText: 'Old Headline',
    animation: 'fade'
  },
  inputs: ['input'],
  outputs: ['output']
};
```

---

### 2. **Type Definitions** (`src/types/workflow.ts`)

```typescript
// Core workflow types
export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  category: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  config: Record<string, any>;    // Node-specific configuration
  inputs: string[];
  outputs: string[];
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  targetUrl: string;              // Target website URL
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 3. **Element Targeting System** (`src/utils/elementTargeting.ts`)

TrackFlow uses an **intelligent multi-strategy targeting system** to ensure reliable element selection even when DOM structure changes.

#### Targeting Strategy Hierarchy:

```typescript
export interface TargetingStrategy {
  selector: string;              // CSS selector
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type' | 'unique-path' | 'context';
  reliability: number;           // 0-100, higher = more reliable
  description: string;
  isUnique: boolean;
}

// Example targeting strategies for a button:
const buttonStrategies: TargetingStrategy[] = [
  {
    selector: '#signup-button',
    type: 'id',
    reliability: 95,
    description: 'Unique ID selector',
    isUnique: true
  },
  {
    selector: '[data-testid="signup-btn"]',
    type: 'attribute',
    reliability: 90,
    description: 'Data attribute selector',
    isUnique: true
  },
  {
    selector: '.cta-button.primary',
    type: 'class',
    reliability: 70,
    description: 'Class combination selector',
    isUnique: false
  },
  {
    selector: 'header > .hero > .cta-button:nth-of-type(1)',
    type: 'nth-of-type',
    reliability: 80,
    description: 'Position-based selector',
    isUnique: true
  }
];
```

#### Element Resolution Process:

```typescript
// Main targeting function
export function resolveElement(
  strategies: TargetingStrategy[],
  context: TargetingContext = {},
  actionType: string = 'unknown'
): TargetingResult {
  // 1. Try each strategy in order of reliability (highest first)
  for (const strategy of strategies) {
    const elements = document.querySelectorAll(strategy.selector);
    
    if (elements.length === 1) {
      // Perfect match - unique element found
      return {
        success: true,
        element: elements[0],
        strategy,
        message: `Found unique element using ${strategy.description}`
      };
    }
    
    if (elements.length > 1) {
      // Multiple matches - use disambiguation
      const disambiguated = disambiguateElements(
        Array.from(elements),
        context,
        actionType
      );
      
      if (disambiguated.success) {
        return {
          success: true,
          element: disambiguated.element,
          strategy,
          message: `Found element using ${strategy.description} + ${disambiguated.method}`
        };
      }
    }
  }
  
  // No strategy worked
  return {
    success: false,
    element: null,
    message: 'No targeting strategy could resolve element'
  };
}
```

#### Disambiguation Strategies:

```typescript
// When multiple elements match, use context to disambiguate
function disambiguateElements(
  elements: Element[],
  context: TargetingContext,
  actionType: string
): { success: boolean; element: Element | null; method: string } {
  
  // 1. Text content matching (for text replacement actions)
  if (context.originalText && actionType.includes('text')) {
    for (const element of elements) {
      if (element.textContent?.includes(context.originalText)) {
        return {
          success: true,
          element,
          method: 'original text matching'
        };
      }
    }
  }
  
  // 2. Exact text content matching
  if (context.textContent) {
    for (const element of elements) {
      if (element.textContent?.trim() === context.textContent.trim()) {
        return {
          success: true,
          element,
          method: 'exact text content'
        };
      }
    }
  }
  
  // 3. Position-based selection (nth-child)
  if (context.position !== undefined) {
    return {
      success: true,
      element: elements[context.position],
      method: `position ${context.position}`
    };
  }
  
  // 4. Attribute matching
  if (context.attributes) {
    for (const element of elements) {
      const matches = Object.entries(context.attributes).every(
        ([attr, value]) => element.getAttribute(attr) === value
      );
      if (matches) {
        return {
          success: true,
          element,
          method: 'attribute matching'
        };
      }
    }
  }
  
  // 5. First visible element (fallback)
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        success: true,
        element,
        method: 'first visible element'
      };
    }
  }
  
  return { success: false, element: null, method: 'none' };
}
```

---

## 🎯 Implementing Trigger Nodes

### Available Trigger Types

Triggers are events that **start** a workflow. Here's how they're implemented:

#### 1. **Visitor Behavior Triggers**

```typescript
// Page Visits Trigger
{
  id: 'page-visit-trigger',
  type: 'trigger',
  category: 'Visitor Behavior',
  name: 'Page Visits',
  config: {
    visitCount: 3,
    timeframe: 'session'
  }
}

// Implementation in unifiedWorkflowSystem.js:
evaluatePageVisitsTrigger(trigger, eventData) {
  const visitCount = this.getVisitCount();
  const threshold = trigger.config.visitCount || 1;
  return visitCount >= threshold;
}
```

#### 2. **Element Interaction Triggers**

```typescript
// Element Click Trigger
{
  id: 'element-click-trigger',
  type: 'trigger',
  category: 'User Interaction',
  name: 'Element Click',
  config: {
    selector: '.cta-button',
    selectorStrategies: [...],
    requireText: false,
    textContent: ''
  }
}

// Implementation:
evaluateElementClickTrigger(trigger, eventData) {
  if (eventData.type !== 'element_click') return false;
  
  // Use enhanced targeting to resolve element
  const result = this.targetElementWithStrategies(
    trigger.config,
    trigger.config,
    'Element Click'
  );
  
  if (!result.success) return false;
  
  // Check if clicked element matches
  return eventData.target === result.element;
}
```

#### 3. **Journey-Based Triggers**

```typescript
// User Journey Trigger
{
  id: 'user-journey-trigger',
  type: 'trigger',
  category: 'Visitor Behavior',
  name: 'User Journey',
  config: {
    pages: ['/home', '/pricing', '/signup'],
    order: 'any',  // or 'sequence'
    minIntentScore: 0.7
  }
}

// Implementation using Journey Tracker:
evaluateUserJourneyTrigger(trigger, eventData) {
  const journey = window.journeyTracker.getAnalytics();
  
  // Check page pattern matching
  const pagesMatch = this.matchJourneyPattern(
    trigger.config.pages,
    journey.pagePaths,
    trigger.config.order
  );
  
  // Check intent score threshold
  const intentMatch = journey.intentScore >= (trigger.config.minIntentScore || 0);
  
  return pagesMatch && intentMatch;
}
```

---

## 🔧 Implementing Action Nodes

Actions are operations performed **after** a trigger fires.

### 1. **Content Modification Actions**

#### Replace Text Action

```typescript
// React Component Configuration (NodeConfigPanel.tsx)
interface ReplaceTextConfig {
  selector: string;
  selectorStrategies: TargetingStrategy[];
  newText: string;
  originalText?: string;
  animation?: 'none' | 'fade' | 'slide' | 'scale';
  preserveFormatting?: boolean;
}

// Execution (unifiedWorkflowSystem.js)
async executeReplaceTextAction(action) {
  const { selector, newText, originalText, animation } = action.config;
  
  // 1. Resolve target element using strategies
  const result = this.targetElementWithStrategies(
    action.config,
    action.config,
    'Replace Text'
  );
  
  if (!result.success) {
    console.error('❌ Could not find element:', selector);
    return { success: false, error: 'Element not found' };
  }
  
  const element = result.element;
  
  // 2. Store original text for context
  if (!originalText) {
    action.config.originalText = element.textContent;
  }
  
  // 3. Apply animation
  if (animation && animation !== 'none') {
    await this.animateTextChange(element, newText, animation);
  } else {
    element.textContent = newText;
  }
  
  // 4. Track operation in mutation observer map
  this.selectorRulesMap.set(selector, action.config);
  
  return { success: true, element };
}

// Animation helper
async animateTextChange(element, newText, animation) {
  switch (animation) {
    case 'fade':
      element.style.transition = 'opacity 0.3s ease-in-out';
      element.style.opacity = '0';
      await this.delay(300);
      element.textContent = newText;
      element.style.opacity = '1';
      break;
    case 'slide':
      element.style.transition = 'transform 0.3s ease-out';
      element.style.transform = 'translateX(-20px)';
      element.style.opacity = '0';
      await this.delay(300);
      element.textContent = newText;
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
      break;
    case 'scale':
      element.style.transition = 'transform 0.2s ease-in-out';
      element.style.transform = 'scale(0.95)';
      await this.delay(200);
      element.textContent = newText;
      element.style.transform = 'scale(1)';
      break;
  }
}
```

#### Change Style Action

```typescript
// React Configuration
interface ChangeStyleConfig {
  selector: string;
  selectorStrategies: TargetingStrategy[];
  styleProperty: string;
  styleValue: string;
  applyToAll?: boolean;
}

// Execution
async executeChangeStyleAction(action) {
  const { styleProperty, styleValue, applyToAll } = action.config;
  
  const result = this.targetElementWithStrategies(
    action.config,
    action.config,
    'Change Style'
  );
  
  if (!result.success) {
    return { success: false, error: 'Element not found' };
  }
  
  // Apply to single element or all matches
  const targets = applyToAll ? result.elements : [result.element];
  
  targets.forEach(element => {
    element.style[styleProperty] = styleValue;
  });
  
  return { success: true, affectedCount: targets.length };
}
```

### 2. **Display Actions**

#### Display Overlay Action

```typescript
interface DisplayOverlayConfig {
  type: 'modal' | 'banner' | 'corner-notification' | 'fullscreen';
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  backgroundColor?: string;
  textColor?: string;
  showCloseButton?: boolean;
  autoCloseDelay?: number;
  ctaButton?: {
    text: string;
    link: string;
    style: 'primary' | 'secondary';
  };
}

// Execution
async executeDisplayOverlayAction(action) {
  const config = action.config;
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = `tf-overlay-${action.id}`;
  overlay.style.cssText = this.getOverlayStyles(config);
  
  // Create content
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = config.content;
  overlay.appendChild(contentDiv);
  
  // Add close button if enabled
  if (config.showCloseButton) {
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = () => overlay.remove();
    closeBtn.style.cssText = this.getCloseButtonStyles();
    overlay.appendChild(closeBtn);
  }
  
  // Add CTA button if configured
  if (config.ctaButton) {
    const ctaBtn = document.createElement('a');
    ctaBtn.textContent = config.ctaButton.text;
    ctaBtn.href = config.ctaButton.link;
    ctaBtn.style.cssText = this.getCtaButtonStyles(config.ctaButton.style);
    overlay.appendChild(ctaBtn);
  }
  
  // Insert into DOM
  document.body.appendChild(overlay);
  
  // Auto-close if configured
  if (config.autoCloseDelay) {
    setTimeout(() => overlay.remove(), config.autoCloseDelay);
  }
  
  // Track overlay for cleanup
  this.activeOverlays.set(action.id, overlay);
  
  return { success: true, element: overlay };
}
```

### 3. **Redirect Actions**

```typescript
interface RedirectActionConfig {
  url: string;
  delay?: number;
  openInNewTab?: boolean;
  passUtmParameters?: boolean;
}

async executeRedirectAction(action) {
  const { url, delay, openInNewTab, passUtmParameters } = action.config;
  
  // Build final URL with UTM params if needed
  let finalUrl = url;
  if (passUtmParameters) {
    const currentParams = new URLSearchParams(window.location.search);
    const utmParams = new URLSearchParams();
    for (const [key, value] of currentParams) {
      if (key.startsWith('utm_')) {
        utmParams.append(key, value);
      }
    }
    if (utmParams.toString()) {
      finalUrl += (url.includes('?') ? '&' : '?') + utmParams.toString();
    }
  }
  
  // Apply delay if specified
  if (delay) {
    await this.delay(delay);
  }
  
  // Execute redirect
  if (openInNewTab) {
    window.open(finalUrl, '_blank');
  } else {
    window.location.href = finalUrl;
  }
  
  return { success: true, url: finalUrl };
}
```

---

## 🔗 Workflow Execution Flow

### 1. **Event Detection**

```javascript
// unifiedWorkflowSystem.js initialization
class UnifiedWorkflowSystem {
  setupEventTracking() {
    // Page load events
    this.trackEvent({ type: 'page_load' });
    
    // Scroll tracking
    window.addEventListener('scroll', () => {
      const scrollPercentage = this.calculateScrollPercentage();
      this.trackEvent({ 
        type: 'scroll_depth',
        depth: scrollPercentage
      });
    });
    
    // Click tracking
    document.addEventListener('click', (e) => {
      this.trackEvent({
        type: 'element_click',
        target: e.target,
        selector: this.generateSelector(e.target)
      });
    });
    
    // Form interactions
    document.addEventListener('focus', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        this.trackEvent({
          type: 'form_interaction',
          field: e.target.name || e.target.id
        });
      }
    }, true);
    
    // Exit intent
    document.addEventListener('mouseout', (e) => {
      if (e.clientY < 0) {
        this.trackEvent({ type: 'exit_intent' });
      }
    });
  }
}
```

### 2. **Trigger Evaluation**

```javascript
async processWorkflows(eventData) {
  // Load active workflows from server or cache
  const workflows = await this.getActiveWorkflows();
  
  for (const workflow of workflows) {
    // Find trigger nodes
    const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
    
    for (const trigger of triggerNodes) {
      // Evaluate if trigger condition is met
      if (this.evaluateTrigger(trigger, eventData)) {
        console.log(`✅ Workflow triggered: ${workflow.name}`);
        
        // Find connected actions
        const actions = this.getConnectedActions(workflow, trigger.id);
        
        // Execute actions
        await this.executeActions(actions);
        
        // Track execution
        this.trackExecution(workflow.id, trigger.id, actions);
      }
    }
  }
}

evaluateTrigger(trigger, eventData) {
  const triggerType = trigger.name || trigger.config.triggerType;
  
  switch (triggerType) {
    case 'Page Visits':
      return this.evaluatePageVisitsTrigger(trigger, eventData);
    case 'Time on Page':
      return this.evaluateTimeOnPageTrigger(trigger, eventData);
    case 'Scroll Depth':
      return this.evaluateScrollDepthTrigger(trigger, eventData);
    case 'Element Click':
      return this.evaluateElementClickTrigger(trigger, eventData);
    case 'Exit Intent':
      return eventData.type === 'exit_intent';
    case 'User Journey':
      return this.evaluateUserJourneyTrigger(trigger, eventData);
    case 'UTM Parameters':
      return this.evaluateUtmParametersTrigger(trigger, eventData);
    default:
      console.warn(`Unknown trigger type: ${triggerType}`);
      return false;
  }
}
```

### 3. **Action Execution**

```javascript
async executeActions(actions) {
  const results = [];
  
  for (const action of actions) {
    try {
      let result;
      
      switch (action.name) {
        case 'Replace Text':
          result = await this.executeReplaceTextAction(action);
          break;
        case 'Change Style':
          result = await this.executeChangeStyleAction(action);
          break;
        case 'Hide Element':
          result = await this.executeHideElementAction(action);
          break;
        case 'Show Element':
          result = await this.executeShowElementAction(action);
          break;
        case 'Add Class':
          result = await this.executeAddClassAction(action);
          break;
        case 'Display Overlay':
          result = await this.executeDisplayOverlayAction(action);
          break;
        case 'Redirect':
          result = await this.executeRedirectAction(action);
          break;
        default:
          console.warn(`Unknown action: ${action.name}`);
          result = { success: false, error: 'Unknown action' };
      }
      
      results.push({
        actionId: action.id,
        actionName: action.name,
        ...result
      });
    } catch (error) {
      console.error(`❌ Error executing action ${action.name}:`, error);
      results.push({
        actionId: action.id,
        actionName: action.name,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}
```

---

## 🎨 React Component Implementation Examples

### Building a Node Configuration Panel

```typescript
// NodeConfigPanel.tsx
import React, { useState } from 'react';
import { WorkflowNode } from '../types/workflow';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define validation schema
const replaceTextSchema = z.object({
  selector: z.string().min(1, 'Selector is required'),
  newText: z.string().min(1, 'New text is required'),
  originalText: z.string().optional(),
  animation: z.enum(['none', 'fade', 'slide', 'scale']).default('fade')
});

type ReplaceTextForm = z.infer<typeof replaceTextSchema>;

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onNodeUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
  scrapedElements: ScrapedElement[];
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onNodeUpdate,
  onClose,
  scrapedElements
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReplaceTextForm>({
    resolver: zodResolver(replaceTextSchema),
    defaultValues: node.config
  });

  const onSubmit = (data: ReplaceTextForm) => {
    const updatedNode = {
      ...node,
      config: {
        ...node.config,
        ...data
      }
    };
    onNodeUpdate(updatedNode);
  };

  const handleElementSelect = (element: ScrapedElement) => {
    setValue('selector', element.selector);
    setValue('originalText', element.textContent);
    
    // Store targeting strategies for runtime
    onNodeUpdate({
      ...node,
      config: {
        ...node.config,
        selector: element.selector,
        selectorStrategies: element.selectorStrategies,
        originalText: element.textContent
      }
    });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{node.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        {/* Element Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Element
          </label>
          <input
            {...register('selector')}
            placeholder=".hero-headline"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          {errors.selector && (
            <p className="text-sm text-red-600 mt-1">{errors.selector.message}</p>
          )}
        </div>

        {/* Scraped Elements List */}
        {scrapedElements.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or select from scraped elements:
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scrapedElements.map((element, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleElementSelect(element)}
                  className="w-full text-left p-2 border border-gray-200 rounded hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-xs font-mono text-gray-600 truncate">
                    {element.selector}
                  </div>
                  <div className="text-sm text-gray-900 truncate mt-1">
                    {element.textContent}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Text
          </label>
          <textarea
            {...register('newText')}
            rows={3}
            placeholder="Enter new text..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          {errors.newText && (
            <p className="text-sm text-red-600 mt-1">{errors.newText.message}</p>
          )}
        </div>

        {/* Animation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Animation
          </label>
          <select
            {...register('animation')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="scale">Scale</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Update Action
        </button>
      </form>
    </div>
  );
};

export default NodeConfigPanel;
```

### Using TanStack Query for Workflow Data

```typescript
// hooks/useWorkflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '../services/workflowService';
import { Workflow } from '../types/workflow';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.getWorkflows(),
    staleTime: 30000, // 30 seconds
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowService.getWorkflow(id),
    enabled: !!id,
  });
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workflow: Workflow) => workflowService.saveWorkflow(workflow),
    onSuccess: (savedWorkflow) => {
      // Update cache
      queryClient.setQueryData(['workflow', savedWorkflow.id], savedWorkflow);
      
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// Usage in WorkflowBuilder
const WorkflowBuilder = ({ workflowId, onBack }) => {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const saveWorkflow = useSaveWorkflow();

  const handleSave = async (updatedWorkflow: Workflow) => {
    await saveWorkflow.mutateAsync(updatedWorkflow);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!workflow) return <NotFound />;

  return (
    <WorkflowCanvas
      workflow={workflow}
      onSave={handleSave}
    />
  );
};
```

---

## 🚀 Integration with Client Websites

### Embedding the Workflow System

```html
<!-- On target website -->
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- Load TrackFlow scripts -->
  <script src="https://trackflow-app-production.up.railway.app/journey-tracker.js"></script>
  <script src="https://trackflow-app-production.up.railway.app/api/unified-workflow-system.js"></script>
  
  <script>
    // Initialize with your configuration
    window.trackflowConfig = {
      apiEndpoint: 'https://trackflow-app-production.up.railway.app/api',
      workflowIds: ['workflow-uuid-1', 'workflow-uuid-2'],
      debug: false
    };
  </script>
</body>
</html>
```

### Generated Integration Code

```typescript
// IntegrationModal.tsx - Generates this code
const generateIntegrationCode = (workflow: Workflow) => {
  return `
<!-- TrackFlow Integration for ${workflow.name} -->
<script src="https://trackflow-app-production.up.railway.app/journey-tracker.js"></script>
<script src="https://trackflow-app-production.up.railway.app/api/unified-workflow-system.js"></script>
<script>
  window.trackflowConfig = {
    apiEndpoint: 'https://trackflow-app-production.up.railway.app/api',
    workflowIds: ['${workflow.id}'],
    debug: ${process.env.NODE_ENV === 'development'}
  };
</script>
`;
};
```

---

## 📊 Data Flow Summary

### Complete Request Flow

```
1. User creates workflow in React UI
   └── WorkflowBuilder.tsx

2. Workflow saved to Supabase
   └── TanStack Query mutation
       └── workflowService.saveWorkflow()
           └── Supabase INSERT/UPDATE

3. Client website loads workflow system
   └── unified-workflow-system.js
       └── Fetches active workflows from server
           └── GET /api/workflows/active

4. Event occurs on client website
   └── User scrolls, clicks, navigates, etc.
       └── unifiedWorkflowSystem.trackEvent()

5. Trigger evaluation
   └── processWorkflows(eventData)
       └── evaluateTrigger(trigger, eventData)
           └── Returns true/false

6. Action execution (if triggered)
   └── executeActions(actions)
       └── resolveElement(strategies)
           └── Apply DOM modifications
               └── Track execution
                   └── POST /api/track-execution
```

---

## 🛠️ Best Practices

### 1. **Element Targeting**

```typescript
// ✅ DO: Provide multiple targeting strategies
const config = {
  selector: '.cta-button',
  selectorStrategies: [
    { selector: '#signup', type: 'id', reliability: 95 },
    { selector: '[data-testid="cta"]', type: 'attribute', reliability: 90 },
    { selector: '.cta-button', type: 'class', reliability: 70 }
  ],
  originalText: 'Sign Up'
};

// ❌ DON'T: Rely on single fragile selector
const badConfig = {
  selector: 'div > div > button:nth-child(3)'
};
```

### 2. **Type Safety**

```typescript
// ✅ DO: Use strict types
interface ActionConfig {
  selector: string;
  selectorStrategies: TargetingStrategy[];
  [key: string]: unknown;
}

// ❌ DON'T: Use any
const config: any = { /* ... */ };
```

### 3. **Error Handling**

```typescript
// ✅ DO: Handle errors gracefully
try {
  const result = await executeAction(action);
  if (!result.success) {
    showToast(result.error, 'error');
    trackError(result.error);
  }
} catch (error) {
  console.error('Action failed:', error);
  showToast('Action execution failed', 'error');
}

// ❌ DON'T: Ignore errors
await executeAction(action); // No error handling
```

### 4. **Performance**

```typescript
// ✅ DO: Debounce frequent events
const handleScroll = debounce(() => {
  trackEvent({ type: 'scroll_depth', depth: calculateScrollDepth() });
}, 200);

// ❌ DON'T: Track every event
window.addEventListener('scroll', () => {
  trackEvent({ type: 'scroll' }); // Too frequent!
});
```

---

## 🎯 Summary

### Key Takeaways

1. **React/TypeScript UI** builds and configures workflows
2. **Vanilla JavaScript runtime** executes workflows on client sites
3. **Multi-strategy targeting** ensures reliable element selection
4. **Type-safe data flow** from UI to database to client
5. **TanStack Query** manages server state efficiently
6. **Supabase** provides real-time data synchronization

### Architecture Benefits

- ✅ **Universal Compatibility**: Vanilla JS executor works on any website
- ✅ **Type Safety**: TypeScript catches errors at compile time
- ✅ **Reliable Targeting**: Multiple fallback strategies
- ✅ **Real-time Updates**: TanStack Query auto-refetches data
- ✅ **Scalable**: React components are composable and reusable
- ✅ **Privacy-Friendly**: Cookie-free journey tracking

---

**Need more details on a specific component?** Let me know which part you'd like to explore deeper!



