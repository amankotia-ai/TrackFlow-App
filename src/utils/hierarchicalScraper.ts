import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SelectorStrategy {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type' | 'unique-path' | 'context';
  reliability: number; // 0-1 score
  description: string;
  isUnique: boolean;
}

export interface HierarchicalElement {
  id: string; // unique identifier
  tag: string;
  text: string;
  directText: string; // only direct text, not from children
  selector: string; // primary selector (most reliable)
  selectorStrategies: SelectorStrategy[]; // multiple targeting options
  uniqueSelector: string; // guaranteed unique selector
  attributes?: Record<string, string>;
  children: HierarchicalElement[];
  parent?: string; // parent element ID
  depth: number;
  isContainer: boolean;
  hasContent: boolean; // whether element has meaningful content
  elementType: 'container' | 'content' | 'interactive' | 'media' | 'structure';
  position?: {
    indexInParent: number;
    indexOfType: number;
    totalSiblings: number;
    totalSiblingsOfType: number;
  };
}

export interface HierarchicalScrapingResult {
  success: boolean;
  data?: HierarchicalElement[];
  flatData?: HierarchicalElement[]; // flattened version for compatibility
  error?: string;
  url: string;
  timestamp: Date;
  debugInfo?: {
    htmlLength: number;
    totalElements: number;
    maxDepth: number;
    containerElements: number;
    contentElements: number;
  };
}

/**
 * Enhanced hierarchical scraper that maintains DOM tree structure
 */
