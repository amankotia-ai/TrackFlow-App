import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedElement {
  tag: string;
  text: string;
  selector?: string;
  attributes?: Record<string, string>;
  level?: number;
}

export interface HierarchicalElement extends ScrapedElement {
  children: HierarchicalElement[];
  isContainer?: boolean;
}

export interface ScrapingResult {
  success: boolean;
  data?: ScrapedElement[];
  hierarchy?: HierarchicalElement[];
  error?: string;
  url: string;
  timestamp: Date;
  debugInfo?: {
    htmlLength: number;
    mainContentSelector: string;
    totalElements: number;
    filteredElements: number;
  };
}

/**
 * Scrapes a webpage and extracts text elements with their metadata
 * @param url - The URL to scrape
 * @returns Promise<ScrapingResult> - The scraping result with extracted data
 */
export async function scrapeWebpage(url: string): Promise<ScrapingResult> {
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

    // Fetch HTML from the URL
    const response = await axios.get(targetUrl, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const textElements: ScrapedElement[] = [];

    // Remove script and style elements to reduce noise
    $('script, style, noscript, iframe, embed, object, meta, link').remove();

    // Focus on main content areas first
    const contentSelectors = [
      'main', 'article', 'section', '.content', '.main', '.container', 
      '.wrapper', '#content', '#main', 'body'
    ];

    let mainContentSelector = 'body';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContentSelector = selector;
        break;
      }
    }

    // Extract text from all elements within main content
    $(`${mainContentSelector} *`).each((_, el) => {
      const tag = el.type === 'tag' ? el.name : 'unknown';
      const text = $(el).text().trim();

      // Filter out empty or very short content, but be more lenient
      if (text && text.length > 1) {
        // Get element attributes
        const attributes: Record<string, string> = {};
        const element = $(el);
        
        // Extract common attributes
        const id = element.attr('id');
        const className = element.attr('class');
        const href = element.attr('href');
        const src = element.attr('src');
        const alt = element.attr('alt');
        
        if (id) attributes.id = id;
        if (className) attributes.class = className;
        if (href) attributes.href = href;
        if (src) attributes.src = src;
        if (alt) attributes.alt = alt;

        // Generate a CSS selector for the element
        let selector = tag;
        if (id) {
          selector = `#${id}`;
        } else if (className) {
          const classes = className.split(' ').filter(c => c.trim()).join('.');
          selector = `${tag}.${classes}`;
        }

        // Only add if this text isn't already captured by a parent element
        const parentText = element.parent().text().trim();
        const isUnique = text !== parentText || element.children().length === 0;

        if (isUnique) {
          textElements.push({
            tag,
            text,
            selector,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined
          });
        }
      }
    });

    // If we didn't get much content from main areas, try the whole body
    if (textElements.length < 5) {
      console.log('Fallback: scraping entire body for more content');
      $('body *').each((_, el) => {
        const tag = el.type === 'tag' ? el.name : 'unknown';
        const text = $(el).text().trim();

        if (text && text.length > 2) {
          const element = $(el);
          const id = element.attr('id');
          const className = element.attr('class');
          const href = element.attr('href');
          
          const attributes: Record<string, string> = {};
          if (id) attributes.id = id;
          if (className) attributes.class = className;
          if (href) attributes.href = href;

          let selector = tag;
          if (id) {
            selector = `#${id}`;
          } else if (className) {
            const classes = className.split(' ').filter(c => c.trim()).join('.');
            selector = `${tag}.${classes}`;
          }

          textElements.push({
            tag,
            text,
            selector,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined
          });
        }
      });
    }

    // Additional fallback: try to get any visible text content
    if (textElements.length < 3) {
      console.log('Final fallback: extracting all visible text');
      const allText = $('body').text().trim();
      if (allText && allText.length > 10) {
        // Split by lines and create paragraph elements
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

    // Filter and categorize elements
    const filteredElements = textElements.filter(element => {
      // Skip elements that are likely to be noise
      const noiseTags = ['script', 'style', 'meta', 'link', 'head', 'html', 'body'];
      return !noiseTags.includes(element.tag);
    });

    console.log(`Scraping completed for ${targetUrl}:`, {
      totalElements: textElements.length,
      filteredElements: filteredElements.length,
      mainContentSelector,
      htmlLength: html.length
    });

    return {
      success: true,
      data: filteredElements,
      url: targetUrl,
      timestamp: new Date(),
      debugInfo: {
        htmlLength: html.length,
        mainContentSelector,
        totalElements: textElements.length,
        filteredElements: filteredElements.length
      }
    };

  } catch (error) {
    console.error('Scraping error:', error);
    
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

/**
 * Categorizes scraped elements by type for better organization
 * @param elements - Array of scraped elements
 * @returns Object with categorized elements
 */
export function categorizeElements(elements: ScrapedElement[]) {
  const categories = {
    headers: elements.filter(el => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tag)),
    paragraphs: elements.filter(el => el.tag === 'p'),
    buttons: elements.filter(el => el.tag === 'button' || (el.tag === 'a' && el.attributes?.class?.includes('btn'))),
    links: elements.filter(el => el.tag === 'a' && el.attributes?.href),
    inputs: elements.filter(el => ['input', 'textarea', 'select'].includes(el.tag)),
    lists: elements.filter(el => ['ul', 'ol', 'li'].includes(el.tag)),
    other: elements.filter(el => !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'input', 'textarea', 'select', 'ul', 'ol', 'li'].includes(el.tag))
  };

  return categories;
}

/**
 * Validates if a URL is properly formatted
 * @param url - The URL to validate
 * @returns boolean - Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
} 