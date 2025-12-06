import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from 'react-simple-maps';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// World topology URL (Natural Earth 110m)
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country code to coordinates mapping
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  US: { lat: 39, lng: -98, name: 'United States' },
  CA: { lat: 56, lng: -106, name: 'Canada' },
  MX: { lat: 23, lng: -102, name: 'Mexico' },
  GB: { lat: 54, lng: -2, name: 'United Kingdom' },
  DE: { lat: 51, lng: 10, name: 'Germany' },
  FR: { lat: 46, lng: 2, name: 'France' },
  IT: { lat: 42, lng: 12, name: 'Italy' },
  ES: { lat: 40, lng: -4, name: 'Spain' },
  NL: { lat: 52, lng: 5, name: 'Netherlands' },
  SE: { lat: 62, lng: 18, name: 'Sweden' },
  NO: { lat: 62, lng: 10, name: 'Norway' },
  PL: { lat: 52, lng: 20, name: 'Poland' },
  CH: { lat: 47, lng: 8, name: 'Switzerland' },
  IE: { lat: 53, lng: -8, name: 'Ireland' },
  RU: { lat: 60, lng: 100, name: 'Russia' },
  UA: { lat: 49, lng: 32, name: 'Ukraine' },
  CN: { lat: 35, lng: 105, name: 'China' },
  JP: { lat: 36, lng: 138, name: 'Japan' },
  KR: { lat: 36, lng: 128, name: 'South Korea' },
  IN: { lat: 20, lng: 78, name: 'India' },
  ID: { lat: -2, lng: 118, name: 'Indonesia' },
  TH: { lat: 15, lng: 101, name: 'Thailand' },
  VN: { lat: 16, lng: 108, name: 'Vietnam' },
  MY: { lat: 4, lng: 102, name: 'Malaysia' },
  SG: { lat: 1, lng: 104, name: 'Singapore' },
  PH: { lat: 13, lng: 122, name: 'Philippines' },
  PK: { lat: 30, lng: 69, name: 'Pakistan' },
  AE: { lat: 24, lng: 54, name: 'UAE' },
  SA: { lat: 24, lng: 45, name: 'Saudi Arabia' },
  IL: { lat: 31, lng: 35, name: 'Israel' },
  TR: { lat: 39, lng: 35, name: 'Turkey' },
  BR: { lat: -10, lng: -55, name: 'Brazil' },
  AR: { lat: -34, lng: -64, name: 'Argentina' },
  CL: { lat: -33, lng: -71, name: 'Chile' },
  CO: { lat: 4, lng: -72, name: 'Colombia' },
  PE: { lat: -10, lng: -76, name: 'Peru' },
  AU: { lat: -27, lng: 133, name: 'Australia' },
  NZ: { lat: -41, lng: 174, name: 'New Zealand' },
  ZA: { lat: -29, lng: 25, name: 'South Africa' },
  NG: { lat: 9, lng: 8, name: 'Nigeria' },
  EG: { lat: 27, lng: 30, name: 'Egypt' },
  KE: { lat: -1, lng: 38, name: 'Kenya' },
  MA: { lat: 32, lng: -6, name: 'Morocco' },
};

interface LocationData {
  country_code: string;
  user_count: number;
}

