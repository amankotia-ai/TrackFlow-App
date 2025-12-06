import React, { useMemo } from 'react';
import { Monitor, Smartphone, Tablet, Globe, Calendar, Hash } from 'lucide-react';

// Browser icons mapping
const BROWSER_ICONS: Record<string, string> = {
  'Chrome': '🌐',
  'Firefox': '🦊',
  'Safari': '🧭',
  'Edge': '🔷',
  'DuckDuckGo': '🦆',
  'Unknown': '🌐'
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

// Generate initials from name
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface VisitorProfileProps {
  visitor: {
    visitor_id: string;
    anonymous_name: string;
    first_seen: string;
    last_seen: string;
    total_sessions: number;
    total_page_views?: number;
    country_code: string;
    primary_device: string;
    primary_browser: string;
  };
  activity?: Array<{
    activity_date: string;
    event_count: number;
    page_view_count: number;
    session_count: number;
  }>;
  isOnline?: boolean;
  className?: string;
}

const VisitorProfile: React.FC<VisitorProfileProps> = ({
  visitor,
  activity = [],
  isOnline = false,
  className = ''
}) => {
  const avatarColor = useMemo(() => generateColor(visitor.visitor_id), [visitor.visitor_id]);
  const initials = useMemo(() => getInitials(visitor.anonymous_name || 'Unknown'), [visitor.anonymous_name]);
  const browserIcon = BROWSER_ICONS[visitor.primary_browser] || BROWSER_ICONS['Unknown'];

  // Generate activity heatmap grid (6 months, 7 days per week)
  const activityGrid = useMemo(() => {
    const grid: number[][] = [];
    const activityMap = new Map(activity.map(a => [a.activity_date, a.event_count + a.page_view_count]));
    
    // Generate 26 weeks (6 months)
    const today = new Date();
    for (let week = 0; week < 26; week++) {
      const weekData: number[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (25 - week) * 7 - (6 - day));
        const dateStr = date.toISOString().split('T')[0];
        weekData.push(activityMap.get(dateStr) || 0);
      }
      grid.push(weekData);
    }
    
    return grid;
  }, [activity]);

  // Get activity level for a cell (0-4)
  const getActivityLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  };

  const activityColors = [
    'bg-zinc-100',
    'bg-emerald-200',
    'bg-emerald-300',
    'bg-emerald-400',
    'bg-emerald-500'
  ];

  // Format date with proper UTC handling
  const formatDate = (dateStr: string) => {
    // Ensure UTC parsing if no timezone specified
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate total activity
  const totalEvents = activity.reduce((sum, a) => sum + a.event_count + a.page_view_count, 0);

  // Device icon
  const DeviceIcon = visitor.primary_device === 'mobile' 
    ? Smartphone 
    : visitor.primary_device === 'tablet' 
      ? Tablet 
      : Monitor;

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      {/* Avatar and Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div 
            className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold ${isOnline ? 'ring-4 ring-emerald-100' : ''}`}
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          {/* Online indicator badge */}
          {isOnline && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          <h2 className="text-lg font-semibold text-zinc-900">{visitor.anonymous_name || 'Unknown Visitor'}</h2>
          <DeviceIcon className="size-4 text-zinc-400" />
        </div>
        
        <div className="flex items-center gap-1.5 mt-1">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="flex h-2 w-2 rounded-full bg-zinc-300" />
              <span className="text-xs">Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Browser Badge */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-full border border-zinc-200">
          <Globe className="size-3.5 text-zinc-400" />
          <span className="text-xs text-zinc-600">{browserIcon} {visitor.primary_browser}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="size-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">First seen</span>
          </div>
          <div className="text-sm font-medium text-zinc-900">
            {formatDate(visitor.first_seen)}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Hash className="size-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Sessions</span>
          </div>
          <div className="text-sm font-medium text-zinc-900">
            {visitor.total_sessions}
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-700">Activity</span>
          <span className="text-xs text-zinc-500">
            {totalEvents} events in the last 6 months
          </span>
        </div>
        
        <div className="flex gap-0.5">
          {activityGrid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-0.5">
              {week.map((count, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`w-2.5 h-2.5 rounded-sm ${activityColors[getActivityLevel(count)]}`}
                  title={`${count} events`}
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[10px] text-zinc-400">Less</span>
          {activityColors.map((color, idx) => (
            <div key={idx} className={`w-2 h-2 rounded-sm ${color}`} />
          ))}
          <span className="text-[10px] text-zinc-400">More</span>
        </div>
      </div>
    </div>
  );
};

export default VisitorProfile;

