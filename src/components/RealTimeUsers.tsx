import React, { useState, useEffect } from 'react';
import { Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RealTimeUsersProps {
  className?: string;
}

const RealTimeUsers: React.FC<RealTimeUsersProps> = ({ className }) => {
  const [liveCount, setLiveCount] = useState<number>(0);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchLiveCount = async () => {
      try {
        const response = await fetch('/api/analytics/live');
        if (response.ok) {
          const data = await response.json();
          setLiveCount(data.liveUsers);
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
      <div className={`bg-white p-6 hover:bg-zinc-50 transition-colors ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-zinc-300" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Real-Time Users</span>
        </div>
        <div className="text-3xl font-light mb-1 text-zinc-400">-</div>
        <div className="text-xs text-zinc-500">Unavailable</div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 hover:bg-zinc-50 transition-colors ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="size-4 text-amber-500 fill-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Real-Time Users</span>
      </div>
      <div className="text-3xl font-light mb-1">{liveCount}</div>
      <div className="text-xs text-zinc-500">Active in last 5 mins</div>
    </div>
  );
};

export default RealTimeUsers;

