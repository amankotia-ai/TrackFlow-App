import React, { useState, useEffect } from 'react';
import { Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '../lib/supabase';

interface RealTimeUsersProps {
  className?: string;
}

const RealTimeUsers: React.FC<RealTimeUsersProps> = ({ className }) => {
  const [liveCount, setLiveCount] = useState<number>(0);
  const [error, setError] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveCount = async () => {
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
        
        const response = await fetch('/api/analytics/live', { headers });
        if (response.ok) {
          const data = await response.json();
          setLiveCount(data.liveUsers);
          setMessage(data.message || null);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to fetch live users:', err);
        setError(true);
      }
    };

    // Initial fetch
    fetchLiveCount();

    // Poll every 10 seconds
    const interval = setInterval(fetchLiveCount, 10000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className={`bg-white p-4 hover:bg-zinc-50 transition-colors ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="size-4 text-zinc-300" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Real-Time Users</span>
        </div>
        <div className="text-2xl font-light text-zinc-400">-</div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-4 hover:bg-zinc-50 transition-colors ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="size-4 text-amber-500 fill-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Real-Time</span>
      </div>
      <div className="text-2xl font-light">{liveCount}</div>
    </div>
  );
};

export default RealTimeUsers;

