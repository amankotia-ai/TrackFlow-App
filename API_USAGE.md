# 🕷️ TrackFlow Web Scraping Proxy API

**Base URL:** `https://trackflow-webapp-production.up.railway.app`

## 📋 Quick Start

### Health Check
```bash
curl https://trackflow-webapp-production.up.railway.app/api/health
```

### Basic Scraping
```bash
curl -X POST https://trackflow-webapp-production.up.railway.app/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 🔧 API Endpoints

### `GET /api/health`
Returns server status and available endpoints.

**Response:**
```json
{
  "status": "ok",
  "platform": "Railway",
  "timestamp": "2025-01-21T08:00:00.000Z",
  "endpoints": {
    "scrape": "POST /api/scrape",
    "health": "GET /api/health"
  }
}
```

### `POST /api/scrape`
Extracts structured data from any website.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tag": "h1",
      "text": "Example Domain",
      "selector": "h1",
      "attributes": {
        "id": null,
        "class": null,
        "href": null
      }
    }
  ],
  "url": "https://example.com",
  "timestamp": "2025-01-21T08:00:00.000Z",
  "count": 1
}
```

## 🌐 Browser Usage

### JavaScript Fetch
```javascript
async function scrapeWebsite(url) {
  const response = await fetch('https://trackflow-webapp-production.up.railway.app/api/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: url })
  });
  
  const data = await response.json();
  return data;
}

// Usage
scrapeWebsite('https://news.ycombinator.com')
  .then(result => console.log(result.data));
```

### Python Requests
```python
import requests

def scrape_website(url):
    response = requests.post(
        'https://trackflow-webapp-production.up.railway.app/api/scrape',
        json={'url': url}
    )
    return response.json()

# Usage
result = scrape_website('https://example.com')
print(result['data'])
```

### Node.js Axios
```javascript
import axios from 'axios';

async function scrapeWebsite(url) {
  const response = await axios.post(
    'https://trackflow-webapp-production.up.railway.app/api/scrape',
    { url: url }
  );
  return response.data;
}

// Usage
const result = await scrapeWebsite('https://example.com');
console.log(result.data);
```

## ✨ Features

- **CORS Enabled**: Works from any website or application
- **Error Handling**: Robust error messages and status codes
- **Timeout Protection**: 15-second timeout prevents hanging
- **Duplicate Removal**: Automatically removes duplicate content
- **Smart Extraction**: Focuses on meaningful text content
- **Rate Limited**: 50 elements max per request for performance

## 🚫 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "URL is required",
  "timestamp": "2025-01-21T08:00:00.000Z"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "URL not found",
  "timestamp": "2025-01-21T08:00:00.000Z"
}
```

## 🔒 Best Practices

1. **Always check `success` field** in response
2. **Handle timeouts** (15-second max response time)
3. **Respect rate limits** (don't spam requests)
4. **Use HTTPS URLs** when possible for target sites
5. **Cache results** when appropriate to reduce load

## 🎯 Example Use Cases

- **Content Monitoring**: Track changes on competitor websites
- **Price Tracking**: Monitor product prices across e-commerce sites
- **News Aggregation**: Extract headlines and articles from news sites
- **SEO Research**: Analyze page structure and content
- **Data Collection**: Gather structured data from various sources
- **API Alternative**: Access data from sites without APIs

## 🚀 Integration Examples

### React Component
```jsx
import { useState } from 'react';

function WebScraper() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrapeUrl = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://trackflow-webapp-production.up.railway.app/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Scraping error:', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <input 
        value={url} 
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL to scrape..."
      />
      <button onClick={scrapeUrl} disabled={loading}>
        {loading ? 'Scraping...' : 'Scrape'}
      </button>
      
      {data.map((item, i) => (
        <div key={i}>
          <strong>{item.tag}:</strong> {item.text}
        </div>
      ))}
    </div>
  );
}
```

## 📊 Response Optimization

The API automatically:
- Limits text length to 200 characters per element
- Returns maximum 50 elements per request
- Removes script, style, and other noise elements
- Deduplicates identical text content

## 🛠️ Development

For local development:
```bash
git clone https://github.com/amankotia-ai/TrackFlow-WebApp.git
cd TrackFlow-WebApp
npm install
npm run railway
```

Server runs on `http://localhost:3001` 