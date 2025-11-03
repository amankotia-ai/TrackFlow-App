# 👨‍💻 TrackFlow Implementation Cookbook

> Ready-to-use code snippets for implementing workflow targeting and operations

---

## Table of Contents

1. [Setting Up a New Action Node](#1-setting-up-a-new-action-node)
2. [Setting Up a New Trigger Node](#2-setting-up-a-new-trigger-node)
3. [Building a Node Config Form](#3-building-a-node-config-form)
4. [Implementing Element Targeting](#4-implementing-element-targeting)
5. [Creating Custom Validators](#5-creating-custom-validators)
6. [Using TanStack Query](#6-using-tanstack-query)
7. [Testing Workflows](#7-testing-workflows)

---

## 1. Setting Up a New Action Node

### Step 1: Define the Type

```typescript
// src/types/workflow.ts
export interface CustomActionConfig {
  actionType: 'custom-action';
  selector: string;
  selectorStrategies?: TargetingStrategy[];
  // Your custom fields
  customField: string;
  customNumber: number;
  customBoolean: boolean;
}
```

### Step 2: Create Validation Schema

```typescript
// src/schemas/actionSchemas.ts
import { z } from 'zod';

export const customActionSchema = z.object({
  actionType: z.literal('custom-action'),
  selector: z.string().min(1, 'Selector is required'),
  customField: z.string().min(1, 'Custom field is required'),
  customNumber: z.number().min(0).max(100),
  customBoolean: z.boolean().default(false)
});

export type CustomActionForm = z.infer<typeof customActionSchema>;
```

### Step 3: Add to Node Templates

```typescript
// src/data/nodeTemplates.ts
export const nodeTemplates: NodeTemplate[] = [
  // ... existing templates
  {
    id: 'custom-action',
    type: 'action',
    category: 'Custom Category',
    name: 'Custom Action',
    description: 'Performs a custom operation',
    icon: 'Zap', // Lucide icon name
    defaultConfig: {
      actionType: 'custom-action',
      selector: '',
      customField: '',
      customNumber: 50,
      customBoolean: false
    },
    configFields: [
      {
        key: 'selector',
        type: 'css-selector',
        label: 'Target Element',
        required: true
      },
      {
        key: 'customField',
        type: 'text',
        label: 'Custom Field',
        required: true,
        placeholder: 'Enter value...'
      },
      {
        key: 'customNumber',
        type: 'number',
        label: 'Custom Number',
        required: true,
        min: 0,
        max: 100
      },
      {
        key: 'customBoolean',
        type: 'boolean',
        label: 'Enable Feature',
        required: false
      }
    ]
  }
];
```

### Step 4: Implement Execution Logic

```javascript
// src/utils/unifiedWorkflowSystem.js (or in a new file)

async executeCustomAction(action) {
  const { selector, customField, customNumber, customBoolean } = action.config;
  
  try {
    // 1. Resolve target element
    const result = this.targetElementWithStrategies(
      action.config,
      action.config,
      'Custom Action'
    );
    
    if (!result.success) {
      this.log(`❌ Element not found: ${selector}`, 'error');
      return { success: false, error: 'Element not found' };
    }
    
    const element = result.element;
    
    // 2. Perform your custom operation
    if (customBoolean) {
      element.setAttribute('data-custom', customField);
      element.style.opacity = (customNumber / 100).toString();
    }
    
    // 3. Log success
    this.log(`✅ Custom action executed on element`, 'success');
    
    return {
      success: true,
      element,
      appliedValues: {
        customField,
        customNumber,
        customBoolean
      }
    };
  } catch (error) {
    this.log(`❌ Error executing custom action: ${error.message}`, 'error');
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Step 5: Register in Action Executor

```javascript
// src/utils/unifiedWorkflowSystem.js

async executeActions(actions) {
  const results = [];
  
  for (const action of actions) {
    let result;
    
    switch (action.name || action.config.actionType) {
      case 'Replace Text':
        result = await this.executeReplaceTextAction(action);
        break;
      
      // ... other actions
      
      case 'Custom Action':
        result = await this.executeCustomAction(action);
        break;
        
      default:
        console.warn(`Unknown action: ${action.name}`);
        result = { success: false, error: 'Unknown action' };
    }
    
    results.push({ actionId: action.id, ...result });
  }
  
  return results;
}
```

---

## 2. Setting Up a New Trigger Node

### Step 1: Define the Type

```typescript
// src/types/workflow.ts
export interface CustomTriggerConfig {
  triggerType: 'custom-trigger';
  threshold: number;
  condition: 'above' | 'below' | 'equal';
}
```

### Step 2: Create Validation Schema

```typescript
// src/schemas/triggerSchemas.ts
import { z } from 'zod';

export const customTriggerSchema = z.object({
  triggerType: z.literal('custom-trigger'),
  threshold: z.number().min(0).max(100),
  condition: z.enum(['above', 'below', 'equal'])
});

export type CustomTriggerForm = z.infer<typeof customTriggerSchema>;
```

### Step 3: Add to Node Templates

```typescript
// src/data/nodeTemplates.ts
{
  id: 'custom-trigger',
  type: 'trigger',
  category: 'Custom Triggers',
  name: 'Custom Trigger',
  description: 'Triggers based on custom condition',
  icon: 'Zap',
  defaultConfig: {
    triggerType: 'custom-trigger',
    threshold: 50,
    condition: 'above'
  },
  configFields: [
    {
      key: 'threshold',
      type: 'number',
      label: 'Threshold',
      required: true,
      min: 0,
      max: 100
    },
    {
      key: 'condition',
      type: 'select',
      label: 'Condition',
      required: true,
      options: [
        { value: 'above', label: 'Above' },
        { value: 'below', label: 'Below' },
        { value: 'equal', label: 'Equal To' }
      ]
    }
  ]
}
```

### Step 4: Implement Evaluation Logic

```javascript
// src/utils/unifiedWorkflowSystem.js

evaluateCustomTrigger(trigger, eventData) {
  const { threshold, condition } = trigger.config;
  
  // Get your custom metric (example: scroll percentage)
  const currentValue = this.calculateScrollPercentage();
  
  switch (condition) {
    case 'above':
      return currentValue > threshold;
    case 'below':
      return currentValue < threshold;
    case 'equal':
      return Math.abs(currentValue - threshold) < 1; // Allow 1% tolerance
    default:
      return false;
  }
}
```

### Step 5: Register in Trigger Evaluator

```javascript
// src/utils/unifiedWorkflowSystem.js

evaluateTrigger(trigger, eventData) {
  const triggerType = trigger.name || trigger.config.triggerType;
  
  switch (triggerType) {
    case 'Page Visits':
      return this.evaluatePageVisitsTrigger(trigger, eventData);
    
    // ... other triggers
    
    case 'Custom Trigger':
      return this.evaluateCustomTrigger(trigger, eventData);
      
    default:
      console.warn(`Unknown trigger type: ${triggerType}`);
      return false;
  }
}
```

---

## 3. Building a Node Config Form

### Complete Form Component

```typescript
// components/CustomNodeConfig.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkflowNode } from '../types/workflow';

const schema = z.object({
  selector: z.string().min(1, 'Selector is required'),
  value: z.string().min(1, 'Value is required'),
  animation: z.enum(['none', 'fade', 'slide'])
});

type FormData = z.infer<typeof schema>;

interface Props {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const CustomNodeConfig: React.FC<Props> = ({ node, onUpdate }) => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isValid }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: node.config,
    mode: 'onChange' // Validate on change
  });

  const onSubmit = (data: FormData) => {
    onUpdate({
      ...node,
      config: { ...node.config, ...data }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CSS Selector
        </label>
        <input
          {...register('selector')}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
            errors.selector ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder=".my-element"
        />
        {errors.selector && (
          <p className="text-sm text-red-600 mt-1">
            {errors.selector.message}
          </p>
        )}
      </div>

      {/* Text Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value
        </label>
        <textarea
          {...register('value')}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
            errors.value ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.value && (
          <p className="text-sm text-red-600 mt-1">
            {errors.value.message}
          </p>
        )}
      </div>

      {/* Select */}
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
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid}
        className={`w-full py-2 rounded-lg transition-colors ${
          isValid
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Update Configuration
      </button>
    </form>
  );
};
```

---

## 4. Implementing Element Targeting

### Basic Element Resolver

```typescript
// utils/elementResolver.ts

interface TargetingStrategy {
  selector: string;
  type: string;
  reliability: number;
}

interface TargetingResult {
  success: boolean;
  element: Element | null;
  message: string;
}

export function resolveElement(
  strategies: TargetingStrategy[],
  context: { originalText?: string } = {}
): TargetingResult {
  // Sort by reliability
  const sorted = [...strategies].sort((a, b) => b.reliability - a.reliability);
  
  for (const strategy of sorted) {
    try {
      const elements = document.querySelectorAll(strategy.selector);
      
      if (elements.length === 1) {
        return {
          success: true,
          element: elements[0],
          message: `Found using ${strategy.type}`
        };
      }
      
      if (elements.length > 1 && context.originalText) {
        // Disambiguate by text content
        for (const el of elements) {
          if (el.textContent?.includes(context.originalText)) {
            return {
              success: true,
              element: el,
              message: `Found using ${strategy.type} + text matching`
            };
          }
        }
      }
    } catch (error) {
      console.warn(`Strategy failed: ${strategy.selector}`, error);
    }
  }
  
  return {
    success: false,
    element: null,
    message: 'No strategy succeeded'
  };
}

// Usage
const result = resolveElement([
  { selector: '#my-id', type: 'id', reliability: 95 },
  { selector: '.my-class', type: 'class', reliability: 70 }
], { originalText: 'Click Me' });

if (result.success) {
  result.element.textContent = 'New Text';
}
```

### Advanced Targeting with Context

```typescript
// utils/advancedTargeting.ts

export interface ElementContext {
  originalText?: string;
  position?: number;
  attributes?: Record<string, string>;
  parentSelector?: string;
}

export function resolveWithContext(
  selector: string,
  context: ElementContext
): Element | null {
  let elements = Array.from(document.querySelectorAll(selector));
  
  // Filter by parent if specified
  if (context.parentSelector) {
    const parent = document.querySelector(context.parentSelector);
    if (parent) {
      elements = elements.filter(el => parent.contains(el));
    }
  }
  
  // Filter by text content
  if (context.originalText) {
    elements = elements.filter(el => 
      el.textContent?.includes(context.originalText)
    );
  }
  
  // Filter by attributes
  if (context.attributes) {
    elements = elements.filter(el =>
      Object.entries(context.attributes).every(([attr, value]) =>
        el.getAttribute(attr) === value
      )
    );
  }
  
  // Use position if specified
  if (context.position !== undefined) {
    return elements[context.position] || null;
  }
  
  // Return first match
  return elements[0] || null;
}

// Usage
const element = resolveWithContext('.button', {
  originalText: 'Sign Up',
  attributes: { 'data-variant': 'primary' },
  parentSelector: '.hero-section'
});
```

---

## 5. Creating Custom Validators

### Complex Validation Rules

```typescript
// schemas/customValidators.ts
import { z } from 'zod';

// URL validation with protocol
export const urlSchema = z
  .string()
  .url('Must be a valid URL')
  .refine((url) => url.startsWith('http'), {
    message: 'URL must start with http:// or https://'
  });

// CSS selector validation
export const selectorSchema = z
  .string()
  .min(1, 'Selector is required')
  .refine((selector) => {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }, {
    message: 'Invalid CSS selector syntax'
  });

// Conditional validation
export const conditionalSchema = z
  .object({
    enableFeature: z.boolean(),
    featureValue: z.string().optional()
  })
  .refine((data) => {
    if (data.enableFeature) {
      return data.featureValue && data.featureValue.length > 0;
    }
    return true;
  }, {
    message: 'Feature value is required when feature is enabled',
    path: ['featureValue']
  });

// Range validation
export const percentageSchema = z
  .number()
  .min(0, 'Must be at least 0')
  .max(100, 'Must be at most 100')
  .refine((val) => val % 1 === 0 || val % 1 === 0.5, {
    message: 'Must be a whole number or half (e.g., 50, 50.5)'
  });

// Array validation
export const pagesSchema = z
  .array(z.string().min(1))
  .min(2, 'At least 2 pages required')
  .refine((pages) => new Set(pages).size === pages.length, {
    message: 'Pages must be unique'
  });

// Custom async validation
export const asyncValidationSchema = z.string().refine(
  async (value) => {
    // Simulate API call
    const response = await fetch(`/api/validate?value=${value}`);
    const data = await response.json();
    return data.isValid;
  },
  {
    message: 'Value is not valid according to server'
  }
);
```

### Using Custom Validators

```typescript
// components/FormWithCustomValidation.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { selectorSchema, percentageSchema } from '../schemas/customValidators';

const formSchema = z.object({
  selector: selectorSchema,
  percentage: percentageSchema
});

type FormData = z.infer<typeof formSchema>;

export const FormComponent = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });
  
  // Form implementation...
};
```

---

## 6. Using TanStack Query

### Setting Up Query Client

```typescript
// main.tsx or App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Creating Query Hooks

```typescript
// hooks/useWorkflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '../services/workflowService';
import { Workflow } from '../types/workflow';

// List workflows
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowService.getWorkflows(),
    staleTime: 30000
  });
}

// Get single workflow
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowService.getWorkflow(id),
    enabled: !!id // Only run if id exists
  });
}

// Create workflow
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workflow: Omit<Workflow, 'id'>) => 
      workflowService.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
}

