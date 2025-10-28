import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subMetric?: string;
  trend?: {
    value: number;
    label: string;
  };
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon: Icon,
  subMetric,
  trend,
  actionButton
}) => {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;
  
  return (
    <div className="bg-white p-6 rounded-lg border border-secondary-200">
      {/* Icon and Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary-50 rounded-lg">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${
            isPositiveTrend ? 'text-green-600' : isNegativeTrend ? 'text-red-600' : 'text-secondary-600'
          }`}>
            {isPositiveTrend && <TrendingUp className="w-4 h-4 mr-1" />}
            {isNegativeTrend && <TrendingDown className="w-4 h-4 mr-1" />}
            <span>
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </div>
        )}
      </div>
      
      {/* Main Value */}
      <h3 className="text-3xl font-bold text-secondary-900 tracking-tight mb-1">
        {value}
      </h3>
      
      {/* Title */}
      <p className="text-sm font-medium text-secondary-600 mb-2">{title}</p>
      
      {/* Sub Metric */}
      {subMetric && (
        <p className="text-xs text-secondary-500 mt-2">{subMetric}</p>
      )}
      
      {/* Action Button */}
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          {actionButton.label} →
        </button>
      )}
    </div>
  );
};

export default EnhancedStatCard;

