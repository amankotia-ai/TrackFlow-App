import * as cheerio from 'cheerio';

export interface SelectorStrategy {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type';
  reliability: number; // 0-1 score
  description: string;
}

export interface ElementSelector {
  element: any; // Using any to avoid cheerio type issues
  strategies: SelectorStrategy[];
  bestSelector: string;
  unique: boolean;
}

/**
 * Generates multiple CSS selector strategies for an element
 */
export function generateSelectorStrategies(
  element: any, 
  $: cheerio.CheerioAPI
): SelectorStrategy[] {
  const strategies: SelectorStrategy[] = [];
  const $element = $(element);
  
  // Strategy 1: ID-based selector (most reliable)
  const id = $element.attr('id');
  if (id && id.trim()) {
    const idSelector = `#${id}`;
    const matches = $(idSelector).length;
    strategies.push({
      selector: idSelector,
      type: 'id',
      reliability: matches === 1 ? 1.0 : 0.5,
      description: `ID selector - ${matches} match${matches !== 1 ? 'es' : ''}`
    });
  }
  
  // Strategy 2: Class-based selector
  const className = $element.attr('class');
  if (className && className.trim()) {
    const classes = className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      // Try different class combinations
      for (let i = 0; i < Math.min(classes.length, 3); i++) {
        const classCombination = classes.slice(0, i + 1).join('.');
        const classSelector = `${element.name}.${classCombination}`;
        const matches = $(classSelector).length;
        
        if (matches > 0) {
          strategies.push({
            selector: classSelector,
            type: 'class',
            reliability: matches === 1 ? 0.9 : Math.max(0.3, 1 / matches),
            description: `Class selector - ${matches} match${matches !== 1 ? 'es' : ''}`
          });
        }
      }
    }
  }
  
  // Strategy 3: Attribute-based selector
  const attributes = ['data-testid', 'data-cy', 'data-test', 'name', 'title', 'alt'];
  for (const attr of attributes) {
    const value = $element.attr(attr);
    if (value && value.trim()) {
      const attrSelector = `[${attr}="${value}"]`;
      const matches = $(attrSelector).length;
      
      if (matches > 0) {
        strategies.push({
          selector: attrSelector,
          type: 'attribute',
          reliability: matches === 1 ? 0.8 : Math.max(0.2, 1 / matches),
          description: `${attr} attribute - ${matches} match${matches !== 1 ? 'es' : ''}`
        });
      }
    }
  }
  
  // Strategy 4: Path-based selector (nth-child)
  const pathSelector = generatePathSelector(element, $);
  if (pathSelector) {
    const matches = $(pathSelector).length;
    strategies.push({
      selector: pathSelector,
      type: 'path',
      reliability: matches === 1 ? 0.7 : Math.max(0.1, 1 / matches),
      description: `Path selector - ${matches} match${matches !== 1 ? 'es' : ''}`
    });
  }
  
  // Strategy 5: nth-of-type selector
  const nthOfTypeSelector = generateNthOfTypeSelector(element, $);
  if (nthOfTypeSelector) {
    const matches = $(nthOfTypeSelector).length;
    strategies.push({
      selector: nthOfTypeSelector,
      type: 'nth-of-type',
      reliability: matches === 1 ? 0.6 : Math.max(0.1, 1 / matches),
      description: `nth-of-type selector - ${matches} match${matches !== 1 ? 'es' : ''}`
    });
  }
  
  return strategies.sort((a, b) => b.reliability - a.reliability);
}

/**
 * Generates a path-based selector using nth-child
 */
function generatePathSelector(element: any, $: cheerio.CheerioAPI): string {
  const path: string[] = [];
  let current = element;
  
  while (current && current.name !== 'html') {
    const tagName = current.name;
    const parent = current.parent;
    
    if (parent && parent.type === 'tag') {
      const siblings = $(parent).children(tagName);
      const index = siblings.index(current) + 1;
      path.unshift(`${tagName}:nth-child(${index})`);
    } else {
      path.unshift(tagName);
    }
    
    current = parent;
  }
  
  return path.join(' > ');
}

