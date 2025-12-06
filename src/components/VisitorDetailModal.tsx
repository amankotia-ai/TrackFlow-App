import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, RefreshCw, Zap, Clock } from 'lucide-react';
import VisitorProfile from './VisitorProfile';
import VisitorJourney from './VisitorJourney';
import { supabase } from '../lib/supabase';

interface Visitor {
  visitor_id: string;
  anonymous_name: string;
  first_seen: string;
  last_seen: string;
  total_sessions: number;
  total_page_views?: number;
  country_code: string;
  primary_device: string;
  primary_browser: string;
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

interface PageView {
  session_id: string;
  page_path: string;
  page_title: string;
  timestamp: string;
  time_on_page_ms: number;
  scroll_depth: number;
}

interface Activity {
  activity_date: string;
  event_count: number;
  page_view_count: number;
  session_count: number;
}

interface VisitorDetailModalProps {
  visitorId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Real-time polling interval (10 seconds)
const POLL_INTERVAL = 10000;

const VisitorDetailModal: React.FC<VisitorDetailModalProps> = ({
  visitorId,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pages, setPages] = useState<PageView[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial data load
  useEffect(() => {
    if (isOpen && visitorId) {
      fetchVisitorData();
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, visitorId]);

  // Set up real-time polling when modal is open
  useEffect(() => {
    if (isOpen && visitorId && !loading) {
      // Start polling
      pollIntervalRef.current = setInterval(() => {
        fetchVisitorData(true); // Silent refresh
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, visitorId, loading]);

  const fetchVisitorData = useCallback(async (silent = false) => {
    if (!visitorId) return;

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    if (!silent) {
      setError(null);
    }

    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Include auth token if available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/visitors/${encodeURIComponent(visitorId)}`, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch visitor data');
      }

      const data = await response.json();
      
      if (data.success) {
        setVisitor(data.visitor);
        setSessions(data.sessions || []);
        setPages(data.pages || []);
        setActivity(data.activity || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching visitor:', err);
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load visitor data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [visitorId]);

  // Check if visitor is currently online (has active session in last 5 min)
  const isOnline = sessions.some(s => {
    const isActive = s.is_active === 1 || s.is_active === true;
    if (!isActive) return false;
    
    // Also check if end_time is recent (within 5 min)
    const endTime = new Date(s.end_time.endsWith('Z') ? s.end_time : s.end_time + 'Z');
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    return endTime > fiveMinAgo;
  });

  // Format "last seen" time with proper UTC handling
  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format relative time for last updated
  const formatRelativeUpdate = () => {
    if (!lastUpdated) return '';
    const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    return `${Math.floor(diffSec / 60)}m ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-white to-zinc-50">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">Visitor Profile</h2>
                {isOnline && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </div>
              {visitor && (
                <p className="text-sm text-zinc-500">{visitor.anonymous_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Real-time indicator */}
            {lastUpdated && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400">
                {refreshing ? (
                  <RefreshCw className="size-3 animate-spin text-zinc-400" />
                ) : (
                  <Clock className="size-3" />
                )}
                <span>Updated {formatRelativeUpdate()}</span>
              </div>
            )}
            {/* Manual refresh button */}
            <button
              onClick={() => fetchVisitorData()}
              disabled={loading || refreshing}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="size-8 text-zinc-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500">
              <p className="mb-4">{error}</p>
              <button
                onClick={fetchVisitorData}
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : visitor ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 h-full">
              {/* Left Panel - Profile */}
              <div className="lg:col-span-2 border-r border-zinc-100 p-6 overflow-y-auto bg-white">
                <VisitorProfile
                  visitor={visitor}
                  activity={activity}
                  isOnline={isOnline}
                />
              </div>

              {/* Right Panel - Journey */}
              <div className="lg:col-span-3 p-6 overflow-y-auto bg-gradient-to-br from-zinc-50 to-zinc-100/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Journey Timeline</h3>
                  {sessions.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      {sessions.filter(s => s.is_active === 1 || s.is_active === true).length > 0 ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          Active session
                        </span>
                      ) : (
                        `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`
                      )}
                    </span>
                  )}
                </div>
                <VisitorJourney
                  sessions={sessions}
                  pages={pages}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-zinc-500">
              <p>No visitor selected</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {visitor && (
          <div className="px-6 py-3 border-t border-zinc-100 bg-gradient-to-r from-zinc-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-mono">
                {visitor.visitor_id}
              </span>
              {isOnline && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Zap className="size-3" />
                  Currently browsing
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                Last activity: {formatLastSeen(visitor.last_seen)}
              </span>
              {/* Auto-refresh indicator */}
              <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded text-xs text-zinc-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                Live updates
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorDetailModal;

