# Workflow Creation Enhancements - Working Document

## Overview
This document outlines the implementation plan for three key workflow creation enhancements:
1. **New Workflow Creation Modal** - Capture name and URL before opening builder
2. **Save Button State Management** - Visual indicators for unsaved changes
3. **Auto-Save Functionality** - Automatic saving with user feedback

---

## 1. New Workflow Creation Modal

### Current State
- `handleCreateWorkflow()` immediately creates workflow with defaults
- Uses generic "New Playbook" name
- Empty `targetUrl`
- Goes directly to WorkflowBuilder

### Proposed Implementation

#### A. Create NewWorkflowModal Component

**File:** `src/components/NewWorkflowModal.tsx`

```typescript
interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkflow: (workflowData: NewWorkflowData) => void;
}

interface NewWorkflowData {
  name: string;
  description?: string;
  targetUrl: string;
  targetingMode: 'exact' | 'domain' | 'path' | 'universal';
}

const NewWorkflowModal: React.FC<NewWorkflowModalProps> = ({
  isOpen,
  onClose,
  onCreateWorkflow
}) => {
  const [formData, setFormData] = useState<NewWorkflowData>({
    name: '',
    description: '',
    targetUrl: '',
    targetingMode: 'exact'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
}
```

#### B. Modal Features

**Step 1: Basic Information**
- **Name Field**: Required, auto-focus, real-time validation
- **Description Field**: Optional, helpful placeholder
- **Template Selection**: Quick start options (later enhancement)

**Step 2: Target Configuration**
- **URL Input**: Required, with validation
- **Targeting Mode Selector**: 
  - Exact URL match
  - Domain matching
  - Path matching  
  - Universal (all pages)
- **URL Preview**: Show what pages will match
- **Test URL Button**: Verify accessibility

**Step 3: Confirmation**
- **Preview Summary**: Show what will be created
- **Auto-scrape Option**: Checkbox to scan page elements
- **Create & Open Button**: Final action

#### C. Validation Logic

```typescript
const validateForm = async (data: NewWorkflowData) => {
  const newErrors: Record<string, string> = {};
  
  // Name validation
  if (!data.name.trim()) {
    newErrors.name = 'Workflow name is required';
  } else if (data.name.length < 3) {
    newErrors.name = 'Name must be at least 3 characters';
  } else if (data.name.length > 50) {
    newErrors.name = 'Name must be less than 50 characters';
  }
  
  // URL validation
  if (!data.targetUrl.trim()) {
    newErrors.targetUrl = 'Target URL is required';
  } else if (data.targetUrl !== '*') {
    try {
      new URL(data.targetUrl);
      // Optional: Test URL accessibility
      await testUrlAccessibility(data.targetUrl);
    } catch (error) {
      newErrors.targetUrl = 'Please enter a valid URL';
    }
  }
  
  return newErrors;
};
```

#### D. Update App.tsx Workflow Creation

```typescript
// Add state for modal
const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

// Update handler
const handleCreateWorkflow = () => {
  setShowNewWorkflowModal(true);
};

// New handler for modal submission
const handleNewWorkflowSubmit = (workflowData: NewWorkflowData) => {
  const newWorkflow: Workflow = {
    id: `workflow-${Date.now()}`,
    name: workflowData.name,
    description: workflowData.description || `Personalization playbook for ${workflowData.targetUrl}`,
    isActive: false,
    status: 'draft',
    executions: 0,
    nodes: [],
    connections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    targetUrl: workflowData.targetUrl
  };
  
  setWorkflows(prev => [...prev, newWorkflow]);
  setSelectedWorkflow(newWorkflow);
  setShowNewWorkflowModal(false);
};
```

---

## 2. Save Button State Management

### Current State
- Simple save button with no change indicators
- No visual feedback for unsaved changes
- Basic error handling with browser alerts

### Proposed Enhancement

#### A. Change Detection Logic

**Add to WorkflowBuilder.tsx:**

```typescript
// Add states for change tracking
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [originalWorkflow, setOriginalWorkflow] = useState<Workflow>(workflow);
const [isSaving, setIsSaving] = useState(false);

// Deep comparison for change detection
const hasChanges = useMemo(() => {
  if (!originalWorkflow) return false;
  
  return (
    currentWorkflow.name !== originalWorkflow.name ||
    currentWorkflow.description !== originalWorkflow.description ||
    currentWorkflow.targetUrl !== originalWorkflow.targetUrl ||
    JSON.stringify(currentWorkflow.nodes) !== JSON.stringify(originalWorkflow.nodes) ||
    JSON.stringify(currentWorkflow.connections) !== JSON.stringify(originalWorkflow.connections)
  );
}, [currentWorkflow, originalWorkflow]);

// Update original when workflow prop changes
useEffect(() => {
  setOriginalWorkflow(workflow);
  setHasUnsavedChanges(false);
}, [workflow]);

// Update unsaved state when changes detected
useEffect(() => {
  setHasUnsavedChanges(hasChanges);
}, [hasChanges]);
```

