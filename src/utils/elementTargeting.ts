/**
 * Unified Element Targeting System
 * Provides intelligent element resolution for workflow execution
 * Ensures unique targeting even when multiple elements share similar selectors
 */

export interface TargetingStrategy {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type' | 'unique-path' | 'context';
  reliability: number;
  description: string;
  isUnique: boolean;
}

export interface TargetingContext {
  originalText?: string;
  textContent?: string;
  position?: number;
  parentContext?: string;
  attributes?: Record<string, string>;
}

export interface TargetingResult {
  success: boolean;
  element: Element | null;
  elements: Element[];
  strategy: TargetingStrategy | null;
  message: string;
  fallbackUsed?: boolean;
}

/**
 * Resolves an element using multiple targeting strategies with intelligent fallbacks
 */
export function resolveElement(
  strategies: TargetingStrategy[],
  context: TargetingContext = {},
  actionType: string = 'unknown'
): TargetingResult {
  console.log(`🎯 Element Targeting: Resolving element for ${actionType} action`, {
    strategies: strategies.length,
    context
  });

  // Try each strategy in order of reliability
  for (const strategy of strategies) {
    const elements = document.querySelectorAll(strategy.selector);
    
    console.log(`🔍 Trying strategy: ${strategy.type} - "${strategy.selector}" (${elements.length} matches)`);
    
    if (elements.length === 0) {
      continue; // Try next strategy
    }
    
    if (elements.length === 1) {
      // Perfect match - single element found
      console.log(`✅ Unique element found with ${strategy.type} selector`);
      return {
        success: true,
        element: elements[0],
        elements: Array.from(elements),
        strategy,
        message: `Found unique element using ${strategy.description}`
      };
    }
    
    // Multiple elements found - apply disambiguation
    const disambiguated = disambiguateElements(Array.from(elements), context, actionType);
    
    if (disambiguated.success && disambiguated.element) {
      console.log(`✅ Element disambiguated using ${strategy.type} selector`);
      return {
        success: true,
        element: disambiguated.element,
        elements: Array.from(elements),
        strategy,
        message: `Found target element using ${strategy.description} with ${disambiguated.method}`,
        fallbackUsed: true
      };
    }
  }
  
  // No strategy worked
  console.warn(`❌ Element targeting failed - no strategies resolved to a unique element`);
  return {
    success: false,
    element: null,
    elements: [],
    strategy: null,
    message: 'No targeting strategy could resolve to a unique element'
  };
}

/**
 * Disambiguates between multiple matching elements using context
 */
