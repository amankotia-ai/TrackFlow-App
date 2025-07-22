export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.json({
    status: 'ok',
    message: 'TrackFlow Web Scraping Proxy Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      scrape: 'POST /api/scrape - Web scraping proxy',
      health: 'GET /api/health - Health check'
    },
    version: '1.0.0'
  });
} 