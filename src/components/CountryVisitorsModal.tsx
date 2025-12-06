import React, { useState, useEffect } from 'react';
import { X, Loader2, Users, Clock, Monitor, Smartphone, Tablet, ChevronRight } from 'lucide-react';
import VisitorDetailModal from './VisitorDetailModal';

// Country code to name and flag mapping
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '🇺🇸' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  IE: { name: 'Ireland', flag: '🇮🇪' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  UA: { name: 'Ukraine', flag: '🇺🇦' },
  CN: { name: 'China', flag: '🇨🇳' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  IN: { name: 'India', flag: '🇮🇳' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  PK: { name: 'Pakistan', flag: '🇵🇰' },
  AE: { name: 'UAE', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  PE: { name: 'Peru', flag: '🇵🇪' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
  NG: { name: 'Nigeria', flag: '🇳🇬' },
  EG: { name: 'Egypt', flag: '🇪🇬' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  MA: { name: 'Morocco', flag: '🇲🇦' },
};

// Generate color from visitor ID
function generateColor(visitorId: string): string {
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 80%)`;
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface Visitor {
  visitor_id: string;
  anonymous_name: string;
  first_seen: string;
  last_seen: string;
  total_sessions: number;
  country_code: string;
  primary_device: string;
  primary_browser: string;
}

interface RecentSession {
  visitor_id: string;
  session_id: string;
  start_time: string;
  end_time: string;
  page_count: number;
  is_active: number | boolean;
  browser: string;
}

interface CountryVisitorsModalProps {
  countryCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const CountryVisitorsModal: React.FC<CountryVisitorsModalProps> = ({
  countryCode,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && countryCode) {
      fetchVisitors();
    }
  }, [isOpen, countryCode]);

  const fetchVisitors = async () => {
    if (!countryCode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/visitors/by-country/${encodeURIComponent(countryCode)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }

      const data = await response.json();
      
      if (data.success) {
        setVisitors(data.visitors || []);
        setRecentSessions(data.recentSessions || []);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching visitors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  // Check if a visitor has an active session
  const isVisitorOnline = (visitorId: string): boolean => {
    return recentSessions.some(s => 
      s.visitor_id === visitorId && (s.is_active === 1 || s.is_active === true)
    );
  };

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const countryInfo = countryCode ? COUNTRY_INFO[countryCode] : null;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{countryInfo?.flag || '🌍'}</span>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {countryInfo?.name || countryCode}
                </h2>
                <p className="text-sm text-zinc-500">
                  {visitors.length} visitor{visitors.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 text-zinc-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                <p className="mb-4">{error}</p>
                <button
                  onClick={fetchVisitors}
                  className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : visitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <Users className="size-12 mb-3" />
                <p className="text-sm">No visitors from this country</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {visitors.map((visitor) => {
                  const isOnline = isVisitorOnline(visitor.visitor_id);
                  const DeviceIcon = getDeviceIcon(visitor.primary_device);
                  const avatarColor = generateColor(visitor.visitor_id);
                  const initials = getInitials(visitor.anonymous_name || 'Unknown');

                  return (
                    <button
                      key={visitor.visitor_id}
                      onClick={() => setSelectedVisitorId(visitor.visitor_id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 truncate">
                            {visitor.anonymous_name || 'Unknown Visitor'}
                          </span>
                          <DeviceIcon className="size-3.5 text-zinc-400 shrink-0" />
                          {isOnline && (
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatTimeAgo(visitor.last_seen)}
                          </span>
                          <span>
                            {visitor.total_sessions} session{visitor.total_sessions !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="size-5 text-zinc-300" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        visitorId={selectedVisitorId}
        isOpen={!!selectedVisitorId}
        onClose={() => setSelectedVisitorId(null)}
      />
    </>
  );
};

export default CountryVisitorsModal;

