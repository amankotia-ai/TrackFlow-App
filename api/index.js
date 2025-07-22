 export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>TrackFlow Web Scraping Proxy</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 2rem auto; 
            padding: 2rem; 
            line-height: 1.6;
            color: #333;
        }
        .header { text-align: center; margin-bottom: 3rem; }
        .logo { font-size: 2rem; font-weight: bold; color: #0070f3; }
        .status { color: #00a852; font-weight: 500; }
        .endpoint { 
            background: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 8px; 
            padding: 1.5rem; 
            margin: 1rem 0; 
        }
        .method { 
            color: #0070f3; 
            font-weight: bold; 
            font-family: 'Monaco', 'Menlo', monospace;
        }
        .code { 
            background: #1a1a1a; 
            color: #f8f8f2; 
            padding: 1rem; 
            border-radius: 6px; 
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
        }
        .example { margin: 1rem 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🕷️ TrackFlow Web Scraping Proxy</div>
        <div class="status">✅ Online and Ready</div>
        <p>High-performance web scraping API with CORS bypass and content extraction</p>
    </div>

    <div class="endpoint">
        <h3><span class="method">POST</span> /api/scrape</h3>
        <p>Extract structured data from any website</p>
        
        <div class="example">
            <strong>Example Request:</strong>
            <div class="code">
curl -X POST https://track-flow-web-app.vercel.app/api/scrape \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'
            </div>
        </div>
    </div>

    <div class="endpoint">
        <h3><span class="method">GET</span> /api/health</h3>
        <p>Check server status and available endpoints</p>
        
        <div class="example">
            <strong>Example Request:</strong>
            <div class="code">
curl https://track-flow-web-app.vercel.app/api/health
            </div>
        </div>
    </div>

    <div class="endpoint">
        <h3>🚀 Features</h3>
        <ul>
            <li><strong>CORS Bypass:</strong> Access any website from browser applications</li>
            <li><strong>Smart Content Extraction:</strong> Semantic HTML parsing with Cheerio</li>
            <li><strong>Multiple Strategies:</strong> Fallback extraction methods for complex sites</li>
            <li><strong>Production Ready:</strong> Built on Vercel serverless functions</li>
            <li><strong>Fast Response:</strong> 15-25 second timeout with efficient processing</li>
        </ul>
    </div>

    <div style="text-align: center; margin-top: 3rem; color: #666;">
        <p>Powered by <a href="https://vercel.com" style="color: #0070f3;">Vercel</a> • 
           Built with <a href="https://github.com/cheeriojs/cheerio" style="color: #0070f3;">Cheerio</a></p>
        <p>Timestamp: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
  `;
  
  return res.send(html);
} 