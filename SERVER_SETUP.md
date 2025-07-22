# Server-Side Scraping Setup

## Overview
To avoid CORS issues when scraping websites, we've moved the scraping functionality to a server-side Express application. This allows the frontend to make requests to our server, which then scrapes the target websites without CORS restrictions.

## Quick Start

### Option 1: Run Both Servers Together (Recommended)
```bash
npm run dev:all
```
This will start both the scraping server (port 3001) and the frontend (port 5173) simultaneously.

### Option 2: Run Servers Separately
```bash
# Terminal 1: Start the scraping server
npm run dev:server

# Terminal 2: Start the frontend
npm run dev
```

## Server Endpoints

### POST /api/scrape
Scrapes a webpage and returns structured data.

**Request:**
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
      "text": "Page Title",
      "selector": "h1",
      "attributes": {}
    }
  ],
  "url": "https://example.com",
  "timestamp": "2025-01-20T14:30:00.000Z",
  "debugInfo": {
    "htmlLength": 15000,
    "mainContentSelector": "main",
    "totalElements": 50,
    "filteredElements": 25
  }
}
```

### GET /api/health
Health check endpoint to verify the server is running.

## How It Works

1. **Frontend**: When a user enters a URL, the frontend makes a POST request to `http://localhost:3001/api/scrape`
2. **Server**: The Express server receives the request and uses axios + cheerio to scrape the target website
3. **Response**: The server returns the scraped data in JSON format
4. **Frontend**: The frontend displays the results in the UI

## Benefits

- ✅ **No CORS Issues**: Server-side scraping bypasses browser CORS restrictions
- ✅ **Better Performance**: Server can handle more complex scraping logic
- ✅ **Enhanced Headers**: Can set any HTTP headers without browser restrictions
- ✅ **Error Handling**: Better error handling and logging on the server
- ✅ **Scalability**: Can easily add caching, rate limiting, etc.

## Troubleshooting

### Server Not Starting
- Make sure port 3001 is available
- Check that all dependencies are installed: `npm install`

### Frontend Can't Connect to Server
- Ensure the server is running on `http://localhost:3001`
- Check the browser console for connection errors
- Verify the server health endpoint: `http://localhost:3001/api/health`

### Scraping Fails
- Check the server console for detailed error logs
- Some websites may block automated requests
- Try different URLs to test

## Development

### Server Files
- `server.js` - Main Express server with scraping endpoint
- `package.json` - Updated with server scripts

### Frontend Changes
- `src/hooks/useWebScraper.ts` - Updated to use server API instead of client-side scraping
- Removed client-side scraping utilities (still available for reference)

## Production Deployment

For production, you would typically:
1. Deploy the Express server to a cloud platform (Heroku, Vercel, etc.)
2. Update the frontend to use the production server URL
3. Add environment variables for configuration
4. Implement proper security measures (rate limiting, authentication, etc.) 