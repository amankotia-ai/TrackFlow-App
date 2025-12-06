/**
 * Selector Optimizer for Workflow Execution
 * Provides consistent, reliable selector generation and validation for workflow target fields
 */

export interface SelectorMetadata {
  selector: string;
  description: string;
  elementInfo: {
    tag: string;
    text: string;
    hasId: boolean;
    hasClass: boolean;
    elementType: string;
    isUnique: boolean;
  };
  reliability: number;
  executionHints: string[];
  isValid: boolean;
  warnings: string[];
}

export interface OptimizationOptions {
  preferUnique?: boolean;
  maxComplexity?: number;
  includePosition?: boolean;
  contextText?: string;
}

/**
 * Generates an execution-optimized selector from element data
 */
export function optimizeSelectorForExecution(
  elementData: any,
  options: OptimizationOptions = {}
): SelectorMetadata {
  const {
    preferUnique = true,
    maxComplexity = 5,
    includePosition = false,
    contextText
  } = options;

  let bestSelector = '';
  let reliability = 0;
  const warnings: string[] = [];
  const executionHints: string[] = [];

  // Strategy 1: ID selector (highest priority if stable)
  if (elementData.attributes?.id && isStableIdentifier(elementData.attributes.id)) {
    bestSelector = `#${elementData.attributes.id}`;
    reliability = 0.95;
    executionHints.push('ID-based selector provides highest reliability');
  }
  
  // Strategy 2: Stable class selector
  else if (elementData.attributes?.class) {
    const classes = elementData.attributes.class.split(' ').filter((cls: string) => cls.trim());
         const stableClasses = classes.filter((cls: string) => isStableIdentifier(cls));
     
     if (stableClasses.length > 0) {
       // Use 1-2 most specific stable classes
       const selectedClasses = stableClasses.slice(0, 2);
      bestSelector = `.${selectedClasses.join('.')}`;
      reliability = stableClasses.length === 1 ? 0.8 : 0.85;
      executionHints.push(`Stable class selector using: ${selectedClasses.join(', ')}`);
    } else if (classes.length > 0) {
      bestSelector = `.${classes[0]}`;
      reliability = 0.6;
      warnings.push('Using potentially dynamic class name');
      executionHints.push('Consider using data attributes for more reliable targeting');
    }
  }
  
  // Strategy 3: Data attributes
  else if (elementData.attributes) {
    const testIdAttrs = ['data-testid', 'data-cy', 'data-test', 'data-qa'];
    const semanticAttrs = ['name', 'aria-label', 'title'];
    
    for (const attr of [...testIdAttrs, ...semanticAttrs]) {
      if (elementData.attributes[attr]) {
        bestSelector = `[${attr}="${elementData.attributes[attr]}"]`;
        reliability = testIdAttrs.includes(attr) ? 0.9 : 0.75;
        executionHints.push(`Using ${attr} attribute for reliable targeting`);
        break;
      }
    }
  }
  
  // Strategy 4: Enhanced selector strategies
  if (!bestSelector && elementData.selectorStrategies?.length > 0) {
    const uniqueStrategy = elementData.selectorStrategies.find((s: any) => s.isUnique);
    const bestStrategy = uniqueStrategy || elementData.selectorStrategies[0];
    
    bestSelector = bestStrategy.selector;
    reliability = bestStrategy.reliability || 0.7;
    executionHints.push(bestStrategy.description || 'Using generated selector strategy');
  }
  
  // Strategy 5: Fallback to primary selector
  if (!bestSelector) {
    bestSelector = elementData.selector || elementData.tag || 'div';
    reliability = 0.4;
    warnings.push('Using fallback selector - may not be reliable');
    executionHints.push('Consider adding more specific attributes to the target element');
  }

  // Validate selector complexity
  const complexity = calculateSelectorComplexity(bestSelector);
  if (complexity > maxComplexity) {
    warnings.push(`Selector complexity (${complexity}) exceeds recommended maximum (${maxComplexity})`);
    reliability *= 0.9;
  }

  // Add position-based hints if multiple siblings
  if (includePosition && elementData.position?.totalSiblingsOfType > 1) {
    executionHints.push(
      `Element is ${elementData.position.indexOfType + 1} of ${elementData.position.totalSiblingsOfType} similar elements - consider using originalText for disambiguation`
    );
    reliability *= 0.8;
  }

  // Context-specific hints
  if (elementData.elementType === 'content' && elementData.text) {
    executionHints.push('For text replacement actions, use the originalText field for better targeting');
  }

  if (elementData.elementType === 'interactive') {
    executionHints.push('Interactive elements should use stable identifiers when possible');
  }

  return {
    selector: bestSelector,
    description: generateSelectorDescription(bestSelector, elementData, reliability),
    elementInfo: {
      tag: elementData.tag || 'unknown',
      text: elementData.text?.substring(0, 50) || '',
      hasId: !!elementData.attributes?.id,
      hasClass: !!elementData.attributes?.class,
      elementType: elementData.elementType || 'unknown',
      isUnique: reliability > 0.8
    },
    reliability,
    executionHints,
    isValid: reliability > 0.3,
    warnings
  };
}

