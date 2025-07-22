import axios from 'axios';
import * as cheerio from 'cheerio';

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
      message: 'TrackFlow Web Scraping Proxy',
      status: 'online',
      timestamp: new Date().toISOString(),
      usage: 'POST with {"url": "https://example.com"}',
      endpoints: {
        scrape: 'POST /api/scrape',
        health: 'GET /api/health'
      }
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

    console.log(`🕷️ Scraping request for: ${url}`);

    // Ensure URL has protocol
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = `https://${url}`;
    }

    // Fetch HTML from the URL with proper timeout handling
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timeout')), 20000);
    });
    
    const response = await Promise.race([
      axios.get(targetUrl, {
        timeout: 15000,
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
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      }),
      timeoutPromise
    ]);
    
    clearTimeout(timeoutId);
      
      const html = response.data;
    const $ = cheerio.load(html);

    console.log(`📄 HTML received, length: ${html.length}`);

    const textElements = [];

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
        break;
      }
    }

    // Extract text elements
    $(mainContentSelector).find('*').each((_, el) => {
      const tag = el.type === 'tag' ? el.name : 'unknown';
      const text = $(el).text().trim();

      if (text && text.length > 2 && text.length < 1000) {
        const element = $(el);
        const attributes = {};
        
        const id = element.attr('id');
        const className = element.attr('class');
        const href = element.attr('href');
        
        if (id) attributes.id = id;
        if (className) attributes.class = className;
        if (href) attributes.href = href;

        let selector = tag;
        if (id) {
          selector = `#${id}`;
        } else if (className) {
          const classes = className.split(' ').filter(c => c.trim()).slice(0, 3).join('.');
          if (classes) selector = `${tag}.${classes}`;
        }

        textElements.push({
          tag,
          text: text.substring(0, 500), // Limit text length
          selector,
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined
        });
      }
    });

    // Remove duplicates - no limit on results
    const uniqueElements = textElements
      .filter((element, index, self) => {
        const isDuplicate = self.findIndex(e => e.text === element.text) !== index;
        const noiseTags = ['script', 'style', 'meta', 'link', 'head', 'html', 'body'];
        return !isDuplicate && !noiseTags.includes(element.tag);
      });

    console.log(`✅ Extracted ${uniqueElements.length} unique elements`);

    return res.json({
      success: true,
      data: uniqueElements,
      url: targetUrl,
      timestamp: new Date().toISOString(),
      debugInfo: {
        htmlLength: html.length,
        mainContentSelector,
        totalElements: textElements.length,
        filteredElements: uniqueElements.length
      }
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
    
    let errorMessage = 'Failed to scrape webpage';
    if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'URL not found. Please check the URL and try again.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check the URL and try again.';
    } else if (error.code === 'ETIMEDOUT' || error.message === 'Request timeout') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      url: req.body?.url,
      timestamp: new Date().toISOString()
    });
  }
} 