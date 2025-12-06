/**
 * Example: Building a Trigger Node Component
 * Demonstrates how to create a configurable trigger node using React Hook Form + Zod
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, Clock, ArrowDown, Link, Route, MousePointer } from 'lucide-react';
import { WorkflowNode } from '../types/workflow';

// ===== TYPE DEFINITIONS =====

const triggerTypes = {
  'page-visits': {
    icon: Eye,
    label: 'Page Visits',
    description: 'Trigger when visitor reaches specific number of page views'
  },
  'time-on-page': {
    icon: Clock,
    label: 'Time on Page',
    description: 'Trigger when visitor spends specific time on page'
  },
  'scroll-depth': {
    icon: ArrowDown,
    label: 'Scroll Depth',
    description: 'Trigger when visitor scrolls to specific depth'
  },
  'utm-parameters': {
    icon: Link,
    label: 'UTM Parameters',
    description: 'Trigger based on UTM campaign parameters'
  },
  'user-journey': {
    icon: Route,
    label: 'User Journey',
    description: 'Trigger based on visitor navigation pattern'
  },
  'element-click': {
    icon: MousePointer,
    label: 'Element Click',
    description: 'Trigger when specific element is clicked'
  }
} as const;

type TriggerType = keyof typeof triggerTypes;

// ===== VALIDATION SCHEMAS =====

// Page Visits Schema
const pageVisitsSchema = z.object({
  triggerType: z.literal('page-visits'),
  visitCount: z.number().min(1).max(100),
  timeframe: z.enum(['session', 'day', 'week', 'month'])
});

// Time on Page Schema
const timeOnPageSchema = z.object({
  triggerType: z.literal('time-on-page'),
  duration: z.number().min(1).max(3600),
  unit: z.enum(['seconds', 'minutes'])
});

// Scroll Depth Schema
const scrollDepthSchema = z.object({
  triggerType: z.literal('scroll-depth'),
  percentage: z.number().min(0).max(100),
  element: z.string().optional()
});

// UTM Parameters Schema
const utmParametersSchema = z.object({
  triggerType: z.literal('utm-parameters'),
  parameter: z.enum(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']),
  operator: z.enum(['equals', 'contains', 'starts_with', 'exists']),
  value: z.string().optional()
});

// User Journey Schema
const userJourneySchema = z.object({
  triggerType: z.literal('user-journey'),
  pages: z.array(z.string()).min(2),
  order: z.enum(['sequence', 'any']),
  minIntentScore: z.number().min(0).max(1).optional()
});

// Element Click Schema
const elementClickSchema = z.object({
  triggerType: z.literal('element-click'),
  selector: z.string().min(1),
  requireText: z.boolean(),
  textContent: z.string().optional()
});

// Union of all trigger schemas
const triggerConfigSchema = z.discriminatedUnion('triggerType', [
  pageVisitsSchema,
  timeOnPageSchema,
  scrollDepthSchema,
  utmParametersSchema,
  userJourneySchema,
  elementClickSchema
]);

type TriggerConfig = z.infer<typeof triggerConfigSchema>;

// ===== COMPONENT =====

interface TriggerNodeConfigProps {
  node: WorkflowNode;
  onNodeUpdate: (node: WorkflowNode) => void;
}

export const TriggerNodeConfig: React.FC<TriggerNodeConfigProps> = ({
  node,
  onNodeUpdate
}) => {
  const [triggerType, setTriggerType] = useState<TriggerType>(
    (node.config.triggerType as TriggerType) || 'page-visits'
  );

  // Get the appropriate schema based on trigger type
  const getSchema = (type: TriggerType) => {
    const schemas = {
      'page-visits': pageVisitsSchema,
      'time-on-page': timeOnPageSchema,
      'scroll-depth': scrollDepthSchema,
      'utm-parameters': utmParametersSchema,
      'user-journey': userJourneySchema,
      'element-click': elementClickSchema
    };
    return schemas[type];
  };

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(getSchema(triggerType)),
    defaultValues: {
      triggerType,
      ...node.config
    }
  });

  const onSubmit = (data: any) => {
    const updatedNode: WorkflowNode = {
      ...node,
      name: triggerTypes[data.triggerType].label,
      config: data
    };
    onNodeUpdate(updatedNode);
  };

  const handleTriggerTypeChange = (newType: TriggerType) => {
    setTriggerType(newType);
    setValue('triggerType', newType);
  };

  // ===== RENDER TRIGGER-SPECIFIC FIELDS =====

  const renderTriggerFields = () => {
    switch (triggerType) {
      case 'page-visits':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Visits
              </label>
              <input
                type="number"
                {...register('visitCount', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.visitCount && (
                <p className="text-sm text-red-600 mt-1">{errors.visitCount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeframe
              </label>
              <select
                {...register('timeframe')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="session">Current Session</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </>
        );

      case 'time-on-page':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="number"
                {...register('duration', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.duration && (
                <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                {...register('unit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
          </>
        );

      case 'scroll-depth':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scroll Percentage
              </label>
              <input
                type="number"
                {...register('percentage', { valueAsNumber: true })}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.percentage && (
                <p className="text-sm text-red-600 mt-1">{errors.percentage.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">0-100%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Element (Optional)
              </label>
              <input
                type="text"
                {...register('element')}
                placeholder="#section-id, .class-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to track full page scroll
              </p>
            </div>
          </>
        );

      case 'utm-parameters':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UTM Parameter
              </label>
              <select
                {...register('parameter')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="utm_source">UTM Source</option>
                <option value="utm_medium">UTM Medium</option>
                <option value="utm_campaign">UTM Campaign</option>
                <option value="utm_term">UTM Term</option>
                <option value="utm_content">UTM Content</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                {...register('operator')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
                <option value="exists">Parameter Exists</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="text"
                {...register('value')}
                placeholder="e.g., google, facebook, email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for "exists" condition
              </p>
            </div>
          </>
        );

      case 'user-journey':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page URLs
              </label>
              <textarea
                {...register('pages')}
                rows={4}
                placeholder="/home&#10;/products&#10;/pricing"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                One URL per line
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                {...register('order')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="any">Any Order</option>
                <option value="sequence">Exact Sequence</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Intent Score (Optional)
              </label>
              <input
                type="number"
                {...register('minIntentScore', { valueAsNumber: true })}
                min="0"
                max="1"
                step="0.1"
                placeholder="0.7"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                0.0 = Low intent, 1.0 = High intent
              </p>
            </div>
          </>
        );

      case 'element-click':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Element Selector
              </label>
              <input
                type="text"
                {...register('selector')}
                placeholder=".cta-button, #signup-btn"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              {errors.selector && (
                <p className="text-sm text-red-600 mt-1">{errors.selector.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('requireText')}
                id="requireText"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="requireText" className="text-sm text-gray-700">
                Require specific text content
              </label>
            </div>
            {watch('requireText') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Content
                </label>
                <input
                  type="text"
                  {...register('textContent')}
                  placeholder="Sign Up"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Trigger Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trigger Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(triggerTypes).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTriggerTypeChange(key as TriggerType)}
              className={`flex items-center gap-2 p-3 border rounded-lg transition-all ${
                triggerType === key
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          {triggerTypes[triggerType].description}
        </p>
      </div>

      {/* Trigger-Specific Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {renderTriggerFields()}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Update Trigger
        </button>
      </form>
    </div>
  );
};

export default TriggerNodeConfig;







