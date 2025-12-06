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
      <Card className={`border-zinc-200 shadow-sm ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-500">
            Real-Time Users
          </CardTitle>
          <Zap className="h-4 w-4 text-zinc-300" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-400">Unavailable</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-zinc-200 shadow-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Real-Time Users
        </CardTitle>
        <Zap className="h-4 w-4 text-amber-500 fill-amber-500 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{liveCount}</div>
        <p className="text-xs text-muted-foreground">
          Active in last 5 mins
        </p>
      </CardContent>
    </Card>
  );
};

export default RealTimeUsers;