// Update workflow
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workflow: Workflow) => 
      workflowService.updateWorkflow(workflow),
    onMutate: async (updatedWorkflow) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workflow', updatedWorkflow.id] });
      
      // Snapshot previous value
      const previousWorkflow = queryClient.getQueryData(['workflow', updatedWorkflow.id]);
      
      // Optimistically update
      queryClient.setQueryData(['workflow', updatedWorkflow.id], updatedWorkflow);
      
      return { previousWorkflow };
    },
    onError: (err, updatedWorkflow, context) => {
      // Rollback on error
      if (context?.previousWorkflow) {
        queryClient.setQueryData(
          ['workflow', updatedWorkflow.id],
          context.previousWorkflow
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
}

// Delete workflow
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => workflowService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    }
  });
}
```

### Using in Components

```typescript
// components/WorkflowList.tsx
import { useWorkflows, useDeleteWorkflow } from '../hooks/useWorkflows';

export const WorkflowList = () => {
  const { data: workflows, isLoading, error } = useWorkflows();
  const deleteWorkflow = useDeleteWorkflow();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  const handleDelete = async (id: string) => {
    if (confirm('Delete this workflow?')) {
      await deleteWorkflow.mutateAsync(id);
    }
  };

  return (
    <div>
      {workflows?.map(workflow => (
        <div key={workflow.id}>
          <h3>{workflow.name}</h3>
          <button onClick={() => handleDelete(workflow.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

## 7. Testing Workflows

### Unit Testing Triggers

```typescript
// __tests__/triggers.test.ts
import { describe, it, expect } from 'vitest';
import { evaluatePageVisitsTrigger } from '../utils/triggers';

describe('Page Visits Trigger', () => {
  it('should trigger when visit count exceeds threshold', () => {
    const trigger = {
      config: {
        visitCount: 3,
        timeframe: 'session'
      }
    };
    
    const eventData = {
      currentVisitCount: 4
    };
    
    const result = evaluatePageVisitsTrigger(trigger, eventData);
    expect(result).toBe(true);
  });
  
  it('should not trigger when visit count is below threshold', () => {
    const trigger = {
      config: {
        visitCount: 5,
        timeframe: 'session'
      }
    };
    
    const eventData = {
      currentVisitCount: 3
    };
    
    const result = evaluatePageVisitsTrigger(trigger, eventData);
    expect(result).toBe(false);
  });
});
```

### Integration Testing with React Testing Library

```typescript
// __tests__/NodeConfigPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NodeConfigPanel } from '../components/NodeConfigPanel';

describe('NodeConfigPanel', () => {
  it('should update node configuration on form submit', async () => {
    const mockUpdate = vi.fn();
    const node = {
      id: 'test-1',
      type: 'action',
      name: 'Replace Text',
      config: {
        selector: '.old-selector',
        newText: 'Old Text'
      }
    };
    
    render(
      <NodeConfigPanel
        node={node}
        onNodeUpdate={mockUpdate}
        onClose={() => {}}
      />
    );
    
    // Update selector
    const selectorInput = screen.getByLabelText('CSS Selector');
    fireEvent.change(selectorInput, { target: { value: '.new-selector' } });
    
    // Update text
    const textInput = screen.getByLabelText('New Text');
    fireEvent.change(textInput, { target: { value: 'New Text' } });
    
    // Submit form
    const submitButton = screen.getByText('Update Configuration');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        ...node,
        config: {
          selector: '.new-selector',
          newText: 'New Text'
        }
      });
    });
  });
});
```

### E2E Testing Workflow Execution

```typescript
// __tests__/workflow-execution.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Workflow Execution', () => {
  test('should execute replace text action on trigger', async ({ page }) => {
    // Navigate to test page with workflow
    await page.goto('http://localhost:3000/test-page');
    
    // Wait for workflow system to load
    await page.waitForFunction(() => window.unifiedWorkflowSystem !== undefined);
    
    // Get original text
    const originalText = await page.textContent('.hero-headline');
    expect(originalText).toBe('Original Headline');
    
    // Trigger the workflow (e.g., by scrolling)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    
    // Wait for action to execute
    await page.waitForTimeout(1000);
    
    // Check if text was replaced
    const newText = await page.textContent('.hero-headline');
    expect(newText).toBe('New Headline');
  });
});
```

---

## 8. Debugging Utilities

### Debug Logger

```typescript
// utils/debugLogger.ts

export class DebugLogger {
  private enabled: boolean;
  
  constructor(enabled = false) {
    this.enabled = enabled || window.TRACKFLOW_DEBUG === true;
  }
  
  log(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`🔍 [TrackFlow] ${message}`, data || '');
  }
  
  success(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(`✅ [TrackFlow] ${message}`, data || '');
  }
  
  error(message: string, error?: any) {
    if (!this.enabled) return;
    console.error(`❌ [TrackFlow] ${message}`, error || '');
  }
  
  warn(message: string, data?: any) {
    if (!this.enabled) return;
    console.warn(`⚠️ [TrackFlow] ${message}`, data || '');
  }
  
  group(label: string, callback: () => void) {
    if (!this.enabled) return callback();
    console.group(`📦 [TrackFlow] ${label}`);
    callback();
    console.groupEnd();
  }
  
  table(data: any[]) {
    if (!this.enabled) return;
    console.table(data);
  }
}

// Usage
const logger = new DebugLogger(true);
logger.log('Element targeting', { selector: '.my-element' });
logger.success('Action executed');
logger.error('Failed to find element', new Error('Not found'));
```

### Performance Monitor

```typescript
// utils/performanceMonitor.ts

export class PerformanceMonitor {
  private markers: Map<string, number> = new Map();
  
  start(label: string) {
    this.markers.set(label, performance.now());
  }
  
  end(label: string): number {
    const start = this.markers.get(label);
    if (!start) {
      console.warn(`No start marker found for: ${label}`);
      return 0;
    }
    
    const duration = performance.now() - start;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    this.markers.delete(label);
    return duration;
  }
  
  async measure<T>(label: string, callback: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await callback();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

monitor.start('workflow-execution');
await executeWorkflow();
monitor.end('workflow-execution');

// Or
const result = await monitor.measure('fetch-workflows', async () => {
  return await fetch('/api/workflows').then(r => r.json());
});
```

---

## Quick Copy-Paste Snippets

### Debounce Hook

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Toast Notification Hook

```typescript
import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, showToast };
}
```

### Local Storage Hook

```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

---

**Happy Coding! 🚀**



