import React, { useMemo } from 'react';
import { WorkflowExecution } from '../services/analyticsService';
import { calculateHourlyData } from '../utils/dashboardHelpers';

interface ExecutionTimelineProps {
  executions: WorkflowExecution[];
}

const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({ executions }) => {
  const hourlyData = useMemo(() => calculateHourlyData(executions), [executions]);
  
  const maxValue = Math.max(...hourlyData.map(h => h.total), 1); // Minimum 1 to avoid division by zero
  const totalSuccess = hourlyData.reduce((sum, h) => sum + h.success, 0);
  const totalErrors = hourlyData.reduce((sum, h) => sum + h.error, 0);
  
  return (
    <div className="bg-white rounded-lg border border-secondary-200 p-6">
      <h3 className="text-sm font-semibold text-secondary-900 mb-4">
        Execution Timeline (Last 24 Hours)
      </h3>
      
      {/* Chart */}
      <div className="flex items-end space-x-0.5 h-32 mb-2">
        {hourlyData.map((data, i) => {
          const successHeight = maxValue > 0 ? (data.success / maxValue) * 100 : 0;
          const errorHeight = maxValue > 0 ? (data.error / maxValue) * 100 : 0;
          const total = data.success + data.error;
          
          return (
            <div 
              key={i} 
              className="flex-1 flex flex-col justify-end group relative"
              style={{ minWidth: '8px' }}
            >
              {/* Tooltip */}
              {total > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-secondary-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {i}:00 - {total} exec{total !== 1 ? 's' : ''}
                  <br />
                  ✓ {data.success} | ✗ {data.error}
                </div>
              )}
              
              {/* Error bar (on top) */}
              {data.error > 0 && (
                <div 
                  className="bg-red-500 hover:bg-red-600 transition-colors"
                  style={{ 
                    height: `${errorHeight}%`,
                    minHeight: data.error > 0 ? '2px' : '0'
                  }}
                />
              )}
              
              {/* Success bar */}
              {data.success > 0 && (
                <div 
                  className={`bg-green-500 hover:bg-green-600 transition-colors ${data.error > 0 ? '' : 'rounded-t'}`}
                  style={{ 
                    height: `${successHeight}%`,
                    minHeight: data.success > 0 ? '2px' : '0'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Time labels */}
      <div className="flex justify-between text-xs text-secondary-500 mb-4">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
      
      {/* Summary stats */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-secondary-200 text-sm">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded mr-2"></span>
          <span className="text-secondary-600">Success: </span>
          <span className="font-semibold text-secondary-900 ml-1">{totalSuccess}</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-red-500 rounded mr-2"></span>
          <span className="text-secondary-600">Errors: </span>
          <span className="font-semibold text-secondary-900 ml-1">{totalErrors}</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutionTimeline;

