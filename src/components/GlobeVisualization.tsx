import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { X } from 'lucide-react';

// Country code to lat/long coordinates mapping
const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  // North America
  US: [37.0902, -95.7129],
  CA: [56.1304, -106.3468],
  MX: [23.6345, -102.5528],
  
  // Europe
  GB: [55.3781, -3.4360],
  DE: [51.1657, 10.4515],
  FR: [46.2276, 2.2137],
  IT: [41.8719, 12.5674],
  ES: [40.4637, -3.7492],
  NL: [52.1326, 5.2913],
  BE: [50.5039, 4.4699],
  PT: [39.3999, -8.2245],
  SE: [60.1282, 18.6435],
  NO: [60.4720, 8.4689],
  FI: [61.9241, 25.7482],
  DK: [56.2639, 9.5018],
  PL: [51.9194, 19.1451],
  AT: [47.5162, 14.5501],
  CH: [46.8182, 8.2275],
  IE: [53.1424, -7.6921],
  CZ: [49.8175, 15.4730],
  RO: [45.9432, 24.9668],
  HU: [47.1625, 19.5033],
  GR: [39.0742, 21.8243],
  UA: [48.3794, 31.1656],
  RU: [61.5240, 105.3188],
  
  // Asia
  CN: [35.8617, 104.1954],
  JP: [36.2048, 138.2529],
  KR: [35.9078, 127.7669],
  IN: [20.5937, 78.9629],
  ID: [-0.7893, 113.9213],
  TH: [15.8700, 100.9925],
  VN: [14.0583, 108.2772],
  MY: [4.2105, 101.9758],
  SG: [1.3521, 103.8198],
  PH: [12.8797, 121.7740],
  PK: [30.3753, 69.3451],
  BD: [23.6850, 90.3563],
  TW: [23.6978, 120.9605],
  HK: [22.3193, 114.1694],
  AE: [23.4241, 53.8478],
  SA: [23.8859, 45.0792],
  IL: [31.0461, 34.8516],
  TR: [38.9637, 35.2433],
  IR: [32.4279, 53.6880],
  
  // South America
  BR: [-14.2350, -51.9253],
  AR: [-38.4161, -63.6167],
  CL: [-35.6751, -71.5430],
  CO: [4.5709, -74.2973],
  PE: [-9.1900, -75.0152],
  VE: [6.4238, -66.5897],
  
  // Oceania
  AU: [-25.2744, 133.7751],
  NZ: [-40.9006, 174.8860],
  
  // Africa
  ZA: [-30.5595, 22.9375],
  NG: [9.0820, 8.6753],
  EG: [26.8206, 30.8025],
  KE: [-0.0236, 37.9062],
  MA: [31.7917, -7.0926],
  GH: [7.9465, -1.0232],
  ET: [9.1450, 40.4897],
  TZ: [-6.3690, 34.8888],
  
  // Default/Unknown
  unknown: [0, 0],
};

// Color palette for markers - vibrant gradients
const MARKER_COLORS = [
  [255/255, 107/255, 107/255], // Coral red
  [78/255, 205/255, 196/255],  // Turquoise
  [255/255, 193/255, 7/255],   // Amber
  [156/255, 39/255, 176/255],  // Purple
  [76/255, 175/255, 80/255],   // Green
  [33/255, 150/255, 243/255],  // Blue
  [255/255, 152/255, 0/255],   // Orange
  [233/255, 30/255, 99/255],   // Pink
];

interface Marker {
  location: [number, number];
  size: number;
  color?: [number, number, number];
}

interface SessionDetails {
  page: string;
  pageCount: number;
  referrer: string;
  referrerCount: number;
  country: string;
  countryCode: string;
  countryCount: number;
}

interface LocationData {
  country_code: string;
  user_count: number;
}

const GlobeVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Use a ref to store the stable marker objects for Cobe
  const markersRef = useRef<Marker[]>([]);
  const locationDataRef = useRef<LocationData[]>([]);

  // Fetch live user data from both endpoints to stay in sync
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // Fetch both endpoints in parallel - use the same source as RealTimeUsers widget
        const [liveResponse, locationsResponse] = await Promise.all([
          fetch('/api/analytics/live'),
          fetch('/api/analytics/live-locations')
        ]);
        
        // Get the authoritative live user count (same as RealTimeUsers widget)
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          setTotalUsers(liveData.liveUsers || 0);
        }
        
        // Get location data for markers if available
        if (locationsResponse.ok) {
          const locData = await locationsResponse.json();
          locationDataRef.current = locData.locations || [];
          
          // Convert location data to markers
          const newMarkers: Marker[] = [];
          locationDataRef.current.forEach((loc, index) => {
            const coords = COUNTRY_COORDINATES[loc.country_code] || COUNTRY_COORDINATES['unknown'];
            if (coords[0] !== 0 || coords[1] !== 0) {
              // Add multiple markers for countries with more users
              const markerCount = Math.min(loc.user_count, 5);
              for (let i = 0; i < markerCount; i++) {
                newMarkers.push({
                  location: [
                    coords[0] + (Math.random() - 0.5) * 5,
                    coords[1] + (Math.random() - 0.5) * 5
                  ] as [number, number],
                  size: 0.08 + Math.random() * 0.04,
                  color: MARKER_COLORS[(index + i) % MARKER_COLORS.length]
                });
              }
            }
          });
          
          markersRef.current = newMarkers;
        }
      } catch (e) {
        // No markers if ClickHouse is unavailable
        markersRef.current = [];
      }
    };
    
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000); // Match RealTimeUsers polling interval
    
    return () => clearInterval(interval);
  }, []);

  // Globe initialization
  useEffect(() => {
    let phi = 0;
    let width = 0;
    let height = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
        height = canvasRef.current.offsetHeight;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: height * 2,
      phi: 0,
      theta: 0.25,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 24000,
      mapBrightness: 4,
      baseColor: [0.95, 0.95, 0.95],
      markerColor: [0.2, 0.5, 1],
      glowColor: [0.85, 0.85, 0.85],
      markers: markersRef.current,
      onRender: (state) => {
        // Very slow rotation
        state.phi = phi;
        phi += 0.002;
        
        // Responsive Sizing
        state.width = width * 2;
        state.height = height * 2;
        
        // Update markers reference
        state.markers = markersRef.current;
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Handle click on globe to simulate selecting a session
  const handleGlobeClick = () => {
    if (markersRef.current.length === 0) return;

    const pages = ['/pricing', '/features', '/blog/workflow-automation', '/docs/api', '/templates'];
    const referrers = ['Direct', 'Google', 'Twitter', 'LinkedIn', 'ProductHunt'];
    const countries = [
        { name: 'United States', code: '🇺🇸' },
        { name: 'United Kingdom', code: '🇬🇧' },
        { name: 'Germany', code: '🇩🇪' },
        { name: 'Japan', code: '🇯🇵' },
        { name: 'France', code: '🇫🇷' },
        { name: 'India', code: '🇮🇳' },
        { name: 'Brazil', code: '🇧🇷' }
    ];

    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    const randomReferrer = referrers[Math.floor(Math.random() * referrers.length)];
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];

    setSelectedSession({
        page: randomPage,
        pageCount: Math.floor(Math.random() * 20) + 1,
        referrer: randomReferrer,
        referrerCount: Math.floor(Math.random() * 50) + 1,
        country: randomCountry.name,
        countryCode: randomCountry.code,
        countryCount: Math.floor(Math.random() * 30) + 1
    });
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-zinc-900">Live Activity</h2>
        <p className="text-xs text-zinc-500 mt-1">Real-time user sessions and workflow executions</p>
      </div>
      
      <div className="relative flex-1 w-full h-full overflow-hidden" onClick={handleGlobeClick}>
        <canvas
            ref={canvasRef}
            style={{ 
                width: '100%', 
                height: '100%',
                contain: 'layout paint size',
                opacity: 1,
                cursor: 'grab'
            }}
        />
        
        {/* Live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          <span className={`flex h-2 w-2 rounded-full ${totalUsers > 0 ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`}></span>
          <span className="text-xs font-medium text-zinc-700">
            {totalUsers > 0 ? `${totalUsers} active` : '0 active'}
          </span>
        </div>
        
        {/* Overlay Stats Card - Hidden by default, shown on click */}
        {selectedSession && (
            <div className="absolute bottom-6 left-6 bg-zinc-900/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-lg w-72 border border-zinc-700/50 animate-in fade-in slide-in-from-bottom-4 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-3 border-b border-zinc-700/50 pb-2">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Session Details</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(null);
                        }}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Pages</span>
                        <div className="flex items-center gap-2">
                            <span className="truncate max-w-[120px]">{selectedSession.page}</span>
                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-zinc-300">{selectedSession.pageCount}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Referrers</span>
                        <div className="flex items-center gap-2">
                            <span>{selectedSession.referrer}</span>
                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-zinc-300">{selectedSession.referrerCount}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Countries</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs">{selectedSession.countryCode}</span>
                            <span>{selectedSession.country}</span>
                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs text-zinc-300">{selectedSession.countryCount}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GlobeVisualization;
