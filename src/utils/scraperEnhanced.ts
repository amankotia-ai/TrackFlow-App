import axios from 'axios';
import * as cheerio from 'cheerio';
import { getBestSelector, generateSelectorStrategies, validateSelector } from './selectorGenerator';

/**
 * Generate a contextual nth-of-type selector with parent context
 */
function generateContextualNthSelector(element: any, $: cheerio.CheerioAPI): string {
  const tagName = element.name;
  const parent = element.parent;
  
  if (parent && parent.type === 'tag' && parent.name !== 'body') {
    const parentElement = $(parent);
    const parentSelector = getBestSelector(parent, $).selector;
    const siblings = parentElement.children(tagName);
    const index = siblings.index(element) + 1;
    
    if (index > 0) {
      return `${parentSelector} > ${tagName}:nth-of-type(${index})`;
    }
  }
  
  // Fallback to simple nth-of-type
  const allSiblings = $(`${tagName}`);
  const globalIndex = allSiblings.index(element) + 1;
  return `${tagName}:nth-of-type(${globalIndex})`;
}

export interface ScrapedElement {
  tag: string;
  text: string;
  selector?: string;
  attributes?: Record<string, string>;
  selectorStrategies?: Array<{
    selector: string;
    type: string;
    reliability: number;
    description: string;
  }>;
  fallbackSelectors?: string[];
  selectorReliability?: number;
  // Properties for duplicate element tracking
  nthPosition?: number;
  totalSimilar?: number;
  duplicateGroup?: boolean;
}

export interface ScrapingResult {
  success: boolean;
  data?: ScrapedElement[];
  error?: string;
  url: string;
  timestamp: Date;
  debugInfo?: {
    htmlLength: number;
    mainContentSelector: string;
    totalElements: number;
    filteredElements: number;
    uniqueTextGroups?: number;
  };
}

/**
 * Enhanced scraper that can handle JavaScript-heavy sites and complex layouts
 * @param url - The URL to scrape
 * @returns Promise<ScrapingResult> - The scraping result with extracted data
 */