function disambiguateElements(
  elements: Element[],
  context: TargetingContext,
  actionType: string
): { success: boolean; element: Element | null; method: string } {
  
  console.log(`🎯 Disambiguating ${elements.length} elements for ${actionType} action`);
  
  // Strategy 1: Text content matching (for text-related actions)
  if (context.originalText && (actionType.includes('text') || actionType.includes('Text'))) {
    for (const element of elements) {
      if (element.textContent && element.textContent.includes(context.originalText)) {
        console.log(`🎯 Found element by original text: "${context.originalText}"`);
        return {
          success: true,
          element,
          method: 'original text matching'
        };
      }
    }
  }
  
  // Strategy 2: Exact text content matching
  if (context.textContent) {
    for (const element of elements) {
      if (element.textContent && element.textContent.trim() === context.textContent.trim()) {
        console.log(`🎯 Found element by exact text content`);
        return {
          success: true,
          element,
          method: 'exact text content matching'
        };
      }
    }
  }
  
  // Strategy 3: Position-based selection
  if (context.position !== undefined && context.position >= 0 && context.position < elements.length) {
    console.log(`🎯 Using position-based selection: index ${context.position}`);
    return {
      success: true,
      element: elements[context.position],
      method: `position ${context.position}`
    };
  }
  
  // Strategy 4: Attribute matching
  if (context.attributes) {
    for (const element of elements) {
      const matches = Object.entries(context.attributes).every(([key, value]) => {
        return element.getAttribute(key) === value;
      });
      
      if (matches) {
        console.log(`🎯 Found element by attribute matching`);
        return {
          success: true,
          element,
          method: 'attribute matching'
        };
      }
    }
  }
  
  // Strategy 5: Parent context matching
  if (context.parentContext) {
    for (const element of elements) {
      const parent = element.parentElement;
      if (parent && parent.matches(context.parentContext)) {
        console.log(`🎯 Found element by parent context: ${context.parentContext}`);
        return {
          success: true,
          element,
          method: 'parent context matching'
        };
      }
    }
  }
  
  // Strategy 6: First element fallback (for non-text actions)
  if (!actionType.includes('text') && !actionType.includes('Text')) {
    console.log(`🎯 Using first element for non-text action: ${actionType}`);
    return {
      success: true,
      element: elements[0],
      method: 'first element fallback'
    };
  }
  
  // Strategy 7: Most visible element (has content and is not hidden)
  const visibleElements = elements.filter(el => {
    const htmlEl = el as HTMLElement;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           htmlEl.offsetWidth > 0 && 
           htmlEl.offsetHeight > 0;
  });
  
  if (visibleElements.length === 1) {
    console.log(`🎯 Found unique visible element`);
    return {
      success: true,
      element: visibleElements[0],
      method: 'visibility filtering'
    };
  }
  
  if (visibleElements.length > 0) {
    // Use the element with the most text content
    const elementWithMostContent = visibleElements.reduce((prev, current) => {
      const prevContent = prev.textContent?.trim().length || 0;
      const currentContent = current.textContent?.trim().length || 0;
      return currentContent > prevContent ? current : prev;
    });
    
    console.log(`🎯 Using element with most content`);
    return {
      success: true,
      element: elementWithMostContent,
      method: 'content length preference'
    };
  }
  
  console.warn(`❌ Could not disambiguate elements`);
  return {
    success: false,
    element: null,
    method: 'no disambiguation method worked'
  };
}

/**
 * Creates targeting context from various sources
 */
export function createTargetingContext(
  originalText?: string,
  elementData?: any,
  actionConfig?: any
): TargetingContext {
  const context: TargetingContext = {};
  
  if (originalText) {
    context.originalText = originalText;
  }
  
  if (elementData?.text) {
    context.textContent = elementData.text;
  }
  
  if (elementData?.attributes) {
    context.attributes = elementData.attributes;
  }
  
  if (elementData?.position?.indexInParent !== undefined) {
    context.position = elementData.position.indexInParent;
  }
  
  if (elementData?.parent) {
    context.parentContext = `[data-element-id="${elementData.parent}"]`;
  }
  
  if (actionConfig?.originalText) {
    context.originalText = actionConfig.originalText;
  }
  
  return context;
}

/**
 * Validates if a targeting result is suitable for the intended action
 */
export function validateTargeting(
  result: TargetingResult,
  actionType: string,
  requireUnique: boolean = true
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!result.success || !result.element) {
    return {
      valid: false,
      warnings: ['No element could be targeted']
    };
  }
  
  if (requireUnique && result.elements.length > 1 && !result.fallbackUsed) {
    warnings.push(`Multiple elements (${result.elements.length}) match the selector, but no disambiguation was used`);
  }
  
  if (result.fallbackUsed) {
    warnings.push('Fallback targeting method was used - consider using a more specific selector');
  }
  
  if (result.strategy && result.strategy.reliability < 0.5) {
    warnings.push('Low reliability selector was used - targeting may be unstable');
  }
  
  // Action-specific validations
  if (actionType.includes('text') || actionType.includes('Text')) {
    if (!result.element.textContent || result.element.textContent.trim().length === 0) {
      warnings.push('Target element has no text content for text-based action');
    }
  }
  
  if (actionType.includes('hide') || actionType.includes('show')) {
    const style = window.getComputedStyle(result.element);
    if (style.display === 'none' && actionType.includes('hide')) {
      warnings.push('Element is already hidden');
    }
    if (style.display !== 'none' && actionType.includes('show')) {
      warnings.push('Element is already visible');
    }
  }
  
  return {
    valid: true,
    warnings
  };
}

