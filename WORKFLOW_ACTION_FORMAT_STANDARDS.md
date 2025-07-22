# Workflow Action Format Standards

## Overview

This document outlines the **action format mismatch** that was discovered and how it has been resolved. The workflow system had two incompatible action formats that prevented proper execution.

## The Problem

### Database Storage Format (Supabase)

Actions are stored in the database using this structure:

```typescript
{
  id: "action-1",
  type: "action",
  name: "Replace Text",        // Proper case name
  category: "Content Modification",
  config: {                    // Configuration nested in config object
    selector: ".hero-headline",
    newText: "Welcome!",
    originalText: "Old text"
  },
  inputs: ["input"],
  outputs: ["output"]
}
```

### Legacy Client Format

Legacy integration code expected this format:

```typescript
{
  type: "replace_text",        // Snake case type
  target: ".hero-headline",    // Direct target property
  newText: "Welcome!",         // Direct properties
  originalText: "Old text",
  animation: "fade",
  triggeredBy: "Device Type"
}
```

## The Solution

### 1. Dual Format Support

The `WorkflowExecutor` class now includes a `transformActionToStandard()` method that:

- **Detects** which format an action is in
- **Transforms** legacy format to standard format
- **Preserves** database format actions as-is
- **Handles** unknown formats gracefully

### 2. Server-Side Transformation

The `/api/workflows/trigger-check` endpoint includes `transformActionForClient()` that:

- **Converts** database format to legacy format
- **Ensures** backward compatibility with existing integrations
- **Maintains** consistent API responses

## Action Format Mappings

### Replace Text Action

**Database Format:**
```json
{
  "name": "Replace Text",
  "config": {
    "selector": ".hero",
    "newText": "New text",
    "originalText": "Old text"
  }
}
```

**Legacy Format:**
```json
{
  "type": "replace_text",
  "target": ".hero",
  "newText": "New text",
  "originalText": "Old text",
  "animation": "fade"
}
```

### Hide Element Action

**Database Format:**
```json
{
  "name": "Hide Element",
  "config": {
    "selector": ".popup",
    "animation": "fade"
  }
}
```

**Legacy Format:**
```json
{
  "type": "hide_element",
  "target": ".popup",
  "animation": "fade"
}
```

### Show Element Action

**Database Format:**
```json
{
  "name": "Show Element",
  "config": {
    "selector": ".banner",
    "animation": "slide"
  }
}
```

**Legacy Format:**
```json
{
  "type": "show_element",
  "target": ".banner",
  "animation": "slide"
}
```

### Modify CSS Action

**Database Format:**
```json
{
  "name": "Modify CSS",
  "config": {
    "selector": ".button",
    "property": "background-color",
    "value": "#ff0000"
  }
}
```

**Legacy Format:**
```json
{
  "type": "modify_css",
  "target": ".button",
  "property": "background-color",
  "value": "#ff0000"
}
```

## Execution Paths

### Path 1: Direct WorkflowExecutor (Recommended)

1. Workflows fetched via `/api/workflows/active`
2. Actions in **database format**
3. Client-side trigger evaluation
4. `transformActionToStandard()` handles format conversion
5. Actions executed directly

**Advantages:**
- Faster (no server round-trips for triggers)
- Works offline after initial load
- More reliable
- Modern architecture

### Path 2: Server Trigger-Check (Legacy)

1. Events sent to `/api/workflows/trigger-check`
2. Server evaluates triggers
3. Actions transformed via `transformActionForClient()`
4. Returns **legacy format** actions
5. Client executes legacy format actions

**Advantages:**
- Backward compatible
- Server-side trigger logic
- Consistent with existing integrations

## Testing

### Debug Page

Use `debug-webflow-integration.html` to test both formats:

1. **Test Action Format Compatibility** - Verifies transformation functions
2. **Test Both Execution Paths** - Tests both new and legacy systems
3. **Action Format Analysis** - Shows format comparisons

### Manual Testing

```javascript
// Test database format action
const dbAction = {
  name: "Replace Text",
  config: { selector: ".test", newText: "DB Test" }
};

// Test legacy format action  
const legacyAction = {
  type: "replace_text",
  target: ".test", 
  newText: "Legacy Test"
};

// Both should work correctly
executor.executeAction(dbAction);
executor.executeAction(legacyAction);
```

## Migration Recommendations

### Short Term (Current)
- Both systems work in parallel
- All existing integrations continue working
- New workflows use database format

### Medium Term (Next 3 months)
- Migrate integration code to use `WorkflowExecutor`
- Deprecate trigger-check endpoint
- Update documentation

### Long Term (6+ months)
- Remove legacy transformation code
- Standardize on database format only
- Remove backward compatibility layers

## Implementation Details

### WorkflowExecutor Transformation

```javascript
transformActionToStandard(action) {
  // Database format (has name and config)
  if (action.name && action.config) {
    return action;
  }
  
  // Legacy format (has type and target)
  if (action.type && action.target) {
    return this.convertLegacyToStandard(action);
  }
  
  // Unknown format
  console.warn('Action format not recognized:', action);
  return action;
}
```

### Server-Side Transformation

```javascript
function transformActionForClient(action, triggerName) {
  const baseAction = {
    delay: 0,
    triggeredBy: triggerName
  };
  
  switch (action.name) {
    case 'Replace Text':
      return {
        ...baseAction,
        type: 'replace_text',
        target: action.config.selector,
        newText: action.config.newText,
        originalText: action.config.originalText
      };
    // ... more transformations
  }
}
```

## Error Handling

### Common Issues

1. **Missing selector/target**: Action ignored with warning
2. **Unknown action type**: Fallback with warning  
3. **Invalid config**: Default values applied
4. **Network errors**: Graceful degradation

### Debug Output

Enable debug mode to see transformation logs:

```javascript
new WorkflowExecutor({ debug: true });
```

This will log:
- Action format detection
- Transformation results
- Execution details
- Error messages

## Conclusion

The action format mismatch has been resolved with:

1. ✅ **Backward compatibility** - Legacy code continues working
2. ✅ **Forward compatibility** - New workflows use standard format
3. ✅ **Automatic transformation** - Seamless format conversion
4. ✅ **Comprehensive testing** - Debug tools and test functions
5. ✅ **Clear migration path** - Documented upgrade strategy

Both execution paths now work correctly, ensuring workflows execute properly regardless of which system fetches and processes them. 