export async function scrapeWebpageHierarchical(url: string): Promise<HierarchicalScrapingResult> {
  try {
    // Validate URL
    if (!url || !url.trim()) {
      return {
        success: false,
        error: 'URL is required',
        url: url,
        timestamp: new Date()
      };
    }

    // Ensure URL has protocol
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = `https://${url}`;
    }

    console.log(`Starting hierarchical scraping for: ${targetUrl}`);

    // Fetch HTML
    const response = await axios.get(targetUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 10,
      validateStatus: (status) => status < 400
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log(`HTML received, length: ${html.length}`);

    // Remove noise elements
    $('script, style, noscript, iframe, embed, object, meta, link, head').remove();

    let elementIdCounter = 0;
    const elementMap = new Map<string, HierarchicalElement>();

    // Find main content containers
    const mainContentSelectors = [
      'main', 'article', '#main', '#content', '.main', '.content',
      '.container', '.wrapper', 'body'
    ];

    let rootElement = $('body');
    for (const selector of mainContentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        rootElement = element as any;
        break;
      }
    }

    function getElementType(tag: string, attributes: Record<string, string>, text: string): HierarchicalElement['elementType'] {
      // Structure elements
      if (['html', 'body', 'header', 'footer', 'nav', 'main', 'aside'].includes(tag)) {
        return 'structure';
      }
      
      // Container elements
      if (['div', 'section', 'article', 'aside', 'figure', 'blockquote'].includes(tag)) {
        return 'container';
      }
      
      // Interactive elements
      if (['button', 'a', 'input', 'textarea', 'select', 'form'].includes(tag)) {
        return 'interactive';
      }
      
      // Media elements
      if (['img', 'video', 'audio', 'canvas', 'svg'].includes(tag)) {
        return 'media';
      }
      
      // Content elements
      return 'content';
    }

    function generateUniqueSelectors(element: any, $: cheerio.CheerioAPI, elementId: string, position: any): SelectorStrategy[] {
      const strategies: SelectorStrategy[] = [];
      const $el = $(element);
      const tag = element.name;
      
      // Strategy 1: ID-based selector (most reliable if unique)
      const id = $el.attr('id');
      if (id && id.trim()) {
        const idSelector = `#${id}`;
        const matches = $(idSelector).length;
        strategies.push({
          selector: idSelector,
          type: 'id',
          reliability: matches === 1 ? 1.0 : 0.5,
          description: `ID selector - ${matches} match${matches !== 1 ? 'es' : ''}`,
          isUnique: matches === 1
        });
      }
      
        // Strategy 2: Enhanced class-based selectors with combo class support
  const className = $el.attr('class');
  if (className && className.trim()) {
    const classes = className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      // Strategy 2a: Single class selectors
      classes.forEach((cls, index) => {
        const classSelector = `${tag}.${cls}`;
        const matches = $(classSelector).length;
        
        strategies.push({
          selector: classSelector,
          type: 'class',
          reliability: matches === 1 ? 0.9 : Math.max(0.3, 1 / matches),
          description: `Single class selector (.${cls}) - ${matches} match${matches !== 1 ? 'es' : ''}`,
          isUnique: matches === 1
        });
      });
      
      // Strategy 2b: Combo class selectors (multiple classes)
      if (classes.length > 1) {
        // Try all combinations of 2 classes
        for (let i = 0; i < classes.length - 1; i++) {
          for (let j = i + 1; j < classes.length; j++) {
            const comboSelector = `${tag}.${classes[i]}.${classes[j]}`;
            const matches = $(comboSelector).length;
            
            strategies.push({
              selector: comboSelector,
              type: 'class',
              reliability: matches === 1 ? 0.95 : Math.max(0.4, 1 / matches),
              description: `Combo class selector (.${classes[i]}.${classes[j]}) - ${matches} match${matches !== 1 ? 'es' : ''}`,
              isUnique: matches === 1
            });
          }
        }
        
        // Strategy 2c: All classes combined (most specific)
        const allClassesSelector = `${tag}.${classes.join('.')}`;
        const allMatches = $(allClassesSelector).length;
        
        strategies.push({
          selector: allClassesSelector,
          type: 'class',
          reliability: allMatches === 1 ? 0.98 : Math.max(0.5, 1 / allMatches),
          description: `All classes selector (.${classes.join('.')}) - ${allMatches} match${allMatches !== 1 ? 'es' : ''}`,
          isUnique: allMatches === 1
        });
      }
      
      // Strategy 2d: Class + position selectors (for non-unique class matches)
      const primaryClassSelector = `${tag}.${classes[0]}`;
      const primaryMatches = $(primaryClassSelector).length;
      
      if (primaryMatches > 1) {
        const nthChildSelector = `${primaryClassSelector}:nth-child(${position.indexInParent + 1})`;
        const nthMatches = $(nthChildSelector).length;
        strategies.push({
          selector: nthChildSelector,
          type: 'nth-child',
          reliability: nthMatches === 1 ? 0.8 : 0.4,
          description: `Primary class + position (.${classes[0]}:nth-child(${position.indexInParent + 1})) - ${nthMatches} match${nthMatches !== 1 ? 'es' : ''}`,
          isUnique: nthMatches === 1
        });
        
        // Also try with nth-of-type for better reliability
        const nthOfTypeSelector = `${primaryClassSelector}:nth-of-type(${position.indexOfType + 1})`;
        const nthOfTypeMatches = $(nthOfTypeSelector).length;
        strategies.push({
          selector: nthOfTypeSelector,
          type: 'nth-of-type',
          reliability: nthOfTypeMatches === 1 ? 0.75 : 0.35,
          description: `Primary class + nth-of-type (.${classes[0]}:nth-of-type(${position.indexOfType + 1})) - ${nthOfTypeMatches} match${nthOfTypeMatches !== 1 ? 'es' : ''}`,
          isUnique: nthOfTypeMatches === 1
        });
      }
    }
  }
      
      // Strategy 3: Attribute-based selectors
      const attributes = ['data-testid', 'data-cy', 'data-test', 'name', 'title', 'alt', 'role'];
      for (const attr of attributes) {
        const value = $el.attr(attr);
        if (value && value.trim()) {
          const attrSelector = `[${attr}="${value}"]`;
          const matches = $(attrSelector).length;
          
          strategies.push({
            selector: attrSelector,
            type: 'attribute',
            reliability: matches === 1 ? 0.8 : Math.max(0.2, 1 / matches),
            description: `${attr} attribute - ${matches} match${matches !== 1 ? 'es' : ''}`,
            isUnique: matches === 1
          });
        }
      }
      
      // Strategy 4: nth-of-type selector (unique within parent for same tag)
      if (position.totalSiblingsOfType > 1) {
        const nthOfTypeSelector = `${tag}:nth-of-type(${position.indexOfType + 1})`;
        strategies.push({
          selector: nthOfTypeSelector,
          type: 'nth-of-type',
          reliability: 0.6,
          description: `nth-of-type selector - position ${position.indexOfType + 1} of ${position.totalSiblingsOfType}`,
          isUnique: false // Not globally unique, but unique within parent
        });
      }
      
      // Strategy 5: Full path selector (guaranteed unique)
      const pathSelector = generateFullPathSelector(element, $);
      strategies.push({
        selector: pathSelector,
        type: 'unique-path',
        reliability: 0.7,
        description: 'Full path selector - guaranteed unique',
        isUnique: true
      });
      
      // Strategy 6: Context-based selector (using parent context)
      const contextSelector = generateContextSelector(element, $);
      if (contextSelector) {
        const matches = $(contextSelector).length;
        strategies.push({
          selector: contextSelector,
          type: 'context',
          reliability: matches === 1 ? 0.75 : Math.max(0.3, 1 / matches),
          description: `Context-based selector - ${matches} match${matches !== 1 ? 'es' : ''}`,
          isUnique: matches === 1
        });
      }
      
      // Strategy 7: Data-element-id selector (custom attribute for guaranteed uniqueness)
      const uniqueDataSelector = `[data-element-id="${elementId}"]`;
      strategies.push({
        selector: uniqueDataSelector,
        type: 'attribute',
        reliability: 1.0,
        description: 'Unique data attribute - guaranteed unique',
        isUnique: true
      });
      
      return strategies.sort((a, b) => {
        // Prioritize unique selectors, then by reliability
        if (a.isUnique && !b.isUnique) return -1;
        if (!a.isUnique && b.isUnique) return 1;
        return b.reliability - a.reliability;
      });
    }

    function generateFullPathSelector(element: any, $: cheerio.CheerioAPI): string {
      const path: string[] = [];
      let current = element;
      
      while (current && current.name !== 'html' && current.name !== 'body') {
        const tag = current.name;
        const parent = current.parent;
        
        if (parent && parent.type === 'tag') {
          const siblings = $(parent).children(tag);
          const index = siblings.index(current) + 1;
          path.unshift(`${tag}:nth-child(${index})`);
        } else {
          path.unshift(tag);
        }
        
        current = parent;
      }
      
      return `body > ${path.join(' > ')}`;
    }

    function generateContextSelector(element: any, $: cheerio.CheerioAPI): string | null {
      const $el = $(element);
      const tag = element.name;
      const parent = element.parent;
      
      if (!parent || parent.type !== 'tag') return null;
      
      const $parent = $(parent);
      const parentTag = parent.name;
      const parentClass = $parent.attr('class');
      const parentId = $parent.attr('id');
      
      // Try parent ID + child selector
      if (parentId) {
        return `#${parentId} > ${tag}`;
      }
      
      // Try parent class + child selector
      if (parentClass) {
        const firstClass = parentClass.split(' ')[0];
        const siblings = $parent.children(tag);
        const index = siblings.index(element) + 1;
        return `${parentTag}.${firstClass} > ${tag}:nth-child(${index})`;
      }
      
      return null;
    }

    function calculateElementPosition(element: any, $: cheerio.CheerioAPI): any {
      const parent = element.parent;
      if (!parent || parent.type !== 'tag') {
        return {
          indexInParent: 0,
          indexOfType: 0,
          totalSiblings: 1,
          totalSiblingsOfType: 1
        };
      }
      
      const $parent = $(parent);
      const allSiblings = $parent.children();
      const siblingsOfType = $parent.children(element.name);
      
      return {
        indexInParent: allSiblings.index(element),
        indexOfType: siblingsOfType.index(element),
        totalSiblings: allSiblings.length,
        totalSiblingsOfType: siblingsOfType.length
      };
    }

    function buildHierarchy(element: any, parentId?: string, depth: number = 0): HierarchicalElement | null {
      const tag = element.name;
      if (!tag || element.type !== 'tag') return null;

      const $el = $(element);
      const id = `element-${++elementIdCounter}`;
      
      // Calculate position information
      const position = calculateElementPosition(element, $);
      
      // Get all text including children
      const allText = $el.text().trim();
      
      // Get only direct text (not from children)
      const directText = $el.contents()
        .filter((_, node) => node.type === 'text')
        .text()
        .trim();

      // Skip elements with no meaningful content and no children
      const hasChildren = $el.children().length > 0;
      const hasContent = allText.length > 0 || hasChildren;
      
      if (!hasContent && !['header', 'footer', 'nav', 'main', 'section'].includes(tag)) {
        return null;
      }

      // Extract attributes
      const attributes: Record<string, string> = {};
      const attrs = element.attribs || {};
      Object.entries(attrs).forEach(([key, value]) => {
        if (['id', 'class', 'href', 'src', 'alt', 'title', 'role'].includes(key) && typeof value === 'string') {
          attributes[key] = value;
        }
      });

      // Generate multiple selector strategies
      const selectorStrategies = generateUniqueSelectors(element, $, id, position);
      
      // Primary selector is the most reliable one
      const primarySelector = selectorStrategies[0]?.selector || tag;
      
      // Guaranteed unique selector (either the best unique one or full path)
      const uniqueStrategy = selectorStrategies.find(s => s.isUnique) || selectorStrategies.find(s => s.type === 'unique-path');
      const uniqueSelector = uniqueStrategy?.selector || generateFullPathSelector(element, $);

      const isContainer = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'figure'].includes(tag);
      const elementType = getElementType(tag, attributes, allText);

      const hierarchicalElement: HierarchicalElement = {
        id,
        tag,
        text: allText,
        directText,
        selector: primarySelector,
        selectorStrategies,
        uniqueSelector,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        children: [],
        parent: parentId,
        depth,
        isContainer,
        hasContent: allText.length > 3 || hasChildren,
        elementType,
        position
      };

      // Recursively process children
      $el.children().each((_, child) => {
        if (child.type === 'tag') {
          const childElement = buildHierarchy(child, id, depth + 1);
          if (childElement) {
            hierarchicalElement.children.push(childElement);
          }
        }
      });

      // Store in map for reference
      elementMap.set(id, hierarchicalElement);

      return hierarchicalElement;
    }

    // Build the hierarchy starting from the root
    const rootElements: HierarchicalElement[] = [];
    rootElement.children().each((_, child) => {
      if (child.type === 'tag') {
        const element = buildHierarchy(child);
        if (element) {
          rootElements.push(element);
        }
      }
    });

    // Create flattened version for compatibility
    const flatData: HierarchicalElement[] = [];
    function flattenHierarchy(elements: HierarchicalElement[]) {
      elements.forEach(element => {
        flatData.push(element);
        if (element.children.length > 0) {
          flattenHierarchy(element.children);
        }
      });
    }
    flattenHierarchy(rootElements);

    // Calculate stats
    const maxDepth = Math.max(...flatData.map(el => el.depth));
    const containerElements = flatData.filter(el => el.isContainer).length;
    const contentElements = flatData.filter(el => !el.isContainer && el.hasContent).length;

    console.log(`Hierarchical scraping completed: ${rootElements.length} root elements, ${flatData.length} total elements`);

    return {
      success: true,
      data: rootElements,
      flatData,
      url: targetUrl,
      timestamp: new Date(),
      debugInfo: {
        htmlLength: html.length,
        totalElements: flatData.length,
        maxDepth,
        containerElements,
        contentElements
      }
    };

  } catch (error) {
    console.error('Hierarchical scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'URL not found. Please check the URL and try again.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please check the URL and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
      url: url,
      timestamp: new Date()
    };
  }
} 