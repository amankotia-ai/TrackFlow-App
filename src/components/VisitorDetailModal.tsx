import React, { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
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

const VisitorDetailModal: React.FC<VisitorDetailModalProps> = ({
  visitorId,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pages, setPages] = useState<PageView[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    if (isOpen && visitorId) {
      fetchVisitorData();
    }
  }, [isOpen, visitorId]);

  const fetchVisitorData = async () => {
    if (!visitorId) return;

    setLoading(true);
    setError(null);

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
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching visitor:', err);
      setError(err instanceof Error ? err.message : 'Failed to load visitor data');
    } finally {
      setLoading(false);
    }
  };

  // Check if visitor is currently online (has active session in last 5 min)
  const isOnline = sessions.some(s => {
    const isActive = s.is_active === 1 || s.is_active === true;
    if (isActive) return true;
    
    // Also check if end_time is recent
    const endTime = new Date(s.end_time);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    return endTime > fiveMinAgo;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Visitor Profile</h2>
            {visitor && (
              <p className="text-sm text-zinc-500">{visitor.anonymous_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
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
              <div className="lg:col-span-2 border-r border-zinc-200 p-6 overflow-y-auto">
                <VisitorProfile
                  visitor={visitor}
                  activity={activity}
                  isOnline={isOnline}
                />
              </div>

              {/* Right Panel - Journey */}
              <div className="lg:col-span-3 p-6 overflow-y-auto bg-zinc-50">
                <h3 className="text-sm font-medium text-zinc-900 mb-4">Journey Timeline</h3>
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
          <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              ID: {visitor.visitor_id}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                Last seen: {new Date(visitor.last_seen).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorDetailModal;

