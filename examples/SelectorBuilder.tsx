/**
 * Selector Builder Component
 * Visual tool for building and testing CSS selectors with multiple strategies
 */

import React, { useState, useEffect } from 'react';
import { Target, Check, AlertCircle, Info, Zap } from 'lucide-react';

interface TargetingStrategy {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type' | 'unique-path' | 'context';
  reliability: number;
  description: string;
  isUnique: boolean;
}

interface SelectorBuilderProps {
  initialSelector?: string;
  onSelectorChange: (selector: string, strategies: TargetingStrategy[]) => void;
  targetUrl?: string;
}

export const SelectorBuilder: React.FC<SelectorBuilderProps> = ({
  initialSelector = '',
  onSelectorChange,
  targetUrl
}) => {
  const [selector, setSelector] = useState(initialSelector);
  const [strategies, setStrategies] = useState<TargetingStrategy[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate selector in real-time
  useEffect(() => {
    validateSelector(selector);
  }, [selector]);

  const validateSelector = (sel: string) => {
    if (!sel.trim()) {
      setIsValid(false);
      setError(null);
      setMatchCount(0);
      return;
    }

    try {
      // Test if selector is valid CSS
      document.querySelectorAll(sel);
      setIsValid(true);
      setError(null);
      
      // Count matches
      const matches = document.querySelectorAll(sel).length;
      setMatchCount(matches);
      
      // Generate targeting strategies
      const generatedStrategies = generateStrategies(sel);
      setStrategies(generatedStrategies);
      
      // Notify parent
      onSelectorChange(sel, generatedStrategies);
    } catch (err) {
      setIsValid(false);
      setError('Invalid CSS selector');
      setMatchCount(0);
      setStrategies([]);
    }
  };

  const generateStrategies = (sel: string): TargetingStrategy[] => {
    const strats: TargetingStrategy[] = [];

    // Strategy 1: If it's an ID selector
    if (sel.startsWith('#')) {
      strats.push({
        selector: sel,
        type: 'id',
        reliability: 95,
        description: 'Unique ID selector',
        isUnique: true
      });
    }

    // Strategy 2: If it has data attributes
    const dataAttrMatch = sel.match(/\[data-([^\]]+)\]/);
    if (dataAttrMatch) {
      strats.push({
        selector: sel,
        type: 'attribute',
        reliability: 90,
        description: 'Data attribute selector',
        isUnique: true
      });
    }

    // Strategy 3: Class-based selector
    if (sel.includes('.')) {
      strats.push({
        selector: sel,
        type: 'class',
        reliability: 70,
        description: 'Class-based selector',
        isUnique: false
      });
    }

    // Strategy 4: nth-of-type fallback
    if (strats.length > 0) {
      strats.push({
        selector: `${sel}:nth-of-type(1)`,
        type: 'nth-of-type',
        reliability: 80,
        description: 'Position-based selector',
        isUnique: true
      });
    }

    return strats.sort((a, b) => b.reliability - a.reliability);
  };

  const handleQuickSelector = (type: string) => {
    let newSelector = '';
    switch (type) {
      case 'id':
        newSelector = '#my-element';
        break;
      case 'class':
        newSelector = '.my-class';
        break;
      case 'data-attr':
        newSelector = '[data-testid="my-element"]';
        break;
      case 'tag':
        newSelector = 'button';
        break;
    }
    setSelector(newSelector);
  };

  const getStatusColor = () => {
    if (!selector) return 'text-gray-400';
    if (!isValid) return 'text-red-600';
    if (matchCount === 0) return 'text-yellow-600';
    if (matchCount === 1) return 'text-green-600';
    return 'text-blue-600';
  };

  const getStatusIcon = () => {
    if (!isValid && selector) return <AlertCircle className="w-4 h-4" />;
    if (matchCount === 1) return <Check className="w-4 h-4" />;
    if (matchCount > 1) return <Info className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Selector Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CSS Selector
        </label>
        <div className="relative">
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder=".my-element, #element-id, [data-testid='btn']"
            className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
        </div>
        
        {/* Status Message */}
        {selector && (
          <div className={`mt-2 text-sm ${getStatusColor()}`}>
            {error ? (
              error
            ) : matchCount === 0 ? (
              'No elements match this selector'
            ) : matchCount === 1 ? (
              '✓ Unique element found'
            ) : (
              `⚠️ ${matchCount} elements match (may need disambiguation)`
            )}
          </div>
        )}
      </div>

      {/* Quick Selector Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Quick selectors:</span>
        <button
          onClick={() => handleQuickSelector('id')}
          className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
        >
          #id
        </button>
        <button
          onClick={() => handleQuickSelector('class')}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
        >
          .class
        </button>
        <button
          onClick={() => handleQuickSelector('data-attr')}
          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
        >
          [data-*]
        </button>
        <button
          onClick={() => handleQuickSelector('tag')}
          className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
        >
          tag
        </button>
      </div>

      {/* Targeting Strategies */}
      {strategies.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Targeting Strategies (Auto-generated)
          </h4>
          <div className="space-y-2">
            {strategies.map((strategy, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {strategy.type}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">
                      {strategy.description}
                    </span>
                  </div>
                  <code className="text-xs text-gray-800 mt-1 block font-mono">
                    {strategy.selector}
                  </code>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {strategy.isUnique && (
                    <Zap className="w-4 h-4 text-green-600" title="Unique selector" />
                  )}
                  <div className={`text-xs font-semibold ${
                    strategy.reliability >= 90 ? 'text-green-600' :
                    strategy.reliability >= 75 ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {strategy.reliability}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Tips for reliable selectors:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use IDs when possible (highest reliability)</li>
              <li>Data attributes are great for testing (data-testid, data-cy)</li>
              <li>Avoid position-based selectors (nth-child) as they're fragile</li>
              <li>Combine classes for more specific targeting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectorBuilder;



