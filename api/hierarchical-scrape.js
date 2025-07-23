import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Generate enhanced selectors with multiple strategies for unique targeting
 */
function generateEnhancedSelectors(element, $, elementId, position) {
  const strategies = [];
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
        // Try all combinations of 2 classes for better specificity
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
        
        // Strategy 2d: Try most specific class combinations first (utility classes last)
        const sortedClasses = classes.sort((a, b) => {
          // Prioritize longer, more descriptive class names
          // Deprioritize utility classes (short, common patterns)
          const utilityPatterns = /^(w-|h-|p-|m-|text-|bg-|flex|grid|block|inline|absolute|relative|z-)/;
          
          if (utilityPatterns.test(a) && !utilityPatterns.test(b)) return 1;
          if (!utilityPatterns.test(a) && utilityPatterns.test(b)) return -1;
          
          return b.length - a.length; // Longer names first
        });
        
        // Try combinations of the most specific classes
        if (sortedClasses.length >= 2) {
          const specificComboSelector = `${tag}.${sortedClasses[0]}.${sortedClasses[1]}`;
          const specificMatches = $(specificComboSelector).length;
          
          strategies.push({
            selector: specificComboSelector,
            type: 'class',
            reliability: specificMatches === 1 ? 0.96 : Math.max(0.45, 1 / specificMatches),
            description: `Specific combo selector (.${sortedClasses[0]}.${sortedClasses[1]}) - ${specificMatches} match${specificMatches !== 1 ? 'es' : ''}`,
            isUnique: specificMatches === 1
          });
        }
      }
      
      // Strategy 2e: Class + position selectors (for non-unique class matches)
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
  
  // Strategy 3: Full path selector (guaranteed unique)
  const pathSelector = generateFullPathSelector(element, $);
  strategies.push({
    selector: pathSelector,
    type: 'unique-path',
    reliability: 0.7,
    description: 'Full path selector - guaranteed unique',
    isUnique: true
  });
  
  // Strategy 4: Data-element-id selector (custom attribute for guaranteed uniqueness)
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

function generateFullPathSelector(element, $) {
  const path = [];
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

function calculateElementPosition(element, $) {
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

/**
 * Determine element type based on tag and content
 */
function getElementType(tag, attributes, text) {
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

/**
 * Build hierarchical element structure with enhanced targeting
 */
function buildHierarchy(element, $, parentId = null, depth = 0) {
  const tag = element.name;
  if (!tag || element.type !== 'tag') return null;

  const $el = $(element);
  const id = `element-${Math.random().toString(36).substr(2, 9)}`;
  
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
  const attributes = {};
  const attrs = element.attribs || {};
  Object.entries(attrs).forEach(([key, value]) => {
    if (['id', 'class', 'href', 'src', 'alt', 'title', 'role'].includes(key) && typeof value === 'string') {
      attributes[key] = value;
    }
  });

  // Generate enhanced selector strategies
  const selectorStrategies = generateEnhancedSelectors(element, $, id, position);
  
  // Primary selector is the most reliable one
  const primarySelector = selectorStrategies[0]?.selector || tag;
  
  // Guaranteed unique selector (either the best unique one or full path)
  const uniqueStrategy = selectorStrategies.find(s => s.isUnique) || selectorStrategies.find(s => s.type === 'unique-path');
  const uniqueSelector = uniqueStrategy?.selector || generateFullPathSelector(element, $);

  const isContainer = ['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'figure'].includes(tag);
  const elementType = getElementType(tag, attributes, allText);

  const hierarchicalElement = {
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
      const childElement = buildHierarchy(child, $, id, depth + 1);
      if (childElement) {
        hierarchicalElement.children.push(childElement);
      }
    }
  });

  return hierarchicalElement;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      message: 'TrackFlow Hierarchical Web Scraping API',
      status: 'online',
      timestamp: new Date().toISOString(),
      usage: 'POST with {"url": "https://example.com"}',
      description: 'Returns DOM tree structure with parent-child relationships'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }

    console.log(`🌳 Hierarchical scraping request for: ${url}`);

    // Ensure URL has protocol
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = `https://${url}`;
    }

    // Fetch HTML with timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), 30000);
    });

    const fetchPromise = axios.get(targetUrl, {
      timeout: 25000,
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

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const html = response.data;
    const $ = cheerio.load(html);

    console.log(`✅ HTML received, length: ${html.length}`);

    // Remove noise elements
    $('script, style, noscript, iframe, embed, object, meta, link, head').remove();

    // Find main content containers
    const mainContentSelectors = [
      'main', 'article', '#main', '#content', '.main', '.content',
      '.container', '.wrapper', 'body'
    ];

    let rootElement = $('body');
    for (const selector of mainContentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        rootElement = element;
        break;
      }
    }

    // Build the hierarchy starting from the root
    const rootElements = [];
    rootElement.children().each((_, child) => {
      if (child.type === 'tag') {
        const element = buildHierarchy(child, $);
        if (element) {
          rootElements.push(element);
        }
      }
    });

    // Create flattened version for compatibility
    const flatData = [];
    function flattenHierarchy(elements) {
      elements.forEach(element => {
        flatData.push(element);
        if (element.children.length > 0) {
          flattenHierarchy(element.children);
        }
      });
    }
    flattenHierarchy(rootElements);

    // Calculate stats
    const maxDepth = flatData.length > 0 ? Math.max(...flatData.map(el => el.depth)) : 0;
    const containerElements = flatData.filter(el => el.isContainer).length;
    const contentElements = flatData.filter(el => !el.isContainer && el.hasContent).length;

    console.log(`🌳 Hierarchical scraping completed: ${rootElements.length} root elements, ${flatData.length} total elements`);

    const result = {
      success: true,
      data: rootElements,
      flatData,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      debugInfo: {
        htmlLength: html.length,
        totalElements: flatData.length,
        maxDepth,
        containerElements,
        contentElements
      }
    };

    return res.json(result);

  } catch (error) {
    console.error('❌ Hierarchical scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage hierarchically';
    if (error.message) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'URL not found. Please check the URL and try again.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please check the URL and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      url: req.body.url || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
} 