export async function scrapeWebpageEnhanced(url: string): Promise<ScrapingResult> {
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

    console.log(`Starting enhanced scraping for: ${targetUrl}`);

    // Fetch HTML from the URL with enhanced headers
    const response = await axios.get(targetUrl, {
      timeout: 20000, // 20 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      maxRedirects: 10,
      validateStatus: (status) => status < 400
    });

    const html = response.data;
    const $ = cheerio.load(html);

    console.log(`HTML received, length: ${html.length}`);

    const textElements: ScrapedElement[] = [];

    // Remove noise elements
    $('script, style, noscript, iframe, embed, object, meta, link, head').remove();

    // Strategy 1: Focus on semantic content areas
    const semanticSelectors = [
      'main', 'article', 'section', '.content', '.main', '.container', 
      '.wrapper', '#content', '#main', '.page-content', '.post-content',
      '.entry-content', '.article-content', '.text-content'
    ];

    let mainContentSelector = 'body';
    for (const selector of semanticSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContentSelector = selector;
        console.log(`Found main content area: ${selector}`);
        break;
      }
    }

    // Strategy 2: Extract from main content area
    $(`${mainContentSelector} *`).each((_, el) => {
      const tag = el.type === 'tag' ? el.name : 'unknown';
      const text = $(el).text().trim();

      // Include elements with text content, including divs and other container elements
      if (text && text.length > 1) {
        const element = $(el);
        const attributes: Record<string, string> = {};
        
        // Extract all attributes
        const id = element.attr('id');
        const className = element.attr('class');
        const href = element.attr('href');
        const src = element.attr('src');
        const alt = element.attr('alt');
        const title = element.attr('title');
        
        if (id) attributes.id = id;
        if (className) attributes.class = className;
        if (href) attributes.href = href;
        if (src) attributes.src = src;
        if (alt) attributes.alt = alt;
        if (title) attributes.title = title;

        // Generate enhanced selectors using the new utility
        const selectorInfo = getBestSelector(el, $);
        const strategies = generateSelectorStrategies(el, $);
        
        // For divs and container elements, be more inclusive in what we consider "unique"
        // This allows us to capture divs with repeated content
        let isUnique = true;
        
        if (tag !== 'div' && tag !== 'section' && tag !== 'article') {
          // For non-container elements, use the existing uniqueness check
          const parentText = element.parent().text().trim();
          isUnique = text !== parentText || element.children().length === 0;
        }
        // For divs and container elements, always include them if they have text content

        if (isUnique) {
          textElements.push({
            tag,
            text,
            selector: selectorInfo.selector,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            selectorStrategies: strategies.map(s => ({
              selector: s.selector,
              type: s.type,
              reliability: s.reliability,
              description: s.description
            })),
            fallbackSelectors: selectorInfo.fallbacks,
            selectorReliability: selectorInfo.reliability
          });
        }
      }
    });

    console.log(`Strategy 2 extracted ${textElements.length} elements`);

    // Strategy 3: If not enough content, try entire body
    if (textElements.length < 10) {
      console.log('Strategy 3: Scraping entire body');
      $('body *').each((_, el) => {
        const tag = el.type === 'tag' ? el.name : 'unknown';
        const text = $(el).text().trim();

        if (text && text.length > 2) {
          const element = $(el);
          const attributes: Record<string, string> = {};
          
          const id = element.attr('id');
          const className = element.attr('class');
          const href = element.attr('href');
          
          if (id) attributes.id = id;
          if (className) attributes.class = className;
          if (href) attributes.href = href;

          // Generate enhanced selectors
          const selectorInfo = getBestSelector(el, $);
          const strategies = generateSelectorStrategies(el, $);

          textElements.push({
            tag,
            text,
            selector: selectorInfo.selector,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            selectorStrategies: strategies.map(s => ({
              selector: s.selector,
              type: s.type,
              reliability: s.reliability,
              description: s.description
            })),
            fallbackSelectors: selectorInfo.fallbacks,
            selectorReliability: selectorInfo.reliability
          });
        }
      });
    }

    // Strategy 4: Extract all visible text as fallback
    if (textElements.length < 5) {
      console.log('Strategy 4: Extracting all visible text');
      const allText = $('body').text().trim();
      if (allText && allText.length > 10) {
        const lines = allText.split('\n').filter(line => line.trim().length > 3);
        lines.forEach((line, index) => {
          textElements.push({
            tag: 'p',
            text: line.trim(),
            selector: `body > p:nth-of-type(${index + 1})`,
            attributes: undefined
          });
        });
      }
    }

    // Strategy 5: Look for specific content patterns
    if (textElements.length < 3) {
      console.log('Strategy 5: Looking for specific content patterns');
      
      // Look for headings
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const text = $(el).text().trim();
        if (text) {
          const selectorInfo = getBestSelector(el, $);
          const strategies = generateSelectorStrategies(el, $);
          
          textElements.push({
            tag: el.name,
            text,
            selector: selectorInfo.selector,
            attributes: undefined,
            selectorStrategies: strategies.map(s => ({
              selector: s.selector,
              type: s.type,
              reliability: s.reliability,
              description: s.description
            })),
            fallbackSelectors: selectorInfo.fallbacks,
            selectorReliability: selectorInfo.reliability
          });
        }
      });

      // Look for paragraphs
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          const selectorInfo = getBestSelector(el, $);
          const strategies = generateSelectorStrategies(el, $);
          
          textElements.push({
            tag: 'p',
            text,
            selector: selectorInfo.selector,
            attributes: undefined,
            selectorStrategies: strategies.map(s => ({
              selector: s.selector,
              type: s.type,
              reliability: s.reliability,
              description: s.description
            })),
            fallbackSelectors: selectorInfo.fallbacks,
            selectorReliability: selectorInfo.reliability
          });
        }
      });

      // Look for links
      $('a').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        if (text && href) {
          const selectorInfo = getBestSelector(el, $);
          const strategies = generateSelectorStrategies(el, $);
          
          textElements.push({
            tag: 'a',
            text,
            selector: selectorInfo.selector,
            attributes: { href },
            selectorStrategies: strategies.map(s => ({
              selector: s.selector,
              type: s.type,
              reliability: s.reliability,
              description: s.description
            })),
            fallbackSelectors: selectorInfo.fallbacks,
            selectorReliability: selectorInfo.reliability
          });
        }
      });
    }

    // Filter noise first
    const filteredElements = textElements.filter(element => {
      const noiseTags = ['script', 'style', 'meta', 'link', 'head', 'html', 'body'];
      return !noiseTags.includes(element.tag);
    });

    // Group elements by text content to detect duplicates
    const textGroups = new Map<string, ScrapedElement[]>();
    filteredElements.forEach(element => {
      const text = element.text.trim();
      if (!textGroups.has(text)) {
        textGroups.set(text, []);
      }
      textGroups.get(text)!.push(element);
    });

    // Process each group to add nth-of-type selectors for duplicates
    const processedElements: ScrapedElement[] = [];
    textGroups.forEach((elements, text) => {
      if (elements.length === 1) {
        // Single element with unique text - keep as is
        processedElements.push(elements[0]);
      } else {
        // Multiple elements with same text - add nth-of-type selectors
        console.log(`Found ${elements.length} elements with duplicate text: "${text.substring(0, 50)}..."`);
        
        elements.forEach((element, index) => {
          // Generate nth-of-type selector
          const nthSelector = `${element.tag}:nth-of-type(${index + 1})`;
          
          // Create enhanced strategies with nth-of-type
          const enhancedStrategies = [
            {
              selector: nthSelector,
              type: 'nth-of-type',
              reliability: 0.8,
              description: `nth-of-type selector for duplicate ${index + 1} of ${elements.length}`
            },
            ...(element.selectorStrategies || [])
          ];

          // Also add contextual nth-of-type if we have parent context
          const contextualNthSelector = generateContextualNthSelector(element, $);
          if (contextualNthSelector && contextualNthSelector !== nthSelector) {
            enhancedStrategies.unshift({
              selector: contextualNthSelector,
              type: 'contextual-nth',
              reliability: 0.9,
              description: `Contextual nth-of-type selector for duplicate ${index + 1}`
            });
          }

          processedElements.push({
            ...element,
            selector: contextualNthSelector || nthSelector, // Use contextual if available
            selectorStrategies: enhancedStrategies,
            fallbackSelectors: [
              ...(element.fallbackSelectors || []),
              nthSelector,
              element.selector || element.tag
            ].filter((sel, idx, arr) => arr.indexOf(sel) === idx) // Remove duplicates
          });
        });
      }
    });

    console.log(`Final result: ${processedElements.length} elements (${textGroups.size} unique text groups)`);

    return {
      success: true,
      data: processedElements,
      url: targetUrl,
      timestamp: new Date(),
      debugInfo: {
        htmlLength: html.length,
        mainContentSelector,
        totalElements: textElements.length,
        filteredElements: processedElements.length,
        uniqueTextGroups: textGroups.size
      }
    };

  } catch (error) {
    console.error('Enhanced scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'URL not found. Please check the URL and try again.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please check the URL and try again.';
      } else if (error.message.includes('403')) {
        errorMessage = 'Access denied. The website may be blocking automated requests.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Page not found. Please check the URL and try again.';
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