const WorldMapVisualization: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  // Fetch live user data
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [liveResponse, locationsResponse] = await Promise.all([
          fetch('/api/analytics/live'),
          fetch('/api/analytics/live-locations')
        ]);
        
        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          setTotalUsers(liveData.liveUsers || 0);
        }
        
        if (locationsResponse.ok) {
          const locData = await locationsResponse.json();
          setLocationData(locData.locations || []);
        }
      } catch (e) {
        setLocationData([]);
      }
    };
    
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Convert location data to markers
  const markers = useMemo(() => {
    return locationData
      .filter(loc => COUNTRY_COORDS[loc.country_code])
      .map(loc => ({
        ...loc,
        coords: COUNTRY_COORDS[loc.country_code]
      }));
  }, [locationData]);

  // Top locations for legend
  const topLocations = useMemo(() => {
    return [...locationData]
      .sort((a, b) => b.user_count - a.user_count)
      .slice(0, 5)
      .map(loc => ({
        code: loc.country_code,
        name: COUNTRY_COORDS[loc.country_code]?.name || loc.country_code,
        count: loc.user_count
      }));
  }, [locationData]);

  const handleZoomIn = useCallback(() => {
    if (position.zoom >= 4) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }, [position.zoom]);

  const handleZoomOut = useCallback(() => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }, [position.zoom]);

  const handleReset = useCallback(() => {
    setPosition({ coordinates: [0, 20], zoom: 1 });
  }, []);

  const handleMoveEnd = useCallback((position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Live Activity</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time user sessions worldwide</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
          <span className={`flex h-2 w-2 rounded-full ${totalUsers > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`}></span>
          <span className="text-xs font-medium text-zinc-700">
            {totalUsers > 0 ? `${totalUsers} active` : 'No active users'}
          </span>
        </div>
      </div>
      
      <div className="relative flex-1 w-full border border-zinc-200 rounded-md bg-[#fafafa] overflow-hidden">
        {/* Map */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 35]
          }}
          style={{
            width: '100%',
            height: '100%',
            background: '#fafafa'
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={8}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e4e4e7"
                    stroke="#d4d4d8"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#d4d4d8', outline: 'none' },
                      pressed: { outline: 'none' }
                    }}
                  />
                ))
              }
            </Geographies>
            
            {/* User markers */}
            {markers.map((marker) => (
              <Marker
                key={marker.country_code}
                coordinates={[marker.coords.lng, marker.coords.lat]}
                onMouseEnter={() => setHoveredMarker(marker.country_code)}
                onMouseLeave={() => setHoveredMarker(null)}
              >
                {/* Pulse ring */}
                <circle
                  r={8 / position.zoom}
                  fill="#18181b"
                  fillOpacity={0.15}
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                {/* Main dot */}
                <circle
                  r={5 / position.zoom}
                  fill="#18181b"
                  stroke="#fff"
                  strokeWidth={1.5 / position.zoom}
                  style={{ cursor: 'pointer' }}
                />
                {/* Tooltip */}
                {hoveredMarker === marker.country_code && (
                  <g>
                    <rect
                      x={8 / position.zoom}
                      y={-12 / position.zoom}
                      width={(marker.coords.name.length * 6 + 40) / position.zoom}
                      height={24 / position.zoom}
                      rx={4 / position.zoom}
                      fill="#18181b"
                      fillOpacity={0.9}
                    />
                    <text
                      x={14 / position.zoom}
                      y={4 / position.zoom}
                      fill="#fff"
                      fontSize={11 / position.zoom}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {marker.coords.name} • {marker.user_count}
                    </text>
                  </g>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={handleZoomIn}
            disabled={position.zoom >= 4}
            className="p-1 bg-white border border-zinc-200 rounded shadow-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="size-3.5 text-zinc-600" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={position.zoom <= 1}
            className="p-1 bg-white border border-zinc-200 rounded shadow-sm hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="size-3.5 text-zinc-600" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 bg-white border border-zinc-200 rounded shadow-sm hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw className="size-3.5 text-zinc-600" />
          </button>
        </div>
        
        {/* Top locations legend */}
        {topLocations.length > 0 && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm border border-zinc-200 rounded px-2 py-1.5 shadow-sm">
            <div className="text-[10px] text-zinc-500 mb-1 font-medium uppercase tracking-wider">Top Locations</div>
            <div className="space-y-0.5">
              {topLocations.slice(0, 3).map((loc, index) => (
                <div key={loc.code} className="flex items-center gap-1.5">
                  <div 
                    className="w-1.5 h-1.5 rounded-full bg-zinc-900"
                    style={{ opacity: 1 - index * 0.2 }}
                  />
                  <span className="text-[10px] text-zinc-700">{loc.name}</span>
                  <span className="text-[10px] text-zinc-400 tabular-nums">{loc.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMapVisualization;