/**
 * Converts legacy selector format to targeting strategies with combo class detection
 */
export function legacySelectorToStrategies(selector: string): TargetingStrategy[] {
  const strategies: TargetingStrategy[] = [];
  
  // Parse the selector to determine its type and complexity
  if (selector.startsWith('#')) {
    strategies.push({
      selector,
      type: 'id',
      reliability: 0.9,
      description: 'Legacy ID selector',
      isUnique: false // Unknown without validation
    });
  } else if (selector.includes('.')) {
    // Enhanced class selector parsing for combo classes
    const classMatches = selector.match(/\.[\w-]+/g);
    const hasMultipleClasses = classMatches && classMatches.length > 1;
    
    if (hasMultipleClasses) {
      // This is a combo class selector
      strategies.push({
        selector,
        type: 'class',
        reliability: 0.85, // Higher reliability for combo classes
        description: `Legacy combo class selector (${classMatches.length} classes)`,
        isUnique: false
      });
      
      // Also add individual class strategies as fallbacks
      classMatches.forEach((classMatch, index) => {
        const tagMatch = selector.match(/^(\w+)/);
        const tag = tagMatch ? tagMatch[1] : '';
        const individualSelector = `${tag}${classMatch}`;
        
        strategies.push({
          selector: individualSelector,
          type: 'class',
          reliability: 0.6 - (index * 0.1), // Decreasing reliability for each class
          description: `Legacy individual class from combo (${classMatch})`,
          isUnique: false
        });
      });
    } else {
      // Single class selector
      strategies.push({
        selector,
        type: 'class',
        reliability: 0.7,
        description: 'Legacy single class selector',
        isUnique: false
      });
    }
  } else if (selector.includes('[') && selector.includes(']')) {
    strategies.push({
      selector,
      type: 'attribute',
      reliability: 0.6,
      description: 'Legacy attribute selector',
      isUnique: false
    });
  } else if (selector.includes(':nth-child')) {
    strategies.push({
      selector,
      type: 'nth-child',
      reliability: 0.8,
      description: 'Legacy nth-child selector',
      isUnique: false
    });
  } else if (selector.includes(':nth-of-type')) {
    strategies.push({
      selector,
      type: 'nth-of-type',
      reliability: 0.75,
      description: 'Legacy nth-of-type selector',
      isUnique: false
    });
  } else {
    strategies.push({
      selector,
      type: 'path',
      reliability: 0.5,
      description: 'Legacy generic selector',
      isUnique: false
    });
  }
  
  return strategies;
}

/**
 * Enhanced element targeting for workflow actions
 */
export function targetElementForAction(
  elementData: any,
  actionConfig: any,
  actionType: string
): TargetingResult {
  let strategies: TargetingStrategy[] = [];
  
  // Use enhanced selector strategies if available
  if (elementData?.selectorStrategies) {
    strategies = elementData.selectorStrategies;
  } else if (elementData?.selector) {
    // Convert legacy selector to strategies
    strategies = legacySelectorToStrategies(elementData.selector);
  } else if (actionConfig?.selector) {
    // Convert action config selector to strategies
    strategies = legacySelectorToStrategies(actionConfig.selector);
  }
  
  if (strategies.length === 0) {
    return {
      success: false,
      element: null,
      elements: [],
      strategy: null,
      message: 'No targeting strategies available'
    };
  }
  
  // Create targeting context
  const context = createTargetingContext(
    actionConfig?.originalText,
    elementData,
    actionConfig
  );
  
  // Resolve the element
  const result = resolveElement(strategies, context, actionType);
  
  // Validate the result
  const validation = validateTargeting(result, actionType);
  
  if (validation.warnings.length > 0) {
    console.warn('🎯 Targeting warnings:', validation.warnings);
  }
  
  return result;
} 