import React, { useState } from 'react';
import { Trophy, Smartphone, Monitor, Tablet, CheckCircle, XCircle, ChevronDown, ChevronUp, Users, Globe } from 'lucide-react';
import { TopPerformer } from '../utils/dashboardHelpers';

interface TopPerformersProps {
  performers: TopPerformer[];
}

const TopPerformers: React.FC<TopPerformersProps> = ({ performers }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (workflowId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedIds(newExpanded);
  };

  if (performers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <h3 className="text-sm font-semibold text-secondary-900 mb-4 flex items-center">
          <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
          Top Performing Playbooks
        </h3>
        <p className="text-sm text-secondary-500 text-center py-8">
          No playbook executions yet. Create and activate your first playbook to see performance data.
        </p>
      </div>
    );
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-orange-600';
      default: return 'text-secondary-400';
    }
  };

  const getMedalBg = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-50';
      case 1: return 'bg-gray-50';
      case 2: return 'bg-orange-50';
      default: return 'bg-secondary-50';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  
  const shortenUrl = (url: string, maxLength: number = 50): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg border border-secondary-200 p-6">
      <h3 className="text-sm font-semibold text-secondary-900 mb-4 flex items-center">
        <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
        Top Performing Playbooks
      </h3>
      
      <div className="space-y-3">
        {performers.map((performer, index) => {
          const isExpanded = expandedIds.has(performer.workflowId);
          const { mobile, desktop, tablet } = performer.deviceBreakdown;
          const totalDevices = mobile + desktop + tablet;
          
          return (
            <div 
              key={performer.workflowId}
              className="border border-secondary-200 rounded-lg hover:border-secondary-300 transition-colors"
            >
              {/* Main Row */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-lg ${getMedalBg(index)} flex items-center justify-center mr-3 flex-shrink-0`}>
                      <span className={`font-bold text-sm ${getMedalColor(index)}`}>
                        {index + 1}
                      </span>
                    </div>
                    
                    {/* Playbook Name */}
                    <h4 className="font-semibold text-secondary-900 truncate">
                      {performer.name}
                    </h4>
                  </div>

                  {/* Success Badge */}
                  <div className={`px-3 py-1 rounded text-xs font-medium ml-3 flex-shrink-0 ${
                    performer.successRate === 100 
                      ? 'bg-green-100 text-green-700' 
                      : performer.successRate >= 90 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {performer.successRate}% success
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <div className="text-xs text-secondary-500 mb-1">Executions</div>
                    <div className="font-semibold text-secondary-900">{performer.executions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500 mb-1 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      Visitors
                    </div>
                    <div className="font-semibold text-secondary-900">{performer.uniqueSessions}</div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500 mb-1 flex items-center">
                      <Globe className="w-3 h-3 mr-1" />
                      Pages
                    </div>
                    <div className="font-semibold text-secondary-900">{performer.uniquePages}</div>
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => toggleExpanded(performer.workflowId)}
                  className="w-full pt-3 border-t border-secondary-100 flex items-center justify-center text-xs text-secondary-600 hover:text-secondary-900 transition-colors"
                >
                  <span className="mr-1">
                    {isExpanded ? 'Show less' : 'Show all metrics'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-secondary-200 p-4 bg-secondary-50 space-y-4">
                  {/* Execution Results */}
                  <div>
                    <div className="text-xs font-semibold text-secondary-700 mb-2">Execution Results</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-1.5" />
                        <span className="text-secondary-600">Success: </span>
                        <span className="font-semibold text-secondary-900 ml-1">{performer.successCount}</span>
                      </div>
                      <div className="flex items-center">
                        <XCircle className="w-4 h-4 text-red-600 mr-1.5" />
                        <span className="text-secondary-600">Errors: </span>
                        <span className="font-semibold text-secondary-900 ml-1">{performer.errorCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Device Breakdown */}
                  <div>
                    <div className="text-xs font-semibold text-secondary-700 mb-2">Device Distribution</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 text-blue-600 mr-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-secondary-500">Mobile</div>
                          <div className="text-sm font-semibold text-secondary-900">
                            {mobile} ({totalDevices > 0 ? Math.round((mobile / totalDevices) * 100) : 0}%)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Monitor className="w-4 h-4 text-purple-600 mr-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-secondary-500">Desktop</div>
                          <div className="text-sm font-semibold text-secondary-900">
                            {desktop} ({totalDevices > 0 ? Math.round((desktop / totalDevices) * 100) : 0}%)
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Tablet className="w-4 h-4 text-green-600 mr-1.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-secondary-500">Tablet</div>
                          <div className="text-sm font-semibold text-secondary-900">
                            {tablet} ({totalDevices > 0 ? Math.round((tablet / totalDevices) * 100) : 0}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Pages */}
                  {performer.topPages.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-secondary-700 mb-2">Top Pages</div>
                      <div className="space-y-1.5">
                        {performer.topPages.map((page, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-white rounded p-2 border border-secondary-100">
                            <span className="text-secondary-600 truncate mr-2" title={page.url}>
                              {shortenUrl(page.url)}
                            </span>
                            <span className="font-semibold text-secondary-900 flex-shrink-0">
                              {page.count} exec{page.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Metrics */}
                  <div>
                    <div className="text-xs font-semibold text-secondary-700 mb-2">Additional Metrics</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-secondary-500 mb-0.5">Avg per Page</div>
                        <div className="font-semibold text-secondary-900">{performer.executionsPerPage} executions</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary-500 mb-0.5">Last Executed</div>
                        <div className="font-semibold text-secondary-900">{formatTimeAgo(performer.lastExecuted)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary-500 mb-0.5">First Executed</div>
                        <div className="font-semibold text-secondary-900">{formatTimeAgo(performer.firstExecuted)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary-500 mb-0.5">Avg per Visitor</div>
                        <div className="font-semibold text-secondary-900">
                          {performer.uniqueSessions > 0 ? (performer.executions / performer.uniqueSessions).toFixed(1) : '0'} times
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopPerformers;

