# Smart Text Replacement Fix

## 🎯 Problem Identified

When there were multiple elements with the same CSS selector (like multiple divs with the same class), the text replacement action was applying changes to **ALL** matching elements instead of targeting just one specific element. This behavior was problematic for text content modifications where users typically want to modify only one specific instance.

### Example of the Problem:
```html
<div class="content">First content</div>
<div class="content">Second content</div>
<div class="content">Third content</div>
```

When using selector `.content` with text replacement, ALL three divs would get their content replaced, which was unintended behavior.

## ✅ Solution Implemented

### Smart Text Replacement Logic

The system now implements **smart targeting** for text replacement actions that:

1. **Detects multiple matching elements** for text replacement actions
2. **Applies intelligent targeting** to modify only one specific element
3. **Preserves original behavior** for other action types (hide, show, CSS modifications)

### Targeting Strategies

#### Strategy 1: Original Text Matching
When `originalText` is provided in the configuration, the system searches through all matching elements to find the one containing that specific text.

```javascript
// Example: Only replace text in the div containing "Second content"
{
  selector: '.content',
  newText: 'Updated content',
  originalText: 'Second content'
}
```

#### Strategy 2: First Element Targeting
When no `originalText` is provided, the system targets the first matching element only.

```javascript
// Example: Only replace text in the first div
{
  selector: '.content',
  newText: 'Updated content'
}
```

## 🔧 Implementation Details

### Updated Files

1. **`src/utils/unifiedWorkflowSystem.js`**
   - Modified `applySingleSelector()` method to detect text replacement actions
   - Added smart targeting logic for multiple element matches
   - Enhanced logging for better debugging

2. **`src/utils/workflowExecutor.js`**
   - Updated `executeReplaceText()` method with smart targeting
   - Improved console logging for troubleshooting

3. **`simple-webflow-integration.html`**
   - Applied smart targeting to the `executeReplaceText()` function
   - Enhanced debugging output

4. **`debug-webflow-integration.html`**
   - Implemented smart targeting with detailed logging
   - Added debug information for targeting decisions

5. **`src/data/nodeTemplates.ts`**
   - Updated field descriptions to explain the new behavior
   - Added guidance about `originalText` field usage

### Code Example

```javascript
// New smart targeting implementation
applySingleSelector(selector, config, preventDuplicates = true, actionType = null) {
  const elements = document.querySelectorAll(selector);
  const isTextReplacement = config.newText !== undefined || config.originalText !== undefined;
  
  if (isTextReplacement && elements.length > 1) {
    // Smart targeting logic
    let targetElement = null;
    
    // Strategy 1: Find element with original text
    if (config.originalText) {
      for (const element of elements) {
        if (element.textContent && element.textContent.includes(config.originalText)) {
          targetElement = element;
          break;
        }
      }
    }
    
    // Strategy 2: Use first element as fallback
    if (!targetElement) {
      targetElement = elements[0];
    }
    
    // Apply to only the targeted element
    this.replaceContent(targetElement, config);
  } else {
    // Apply to all elements for non-text actions
    elements.forEach(element => {
      this.replaceContent(element, config);
    });
  }
}
```

## 🧪 Testing

A comprehensive test file `test-smart-text-replacement.html` has been created to demonstrate:

1. **Old Behavior**: Replaces content in all matching elements
2. **New Behavior with originalText**: Targets specific element containing the original text
3. **New Behavior without originalText**: Targets only the first matching element

### Running the Test

1. Open `test-smart-text-replacement.html` in a browser
2. Click the test buttons to see the difference between behaviors
3. Use the reset button to restore original content
4. Check the logs to see the targeting decisions

## 📋 User Guidelines

### When to Use originalText

- **Use `originalText`** when you have multiple similar elements and want to target a specific one
- **Leave `originalText` empty** when you want to target the first matching element
- **Be specific with selectors** when possible to avoid multiple matches

### Example Configurations

#### Targeting Specific Content
```javascript
{
  selector: '.pricing-card h3',
  newText: '$99/month',
  originalText: '$79/month'  // Target the card with this specific price
}
```

#### Targeting First Match
```javascript
{
  selector: '.hero-headline',
  newText: 'Welcome to Our New Site!'
  // No originalText - will target first .hero-headline
}
```

## ✨ Benefits

1. **Precision**: Only modifies the intended element
2. **Predictability**: Consistent behavior across different pages
3. **Flexibility**: Works with both specific targeting and first-match fallback
4. **Backward Compatibility**: Doesn't break existing workflows
5. **Better UX**: More intuitive behavior for content creators

## 🔍 Debugging

The system now provides enhanced logging:

- `🎯 Text replacement detected with X matching elements`
- `🎯 Found element with original text: "..."`
- `🎯 Using first matching element for text replacement`
- `✅ Applied text replacement to 1 specific element out of X matches`

This helps users understand which element was targeted and why.

## 🚀 Next Steps

1. **User Education**: Update documentation and training materials
2. **Feedback Collection**: Monitor user feedback on the new behavior
3. **Selector Optimization**: Consider implementing automatic selector optimization for better targeting
4. **Advanced Targeting**: Future enhancements could include position-based targeting (nth-child, etc.) 