import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Clock, ChevronDown, ChevronUp, Monitor, Smartphone, Tablet, Globe, Zap } from 'lucide-react';

// Browser icons
const BROWSER_ICONS: Record<string, string> = {
  'Chrome': '🌐',
  'Firefox': '🦊',
  'Safari': '🧭',
  'Edge': '🔷',
  'DuckDuckGo': '🦆',
  'Unknown': '🌐'
};

interface PageView {
  session_id: string;
  page_path: string;
  page_title: string;
  timestamp: string;
  time_on_page_ms: number;
  scroll_depth: number;
}

interface Session {
  session_id: string;
  start_time: string;
  end_time: string;
  page_count: number;
  event_count: number;
  device_type: string;
  browser: string;
  country_code: string;
  is_active: number | boolean;
}

interface VisitorJourneyProps {
  sessions: Session[];
  pages: PageView[];
  className?: string;
}

const VisitorJourney: React.FC<VisitorJourneyProps> = ({
  sessions,
  pages,
  className = ''
}) => {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showAllPages, setShowAllPages] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every 30 seconds for relative time display
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand the first active session
  useEffect(() => {
    const activeSession = sessions.find(s => isSessionActive(s));
    if (activeSession) {
      setExpandedSession(activeSession.session_id);
    } else if (sessions.length > 0 && !expandedSession) {
      setExpandedSession(sessions[0].session_id);
    }
  }, [sessions]);

  // Determine if session is truly active (within last 5 minutes)
  const isSessionActive = (session: Session): boolean => {
    const flagActive = session.is_active === 1 || session.is_active === true;
    if (!flagActive) return false;
    
    // Also verify end_time is recent (within 5 min)
    const endTime = new Date(session.end_time).getTime();
    const fiveMinAgo = currentTime - 5 * 60 * 1000;
    return endTime > fiveMinAgo;
  };

  // Determine how old a session is for fading
  const getSessionAge = (session: Session): 'active' | 'recent' | 'old' | 'ancient' => {
    if (isSessionActive(session)) return 'active';
    
    const endTime = new Date(session.end_time).getTime();
    const hourAgo = currentTime - 60 * 60 * 1000;
    const dayAgo = currentTime - 24 * 60 * 60 * 1000;
    
    if (endTime > hourAgo) return 'recent';
    if (endTime > dayAgo) return 'old';
    return 'ancient';
  };

  // Group pages by session
  const pagesBySession = useMemo(() => {
    const grouped: Record<string, PageView[]> = {};
    pages.forEach(page => {
      if (!grouped[page.session_id]) {
        grouped[page.session_id] = [];
      }
      grouped[page.session_id].push(page);
    });
    // Sort pages within each session by timestamp
    Object.keys(grouped).forEach(sessionId => {
      grouped[sessionId].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
    return grouped;
  }, [pages]);

  // Format time duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return '<1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  // Format timestamp - ensure proper UTC to local conversion
  const formatTime = (timestamp: string): string => {
    // Parse as UTC if no timezone specified
    const date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format date header with proper UTC handling
  const formatDateHeader = (timestamp: string): string => {
    const date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    const diffMs = currentTime - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  // Group sessions by date (sorted by start_time desc)
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, Session[]> = {};
    // Sort sessions by start_time descending (most recent first)
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    
    sortedSessions.forEach(session => {
      const date = new Date(session.start_time.endsWith('Z') ? session.start_time : session.start_time + 'Z');
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [sessions]);

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const toggleShowAllPages = (sessionId: string) => {
    setShowAllPages(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  if (sessions.length === 0) {
    return (
      <div className={`bg-white rounded-lg ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <Clock className="size-8 mb-2" />
          <p className="text-sm">No journey data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <div className="space-y-4">
        {Object.entries(sessionsByDate).map(([dateKey, dateSessions]) => (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-full">
                {formatDateHeader(dateSessions[0].start_time)}
              </span>
            </div>

            {/* Sessions for this date */}
            <div className="space-y-3">
              {dateSessions.map((session) => {
                const isActive = isSessionActive(session);
                const sessionAge = getSessionAge(session);
                const sessionPages = pagesBySession[session.session_id] || [];
                const isExpanded = expandedSession === session.session_id;
                const showAll = showAllPages[session.session_id];
                const visiblePages = showAll ? sessionPages : sessionPages.slice(0, 4);
                const hiddenCount = sessionPages.length - 4;
                const DeviceIcon = getDeviceIcon(session.device_type);
                const browserIcon = BROWSER_ICONS[session.browser] || BROWSER_ICONS['Unknown'];

                // Dynamic styling based on session age
                const containerStyles = {
                  active: 'border-emerald-300 bg-gradient-to-r from-emerald-50/50 to-transparent shadow-sm shadow-emerald-100',
                  recent: 'border-zinc-200 bg-white',
                  old: 'border-zinc-100 bg-zinc-50/50 opacity-70',
                  ancient: 'border-zinc-100 bg-zinc-50/30 opacity-50'
                };

                const headerStyles = {
                  active: 'bg-emerald-50/80 hover:bg-emerald-100/80',
                  recent: 'bg-zinc-50 hover:bg-zinc-100',
                  old: 'bg-zinc-50/50 hover:bg-zinc-100/50',
                  ancient: 'bg-zinc-50/30 hover:bg-zinc-100/30'
                };

                return (
                  <div 
                    key={session.session_id}
                    className={`border rounded-lg overflow-hidden transition-all duration-300 ${containerStyles[sessionAge]}`}
                  >
                    {/* Session Header */}
                    <div 
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${headerStyles[sessionAge]}`}
                      onClick={() => toggleSession(session.session_id)}
                    >
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <>
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                              <Zap className="size-3" />
                              Live now
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex h-2 w-2 rounded-full bg-zinc-300" />
                            <span className="text-xs text-zinc-500">
                              Ended {formatRelativeTime(session.end_time)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isActive ? 'text-emerald-600' : 'text-zinc-500'}`}>
                          {session.page_count} pages
                        </span>
                        {isExpanded ? (
                          <ChevronUp className={`size-4 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                        ) : (
                          <ChevronDown className={`size-4 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                        )}
                      </div>
                    </div>

                    {/* Session Pages Timeline */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {visiblePages.map((page, idx) => (
                          <div 
                            key={`${page.session_id}-${page.timestamp}-${idx}`}
                            className="flex items-start gap-3"
                          >
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                                <Eye className="size-3 text-zinc-500" />
                              </div>
                              {idx < visiblePages.length - 1 && (
                                <div className="w-px h-6 bg-zinc-200 mt-1" />
                              )}
                            </div>

                            {/* Page info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-700 truncate" title={page.page_path}>
                                  {page.page_path}
                                </span>
                                {idx === 0 && isActive && (
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                                )}
                              </div>
                              {page.page_title && (
                                <p className="text-xs text-zinc-400 truncate" title={page.page_title}>
                                  {page.page_title}
                                </p>
                              )}
                            </div>

                            {/* Time on page */}
                            <div className="text-xs text-zinc-400 shrink-0">
                              {page.time_on_page_ms > 0 ? formatDuration(page.time_on_page_ms) : '—'}
                            </div>
                          </div>
                        ))}

                        {/* Show more/less toggle */}
                        {hiddenCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleShowAllPages(session.session_id);
                            }}
                            className="flex items-center justify-center w-full py-2 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded transition-colors"
                          >
                            {showAll ? (
                              <>Show less</>
                            ) : (
                              <>+{hiddenCount} more pages</>
                            )}
                          </button>
                        )}

                        {/* Session footer with device/browser info */}
                        <div className={`flex items-center justify-between pt-2 mt-2 border-t ${isActive ? 'border-emerald-100' : 'border-zinc-100'}`}>
                          <div className={`flex items-center gap-2 text-xs ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                            <span>{browserIcon}</span>
                            <DeviceIcon className="size-3.5" />
                            <Globe className="size-3.5" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                              Started {formatTime(session.start_time)}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">
                                LIVE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Journey start indicator */}
        <div className="flex flex-col items-center pt-4 text-zinc-400">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
            <Clock className="size-4" />
          </div>
          <p className="text-xs text-center">
            This is where their<br />journey begins
          </p>
        </div>
      </div>
    </div>
  );
};

export default VisitorJourney;

