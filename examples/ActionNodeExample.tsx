/**
 * Example: Building Action Node Components
 * Demonstrates how to create configurable action nodes with element targeting
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Type, 
  Palette, 
  EyeOff, 
  Eye, 
  Plus, 
  MessageSquare,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { WorkflowNode } from '../types/workflow';
import SelectorBuilder from './SelectorBuilder';

// ===== ACTION TYPES =====

const actionTypes = {
  'replace-text': {
    icon: Type,
    label: 'Replace Text',
    description: 'Replace text content of an element'
  },
  'change-style': {
    icon: Palette,
    label: 'Change Style',
    description: 'Modify CSS properties of an element'
  },
  'hide-element': {
    icon: EyeOff,
    label: 'Hide Element',
    description: 'Hide an element from the page'
  },
  'show-element': {
    icon: Eye,
    label: 'Show Element',
    description: 'Show a hidden element'
  },
  'add-class': {
    icon: Plus,
    label: 'Add Class',
    description: 'Add CSS class to an element'
  },
  'display-overlay': {
    icon: MessageSquare,
    label: 'Display Overlay',
    description: 'Show a popup, banner, or notification'
  },
  'redirect': {
    icon: ExternalLink,
    label: 'Redirect',
    description: 'Redirect user to another page'
  },
  'replace-image': {
    icon: ImageIcon,
    label: 'Replace Image',
    description: 'Replace image source of an element'
  }
} as const;

type ActionType = keyof typeof actionTypes;

// ===== VALIDATION SCHEMAS =====

const replaceTextSchema = z.object({
  actionType: z.literal('replace-text'),
  selector: z.string().min(1, 'Selector is required'),
  newText: z.string().min(1, 'New text is required'),
  originalText: z.string().optional(),
  animation: z.enum(['none', 'fade', 'slide', 'scale']).default('fade'),
  preserveFormatting: z.boolean().default(true)
});

const changeStyleSchema = z.object({
  actionType: z.literal('change-style'),
  selector: z.string().min(1, 'Selector is required'),
  styleProperty: z.string().min(1, 'Style property is required'),
  styleValue: z.string().min(1, 'Style value is required'),
  applyToAll: z.boolean().default(false)
});

const hideElementSchema = z.object({
  actionType: z.literal('hide-element'),
  selector: z.string().min(1, 'Selector is required'),
  animation: z.enum(['none', 'fade', 'slide']).default('fade'),
  removeFromDOM: z.boolean().default(false)
});

const showElementSchema = z.object({
  actionType: z.literal('show-element'),
  selector: z.string().min(1, 'Selector is required'),
  animation: z.enum(['none', 'fade', 'slide']).default('fade')
});

const addClassSchema = z.object({
  actionType: z.literal('add-class'),
  selector: z.string().min(1, 'Selector is required'),
  className: z.string().min(1, 'Class name is required'),
  toggle: z.boolean().default(false)
});

const displayOverlaySchema = z.object({
  actionType: z.literal('display-overlay'),
  type: z.enum(['modal', 'banner', 'corner-notification', 'fullscreen']),
  content: z.string().min(1, 'Content is required'),
  position: z.enum(['top', 'bottom', 'left', 'right', 'center']).optional(),
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#000000'),
  showCloseButton: z.boolean().default(true),
  autoCloseDelay: z.number().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional()
});

const redirectSchema = z.object({
  actionType: z.literal('redirect'),
  url: z.string().url('Must be a valid URL'),
  delay: z.number().min(0).default(0),
  openInNewTab: z.boolean().default(false),
  passUtmParameters: z.boolean().default(false)
});

const replaceImageSchema = z.object({
  actionType: z.literal('replace-image'),
  selector: z.string().min(1, 'Selector is required'),
  newImageUrl: z.string().url('Must be a valid URL'),
  animation: z.enum(['none', 'fade', 'crossfade']).default('fade')
});

// ===== COMPONENT =====

interface ActionNodeConfigProps {
  node: WorkflowNode;
  onNodeUpdate: (node: WorkflowNode) => void;
  scrapedElements?: any[];
}

export const ActionNodeConfig: React.FC<ActionNodeConfigProps> = ({
  node,
  onNodeUpdate,
  scrapedElements = []
}) => {
  const [actionType, setActionType] = useState<ActionType>(
    (node.config.actionType as ActionType) || 'replace-text'
  );

  const getSchema = (type: ActionType) => {
    const schemas = {
      'replace-text': replaceTextSchema,
      'change-style': changeStyleSchema,
      'hide-element': hideElementSchema,
      'show-element': showElementSchema,
      'add-class': addClassSchema,
      'display-overlay': displayOverlaySchema,
      'redirect': redirectSchema,
      'replace-image': replaceImageSchema
    };
    return schemas[type];
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(getSchema(actionType)),
    defaultValues: {
      actionType,
      ...node.config
    }
  });

  const onSubmit = (data: any) => {
    const updatedNode: WorkflowNode = {
      ...node,
      name: actionTypes[data.actionType].label,
      config: data
    };
    onNodeUpdate(updatedNode);
  };

  const handleActionTypeChange = (newType: ActionType) => {
    setActionType(newType);
    setValue('actionType', newType);
  };

  const handleSelectorChange = (selector: string, strategies: any[]) => {
    setValue('selector', selector);
    // Store strategies for runtime targeting
    const updatedNode = {
      ...node,
      config: {
        ...node.config,
        selector,
        selectorStrategies: strategies
      }
    };
    onNodeUpdate(updatedNode);
  };

  // ===== RENDER ACTION-SPECIFIC FIELDS =====

  const renderActionFields = () => {
    switch (actionType) {
      case 'replace-text':
        return (
          <>
            <SelectorBuilder
              initialSelector={watch('selector')}
              onSelectorChange={handleSelectorChange}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Text
              </label>
              <textarea
                {...register('newText')}
                rows={3}
                placeholder="Enter new text content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.newText && (
                <p className="text-sm text-red-600 mt-1">{errors.newText.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Animation
              </label>
              <select
                {...register('animation')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="scale">Scale</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('preserveFormatting')}
                id="preserveFormatting"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="preserveFormatting" className="text-sm text-gray-700">
                Preserve HTML formatting
              </label>
            </div>
          </>
        );

      case 'change-style':
        return (
          <>
            <SelectorBuilder
              initialSelector={watch('selector')}
              onSelectorChange={handleSelectorChange}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style Property
              </label>
              <input
                type="text"
                {...register('styleProperty')}
                placeholder="backgroundColor, color, fontSize, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              {errors.styleProperty && (
                <p className="text-sm text-red-600 mt-1">{errors.styleProperty.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style Value
              </label>
              <input
                type="text"
                {...register('styleValue')}
                placeholder="#ff0000, 20px, bold, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
              {errors.styleValue && (
                <p className="text-sm text-red-600 mt-1">{errors.styleValue.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('applyToAll')}
                id="applyToAll"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="applyToAll" className="text-sm text-gray-700">
                Apply to all matching elements
              </label>
            </div>

            {/* Common CSS Property Shortcuts */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Common Properties:</p>
              <div className="flex flex-wrap gap-1">
                {['backgroundColor', 'color', 'fontSize', 'display', 'opacity', 'transform'].map(prop => (
                  <button
                    key={prop}
                    type="button"
                    onClick={() => setValue('styleProperty', prop)}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:border-primary-500 hover:text-primary-600 transition-colors"
                  >
                    {prop}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      case 'display-overlay':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overlay Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="modal">Modal (Center)</option>
                <option value="banner">Banner</option>
                <option value="corner-notification">Corner Notification</option>
                <option value="fullscreen">Fullscreen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                {...register('content')}
                rows={4}
                placeholder="Enter HTML content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.content && (
                <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">HTML is supported</p>
            </div>

            {watch('type') === 'banner' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  {...register('position')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <input
                  type="color"
                  {...register('backgroundColor')}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  {...register('textColor')}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('showCloseButton')}
                id="showCloseButton"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="showCloseButton" className="text-sm text-gray-700">
                Show close button
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto-close Delay (ms, optional)
              </label>
              <input
                type="number"
                {...register('autoCloseDelay', { valueAsNumber: true })}
                placeholder="5000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep open until closed
              </p>
            </div>

            {/* CTA Button */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Call-to-Action Button (Optional)
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    {...register('ctaText')}
                    placeholder="Get Started"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Link
                  </label>
                  <input
                    type="url"
                    {...register('ctaLink')}
                    placeholder="https://example.com/signup"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </>
        );

      case 'redirect':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redirect URL
              </label>
              <input
                type="url"
                {...register('url')}
                placeholder="https://example.com/page"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {errors.url && (
                <p className="text-sm text-red-600 mt-1">{errors.url.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delay (ms)
              </label>
              <input
                type="number"
                {...register('delay', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Delay before redirect (0 = immediate)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('openInNewTab')}
                id="openInNewTab"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="openInNewTab" className="text-sm text-gray-700">
                Open in new tab
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('passUtmParameters')}
                id="passUtmParameters"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="passUtmParameters" className="text-sm text-gray-700">
                Pass UTM parameters to destination
              </label>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Action Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Action Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(actionTypes).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleActionTypeChange(key as ActionType)}
              className={`flex items-center gap-2 p-3 border rounded-lg transition-all ${
                actionType === key
                  ? 'border-green-500 bg-green-50 text-green-700'
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-800">
          {actionTypes[actionType].description}
        </p>
      </div>

      {/* Action-Specific Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {renderActionFields()}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Update Action
        </button>
      </form>
    </div>
  );
};

export default ActionNodeConfig;