#### B. Enhanced Save Button Component

```typescript
const SaveButton: React.FC<{
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}> = ({ hasChanges, isSaving, onSave }) => {
  const getSaveButtonState = () => {
    if (isSaving) {
      return {
        icon: Loader2,
        text: 'Saving...',
        className: 'text-blue-700 bg-blue-50/90 border-blue-200',
        disabled: true
      };
    }
    
    if (hasChanges) {
      return {
        icon: AlertCircle,
        text: 'Save Changes',
        className: 'text-orange-700 bg-orange-50/90 border-orange-200 hover:bg-orange-100 animate-pulse',
        disabled: false
      };
    }
    
    return {
      icon: Check,
      text: 'Saved',
      className: 'text-green-700 bg-green-50/90 border-green-200',
      disabled: true
    };
  };

  const buttonState = getSaveButtonState();
  const IconComponent = buttonState.icon;

  return (
    <button
      onClick={onSave}
      disabled={buttonState.disabled}
      className={`flex items-center space-x-2 px-4 py-2 backdrop-blur-sm border transition-all font-medium text-sm rounded-lg shadow-sm ${buttonState.className}`}
    >
      <IconComponent 
        className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} 
      />
      <span>{buttonState.text}</span>
      {hasChanges && !isSaving && (
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};
```

#### C. Enhanced Save Handler

```typescript
const handleSave = async () => {
  if (!hasChanges || isSaving) return;
  
  try {
    setIsSaving(true);
    
    const savedWorkflow = await onSave(currentWorkflow);
    
    // Update original workflow to reflect saved state
    setOriginalWorkflow(savedWorkflow);
    setHasUnsavedChanges(false);
    
    // Show success feedback
    showToast('Workflow saved successfully', 'success');
    
  } catch (error) {
    console.error('Save failed:', error);
    showToast(`Save failed: ${error.message}`, 'error');
  } finally {
    setIsSaving(false);
  }
};
```

---

## 3. Auto-Save Functionality

### Implementation Strategy

#### A. Auto-Save Hook

**File:** `src/hooks/useAutoSave.ts`

```typescript
interface UseAutoSaveOptions {
  enabled: boolean;
  delay: number; // milliseconds
  onSave: (data: any) => Promise<any>;
  onSuccess?: (savedData: any) => void;
  onError?: (error: Error) => void;
}

interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSave: Date | null;
  error: string | null;
}

export const useAutoSave = (
  data: any,
  options: UseAutoSaveOptions
): AutoSaveStatus => {
  const [status, setStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSave: null,
    error: null
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!options.enabled || !data) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setStatus(prev => ({ ...prev, status: 'saving', error: null }));
        
        const savedData = await options.onSave(data);
        
        setStatus({
          status: 'saved',
          lastSave: new Date(),
          error: null
        });
        
        options.onSuccess?.(savedData);
        
        // Reset to idle after showing saved status
        setTimeout(() => {
          setStatus(prev => ({ ...prev, status: 'idle' }));
        }, 2000);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Auto-save failed';
        
        setStatus({
          status: 'error',
          lastSave: null,
          error: errorMessage
        });
        
        options.onError?.(error as Error);
        
        // Reset to idle after showing error
        setTimeout(() => {
          setStatus(prev => ({ ...prev, status: 'idle' }));
        }, 3000);
      }
    }, options.delay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [data, options]);

  return status;
};
```

#### B. Integration in WorkflowBuilder

```typescript
// Add auto-save to WorkflowBuilder
const autoSaveStatus = useAutoSave(currentWorkflow, {
  enabled: hasChanges && !isSaving,
  delay: 3000, // 3 seconds
  onSave: async (workflow) => {
    const savedWorkflow = await WorkflowService.saveWorkflow(workflow);
    return savedWorkflow;
  },
  onSuccess: (savedWorkflow) => {
    setOriginalWorkflow(savedWorkflow);
    setHasUnsavedChanges(false);
    console.log('🔄 Auto-saved workflow');
  },
  onError: (error) => {
    console.error('❌ Auto-save failed:', error);
    showToast('Auto-save failed', 'error');
  }
});
```