/**
 * Validates a selector for execution context
 */
export function validateSelectorForExecution(selector: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  try {
    // Test CSS validity
    document.querySelector(selector);
  } catch (error) {
    warnings.push('Invalid CSS selector syntax');
    return { isValid: false, warnings, suggestions };
  }

  // Check for potentially problematic patterns
  if (selector.includes(':hover') || selector.includes(':focus') || selector.includes(':active')) {
    warnings.push('Selector includes pseudo-classes that may not work in execution context');
    suggestions.push('Remove pseudo-classes and use base element selector');
  }

  if (selector.split(' ').length > 5) {
    warnings.push('Very complex selector may be fragile');
    suggestions.push('Simplify selector path for better reliability');
  }

  if (selector.match(/\[\w+\*=/) || selector.match(/\[\w+\^=/) || selector.match(/\[\w+\$=/)) {
    warnings.push('Complex attribute selectors may impact performance');
    suggestions.push('Use exact attribute matches when possible');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Creates execution-ready clipboard data
 */
export function createClipboardData(
  selectorMetadata: SelectorMetadata,
  source: string = 'DOM tree'
): any {
  return {
    selector: selectorMetadata.selector,
    description: selectorMetadata.description,
    elementInfo: selectorMetadata.elementInfo,
    reliability: selectorMetadata.reliability,
    executionHints: selectorMetadata.executionHints,
    warnings: selectorMetadata.warnings,
    source,
    timestamp: Date.now()
  };
}

// Helper functions

function isStableIdentifier(identifier: string): boolean {
  const unstablePatterns = [
    /^\d+$/, // Pure numbers
    /^[a-f0-9]{8,}$/, // Hash-like strings
    /^temp/i, // Temporary identifiers
    /^generated/i, // Generated identifiers
    /random|uuid|guid/i, // Random identifiers
    /^\w{1,2}$/, // Very short identifiers
    /hover|focus|active|disabled|selected|loading|error/i, // State classes
    /^(is-|has-|state-)/, // State prefixes
    /^(w-|h-|p-|m-|text-|bg-|border-)/i, // Utility classes (Tailwind-like)
  ];
  
  return !unstablePatterns.some(pattern => pattern.test(identifier));
}

function calculateSelectorComplexity(selector: string): number {
  let complexity = 0;
  
  // Count basic complexity factors
  complexity += (selector.match(/\s+/g) || []).length; // Descendant selectors
  complexity += (selector.match(/>/g) || []).length; // Child selectors
  complexity += (selector.match(/\+/g) || []).length; // Adjacent sibling selectors
  complexity += (selector.match(/~/g) || []).length; // General sibling selectors
  complexity += (selector.match(/\[.*?\]/g) || []).length; // Attribute selectors
  complexity += (selector.match(/::?\w+/g) || []).length; // Pseudo-classes/elements
  
  return complexity;
}

function generateSelectorDescription(
  selector: string, 
  elementData: any, 
  reliability: number
): string {
  const reliabilityText = reliability >= 0.9 ? 'Highly reliable' :
                         reliability >= 0.7 ? 'Reliable' :
                         reliability >= 0.5 ? 'Moderately reliable' :
                         'Low reliability';
  
  let typeDescription = '';
  if (selector.startsWith('#')) {
    typeDescription = 'ID selector';
  } else if (selector.startsWith('.')) {
    typeDescription = 'Class selector';
  } else if (selector.startsWith('[')) {
    typeDescription = 'Attribute selector';
  } else {
    typeDescription = 'Element selector';
  }
  
  return `${typeDescription} - ${reliabilityText} (${Math.round(reliability * 100)}%)`;
}

/**
 * Integration helper for copying optimized selectors
 */
export async function copyOptimizedSelector(
  elementData: any,
  options?: OptimizationOptions
): Promise<SelectorMetadata> {
  const metadata = optimizeSelectorForExecution(elementData, options);
  
  try {
    await navigator.clipboard.writeText(metadata.selector);
    
    // Store metadata globally for configuration panel integration
    const clipboardData = createClipboardData(metadata, 'Optimized');
    (window as any).trackflowClipboard = { 
      lastCopiedSelector: clipboardData 
    };
    
    console.log(`📋 Copied optimized selector: ${metadata.selector}`, metadata);
    return metadata;
  } catch (error) {
    console.error('Failed to copy optimized selector:', error);
    throw error;
  }
} 