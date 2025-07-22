# Web Scraping Feature

## Overview
This feature allows users to scrape webpages and extract text elements for personalization workflows. When a user enters a URL in the playbook name element, the system automatically scrapes the webpage and extracts all text elements with their metadata.

## How It Works

### 1. URL Input
- Users can enter a URL in the "Add a webpage URL" field in the WorkflowBuilder
- The URL field is located under the playbook name in the floating header
- URLs can be entered with or without the protocol (http/https)

### 2. Automatic Scraping
- When a valid URL is entered, the system automatically triggers web scraping
- A loading spinner appears during the scraping process
- A green checkmark appears when scraping is successful
- A warning icon appears if scraping fails

### 3. Results Display
- Click on the green checkmark to view detailed scraping results
- Results are categorized by element type (headers, paragraphs, buttons, links, etc.)
- Raw JSON data is also available for advanced users

## Technical Implementation

### Files Created/Modified

1. **`src/utils/scraper.ts`** - Core scraping functionality
   - `scrapeWebpage(url)` - Main scraping function
   - `categorizeElements(elements)` - Categorizes scraped elements
   - `isValidUrl(url)` - URL validation

2. **`src/utils/scraperEnhanced.ts`** - Enhanced scraping functionality
   - `scrapeWebpageEnhanced(url)` - Advanced scraping with multiple strategies
   - Better handling of JavaScript-heavy sites
   - Multiple fallback strategies for content extraction

3. **`src/hooks/useWebScraper.ts`** - React hook for scraping
   - Manages scraping state and results
   - Provides `scrapeUrl()` and `clearResult()` functions
   - Uses enhanced scraper with fallback to regular scraper

4. **`src/components/ScrapingResults.tsx`** - Results display component
   - Modal dialog showing categorized results
   - Raw data view
   - Error handling display
   - Debug information display

5. **`src/components/WorkflowBuilder.tsx`** - Integration
   - Added scraping hook integration
   - Modified URL input handling
   - Added results modal

### Dependencies Added
- `axios` - HTTP client for fetching webpages
- `cheerio` - HTML parsing and manipulation

## Features

### Scraping Capabilities
- **Enhanced Content Extraction**: Uses multiple strategies to extract content from various website types
- **JavaScript-Heavy Sites**: Better handling of modern SPAs and dynamic content
- **Multiple Fallback Strategies**: If one approach fails, tries alternative methods
- **Semantic Content Focus**: Prioritizes main content areas (main, article, section, etc.)
- **Duplicate Detection**: Removes duplicate content automatically
- **Debug Information**: Provides detailed logging and debug info for troubleshooting
- **Captures element tags, text content, and CSS selectors**
- **Filters out noise (scripts, styles, empty content)**
- **Handles various error conditions gracefully**

### Data Structure
```typescript
interface ScrapedElement {
  tag: string;           // HTML tag name
  text: string;          // Text content
  selector?: string;     // CSS selector
  attributes?: Record<string, string>; // Element attributes
}
```

### Error Handling
- Network timeouts (10 seconds)
- Invalid URLs
- Connection errors
- Missing content
- CORS issues (handled gracefully)

### Categorization
Elements are automatically categorized into:
- **Headers** (h1-h6)
- **Paragraphs** (p)
- **Buttons** (button, a.btn)
- **Links** (a with href)
- **Inputs** (input, textarea, select)
- **Lists** (ul, ol, li)
- **Other** (remaining elements)

## Usage

1. Open a workflow in the WorkflowBuilder
2. Enter a URL in the "Add a webpage URL" field
3. Wait for the scraping to complete (green checkmark appears)
4. Click the checkmark to view detailed results
5. Use the scraped data for personalization workflows

## Security Considerations

- Uses a standard User-Agent to avoid being blocked
- Implements request timeouts to prevent hanging
- Validates URLs before scraping
- Handles CORS and other network errors gracefully
- No sensitive data is stored or transmitted

## Future Enhancements

- Save scraped data to workflow configuration
- Allow manual element selection from scraped results
- Preview rendering of scraped content
- Batch scraping for multiple URLs
- Advanced filtering and search within results 