#### C. Auto-Save Status Indicator

```typescript
const AutoSaveIndicator: React.FC<{ status: AutoSaveStatus }> = ({ status }) => {
  if (status.status === 'idle') return null;

  const getIndicatorConfig = () => {
    switch (status.status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Auto-saving...',
          className: 'text-blue-600',
          spinning: true
        };
      case 'saved':
        return {
          icon: Check,
          text: 'Auto-saved',
          className: 'text-green-600',
          spinning: false
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Auto-save failed',
          className: 'text-red-600',
          spinning: false
        };
    }
  };

  const config = getIndicatorConfig();
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center space-x-1 text-xs ${config.className}`}>
      <IconComponent 
        className={`w-3 h-3 ${config.spinning ? 'animate-spin' : ''}`} 
      />
      <span>{config.text}</span>
      {status.lastSave && (
        <span className="text-gray-500">
          • {format(status.lastSave, 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
};
```

---

## 4. Additional Enhancements

### A. Keyboard Shortcuts

```typescript
// Add Ctrl/Cmd+S shortcut for manual save
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasChanges && !isSaving) {
        handleSave();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [hasChanges, isSaving, handleSave]);
```

### B. Unsaved Changes Warning

```typescript
// Warn before leaving with unsaved changes
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasChanges]);
```

### C. Toast Notification System

**File:** `src/components/Toast.tsx`

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

// Simple toast implementation
export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  return { toasts, showToast };
};
```

---

## 5. Implementation Timeline

### Phase 1: Core Features (Week 1)
1. **New Workflow Modal**
   - Create modal component with form validation
   - Update App.tsx workflow creation flow
   - Add URL validation and testing

2. **Save Button Enhancement**
   - Implement change detection logic
   - Create enhanced save button component
   - Add visual states and indicators

### Phase 2: Auto-Save (Week 2)
1. **Auto-Save Hook**
   - Create useAutoSave hook
   - Implement debounced saving logic
   - Add error handling and retry logic

2. **Status Indicators**
   - Create auto-save status component
   - Add toast notification system
   - Integrate with WorkflowBuilder

### Phase 3: Polish (Week 3)
1. **Additional Features**
   - Add keyboard shortcuts
   - Implement unsaved changes warning
   - Add advanced URL testing

2. **Testing & Refinement**
   - User testing and feedback
   - Performance optimization
   - Error edge case handling

---

## 6. Technical Considerations

### A. Performance
- **Debounced Auto-Save**: Prevent excessive API calls
- **Deep Comparison Optimization**: Use useMemo for change detection
- **Selective Updates**: Only save changed fields

### B. Reliability
- **Offline Detection**: Pause auto-save when offline
- **Retry Logic**: Automatic retry for failed saves
- **Conflict Resolution**: Handle concurrent edits

### C. User Experience
- **Progressive Enhancement**: Features work without JavaScript
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Mobile Responsiveness**: Touch-friendly modal interactions

---

## 7. Success Metrics

### A. User Engagement
- Reduced workflow abandonment rate
- Increased completion of workflow setup
- Improved time-to-first-save

### B. Technical Metrics
- Decreased data loss incidents
- Reduced support tickets about lost work
- Improved auto-save success rate (>99%)

### C. User Feedback
- Improved onboarding satisfaction scores
- Reduced confusion about save states
- Positive feedback on auto-save reliability

---

## 8. Integration Button Enhancement

### Current State
- Integration button only shows when URL is set, scraping is complete, and successful
- Hidden during workflow creation and editing phases
- Users can't access integration code until all conditions are met

### Proposed Change ✅ IMPLEMENTED
- **Always show integration button** regardless of scraping status
- Makes integration code accessible at any time during workflow building
- Improves user workflow by allowing early integration setup

#### Implementation
```typescript
// Before: Conditional display
{url && isDone && scrapingResult?.success && (
  <button onClick={() => setShowIntegrationModal(true)}>
    Integration
  </button>
)}

// After: Always visible
<button onClick={() => setShowIntegrationModal(true)}>
  Integration
</button>
```

#### Benefits
- **Early Access**: Users can view integration code before workflow is complete
- **Better UX**: No hidden functionality behind complex conditions
- **Simplified Logic**: Removes unnecessary conditional rendering
- **Consistent UI**: Integration always available in toolbar

---

This document serves as the comprehensive guide for implementing these workflow creation enhancements. Each section can be tackled incrementally while maintaining backward compatibility with existing workflows. 