/**
 * Generates an nth-of-type selector
 */
function generateNthOfTypeSelector(element: any, $: cheerio.CheerioAPI): string {
  const tagName = element.name;
  const parent = element.parent;
  
  if (parent && parent.type === 'tag') {
    const siblings = $(parent).children(tagName);
    const index = siblings.index(element) + 1;
    return `${tagName}:nth-of-type(${index})`;
  }
  
  return tagName;
}

/**
 * Validates a selector against the DOM structure
 */
export function validateSelector(
  selector: string, 
  $: cheerio.CheerioAPI, 
  targetElement: any
): { valid: boolean; matches: number; unique: boolean; error?: string } {
  try {
    const matches = $(selector);
    const matchCount = matches.length;
    const isTargetInMatches = matches.toArray().some(el => el === targetElement);
    
    return {
      valid: matchCount > 0 && isTargetInMatches,
      matches: matchCount,
      unique: matchCount === 1,
      error: matchCount === 0 ? 'No elements found' : 
             !isTargetInMatches ? 'Selector matches different elements' : undefined
    };
  } catch (error) {
    return {
      valid: false,
      matches: 0,
      unique: false,
      error: `Invalid selector: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Creates fallback selectors for robustness
 */
export function createFallbackSelectors(
  element: any, 
  $: cheerio.CheerioAPI
): string[] {
  const fallbacks: string[] = [];
  const $element = $(element);
  
  // Fallback 1: Tag + class combination
  const className = $element.attr('class');
  if (className) {
    const classes = className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      fallbacks.push(`${element.name}.${classes[0]}`);
    }
  }
  
  // Fallback 2: Tag + attribute
  const attributes = ['data-testid', 'data-cy', 'name', 'title'];
  for (const attr of attributes) {
    const value = $element.attr(attr);
    if (value) {
      fallbacks.push(`${element.name}[${attr}="${value}"]`);
    }
  }
  
  // Fallback 3: Parent context
  const parent = element.parent;
  if (parent && parent.type === 'tag') {
    const parentTag = parent.name;
    const parentClass = $(parent).attr('class');
    if (parentClass) {
      const parentClasses = parentClass.split(' ').filter(c => c.trim());
      if (parentClasses.length > 0) {
        fallbacks.push(`${parentTag}.${parentClasses[0]} > ${element.name}`);
      }
    }
  }
  
  // Fallback 4: Text content based (for elements with unique text)
  const text = $element.text().trim();
  if (text && text.length < 50) {
    fallbacks.push(`${element.name}:contains("${text.substring(0, 20)}")`);
  }
  
  return fallbacks.filter((selector, index, array) => array.indexOf(selector) === index);
}

/**
 * Gets the best selector for an element
 */
export function getBestSelector(
  element: any, 
  $: cheerio.CheerioAPI
): { selector: string; reliability: number; fallbacks: string[] } {
  const strategies = generateSelectorStrategies(element, $);
  const fallbacks = createFallbackSelectors(element, $);
  
  // Find the most reliable unique selector
  const uniqueStrategy = strategies.find(s => 
    validateSelector(s.selector, $, element).unique
  );
  
  if (uniqueStrategy) {
    return {
      selector: uniqueStrategy.selector,
      reliability: uniqueStrategy.reliability,
      fallbacks
    };
  }
  
  // If no unique selector, return the most reliable one
  const bestStrategy = strategies[0];
  if (bestStrategy) {
    return {
      selector: bestStrategy.selector,
      reliability: bestStrategy.reliability,
      fallbacks
    };
  }
  
  // Last resort: tag name
  return {
    selector: element.name,
    reliability: 0.1,
    fallbacks
  };
} 