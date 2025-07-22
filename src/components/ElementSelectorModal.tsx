import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Copy, Check, AlertCircle, Target, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrapedElement } from '../utils/scraperEnhanced';

interface ElementSelectorModalProps {
  elements: ScrapedElement[];
  isOpen: boolean;
  onClose: () => void;
  onElementSelect: (element: ScrapedElement, selector: string) => void;
}

const ElementSelectorModal: React.FC<ElementSelectorModalProps> = ({
  elements,
  isOpen,
  onClose,
  onElementSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElement, setSelectedElement] = useState<ScrapedElement | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string>('');
  const [copiedSelector, setCopiedSelector] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['headers', 'buttons', 'links']));

  // Categorize elements
  const categorizedElements = useMemo(() => {
    const categories: Record<string, ScrapedElement[]> = {
      headers: elements.filter(el => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tag)),
      paragraphs: elements.filter(el => el.tag === 'p'),
      buttons: elements.filter(el => el.tag === 'button' || (el.tag === 'a' && el.attributes?.class?.includes('btn'))),
      links: elements.filter(el => el.tag === 'a' && el.attributes?.href),
      inputs: elements.filter(el => ['input', 'textarea', 'select'].includes(el.tag)),
      lists: elements.filter(el => ['ul', 'ol', 'li'].includes(el.tag)),
      other: elements.filter(el => !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'input', 'textarea', 'select', 'ul', 'ol', 'li'].includes(el.tag))
    };

    // Filter by search term if provided
    if (searchTerm) {
      const filteredCategories: Record<string, ScrapedElement[]> = {};
      Object.entries(categories).forEach(([category, elements]) => {
        const filtered = elements.filter(element => 
          element.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          element.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
          element.selector?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          filteredCategories[category] = filtered;
        }
      });
      return filteredCategories;
    }

    return categories;
  }, [elements, searchTerm]);

  const handleElementClick = (element: ScrapedElement) => {
    setSelectedElement(element);
    setSelectedSelector(element.selector || '');
  };

  const handleSelectorChange = (selector: string) => {
    setSelectedSelector(selector);
  };

  const handleCopySelector = async (selector: string) => {
    try {
      await navigator.clipboard.writeText(selector);
      setCopiedSelector(selector);
      setTimeout(() => setCopiedSelector(''), 2000);
    } catch (error) {
      console.error('Failed to copy selector:', error);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedElement && selectedSelector) {
      onElementSelect(selectedElement, selectedSelector);
      onClose();
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 0.8) return 'text-green-600 bg-green-100';
    if (reliability >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getReliabilityText = (reliability: number) => {
    if (reliability >= 0.8) return 'High';
    if (reliability >= 0.5) return 'Medium';
    return 'Low';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'headers': return 'H';
      case 'paragraphs': return '¶';
      case 'buttons': return '⚡';
      case 'links': return '🔗';
      case 'inputs': return '📝';
      case 'lists': return '📋';
      case 'other': return '◈';
      default: return '•';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'headers': return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'paragraphs': return 'bg-secondary-100 text-secondary-700 border-secondary-200';
      case 'buttons': return 'bg-primary-50 text-primary-600 border-primary-200';
      case 'links': return 'bg-secondary-50 text-secondary-600 border-secondary-200';
      case 'inputs': return 'bg-secondary-100 text-secondary-700 border-secondary-200';
      case 'lists': return 'bg-secondary-50 text-secondary-600 border-secondary-200';
      case 'other': return 'bg-secondary-100 text-secondary-700 border-secondary-200';
      default: return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-primary-600" />
            <div>
              <h3 className="text-xl font-semibold text-secondary-900">
                Element Selector
              </h3>
              <p className="text-sm text-secondary-600">
                Choose an element and its CSS selector for automation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        <div className="flex h-[calc(85vh-88px)]">
          {/* Left Panel - Categorized Element List */}
          <div className="w-1/2 border-r border-secondary-200 flex flex-col">
            {/* Search */}
            <div className="p-6 border-b border-secondary-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {/* Categorized Element List */}
            <div className="flex-1 overflow-y-auto">
              {Object.keys(categorizedElements).length === 0 ? (
                <div className="p-6 text-center text-secondary-500">
                  <Target className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                  <p>No elements found</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {Object.entries(categorizedElements).map(([category, elements]) => {
                    if (elements.length === 0) return null;
                    
                    const isExpanded = expandedCategories.has(category);
                    const categoryColor = getCategoryColor(category);
                    
                    return (
                      <div key={category} className="border border-secondary-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category)}
                          className={`w-full px-4 py-3 flex items-center justify-between hover:bg-secondary-50 transition-colors ${categoryColor}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-semibold">{getCategoryIcon(category)}</span>
                            <span className="font-medium capitalize">{category}</span>
                            <span className="text-sm bg-white/50 px-2 py-1 rounded-full">
                              {elements.length}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t border-secondary-200 bg-white">
                            {elements.map((element: ScrapedElement, index: number) => (
                              <div
                                key={index}
                                onClick={() => handleElementClick(element)}
                                className={`
                                  p-3 cursor-pointer transition-colors border-b border-secondary-100 last:border-b-0
                                  ${selectedElement === element 
                                    ? 'bg-primary-50 border-primary-300' 
                                    : 'hover:bg-secondary-50'
                                  }
                                `}
                              >
                                <div className="flex items-start space-x-3">
                                  <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded font-mono flex-shrink-0">
                                    {element.tag}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-secondary-900 line-clamp-2 mb-1">
                                      {element.text}
                                    </p>
                                    {element.selector && (
                                      <p className="text-xs text-secondary-500 font-mono break-all">
                                        {element.selector}
                                      </p>
                                    )}
                                    {element.selectorReliability !== undefined && (
                                      <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${getReliabilityColor(element.selectorReliability)}`}>
                                        {getReliabilityText(element.selectorReliability)} reliability
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Selector Details */}
          <div className="w-1/2 flex flex-col">
            {selectedElement ? (
              <>
                {/* Element Details */}
                <div className="p-6 border-b border-secondary-200">
                  <h4 className="font-semibold text-secondary-900 mb-3">Selected Element</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded font-mono flex-shrink-0">
                        {selectedElement.tag}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-secondary-900 leading-relaxed">
                          {selectedElement.text}
                        </p>
                      </div>
                    </div>
                    {selectedElement.attributes && Object.keys(selectedElement.attributes).length > 0 && (
                      <div className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded">
                        <strong>Attributes:</strong> {Object.entries(selectedElement.attributes).map(([key, value]) => `${key}="${value}"`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selector Strategies */}
                <div className="flex-1 overflow-y-auto p-6">
                  <h4 className="font-semibold text-secondary-900 mb-4">CSS Selector Strategies</h4>
                  
                  {/* Primary Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Primary Selector
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={selectedSelector}
                        onChange={(e) => handleSelectorChange(e.target.value)}
                        className="flex-1 px-4 py-3 border border-secondary-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="CSS selector..."
                      />
                      <button
                        onClick={() => handleCopySelector(selectedSelector)}
                        className="px-4 py-3 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors"
                        title="Copy selector"
                      >
                        {copiedSelector === selectedSelector ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-secondary-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Alternative Strategies */}
                  {selectedElement.selectorStrategies && selectedElement.selectorStrategies.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-secondary-700 mb-3">Alternative Selectors</h5>
                      <div className="space-y-3">
                        {selectedElement.selectorStrategies.slice(0, 5).map((strategy, index) => (
                          <div
                            key={index}
                            className="p-4 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
                            onClick={() => handleSelectorChange(strategy.selector)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-sm text-secondary-900 break-all mb-1">
                                  {strategy.selector}
                                </div>
                                <div className="text-xs text-secondary-500">
                                  {strategy.description}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-3">
                                <span className={`text-xs px-2 py-1 rounded ${getReliabilityColor(strategy.reliability)}`}>
                                  {Math.round(strategy.reliability * 100)}%
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopySelector(strategy.selector);
                                  }}
                                  className="p-1 hover:bg-secondary-200 rounded"
                                  title="Copy selector"
                                >
                                  <Copy className="w-4 h-4 text-secondary-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback Selectors */}
                  {selectedElement.fallbackSelectors && selectedElement.fallbackSelectors.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-secondary-700 mb-3">Fallback Selectors</h5>
                      <div className="space-y-2">
                        {selectedElement.fallbackSelectors.map((selector, index) => (
                          <div
                            key={index}
                            className="p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
                            onClick={() => handleSelectorChange(selector)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-sm text-secondary-900 break-all flex-1">
                                {selector}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySelector(selector);
                                }}
                                className="p-1 hover:bg-secondary-200 rounded ml-2"
                                title="Copy selector"
                              >
                                <Copy className="w-4 h-4 text-secondary-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Info */}
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Zap className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-primary-800 font-medium">Selector Validation</p>
                        <p className="text-primary-700 text-xs mt-1">
                          This selector has been validated against the page structure. 
                          {selectedElement.selectorReliability !== undefined && (
                            <span> Reliability: {Math.round(selectedElement.selectorReliability * 100)}%</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 border-t border-secondary-200">
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border border-secondary-300 rounded-lg text-secondary-700 hover:bg-secondary-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSelection}
                      disabled={!selectedSelector}
                      className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Use This Selector
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-secondary-500">
                <div className="text-center">
                  <Target className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Select an Element</p>
                  <p className="text-sm">Choose an element from the list to view selector options</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal outside of parent container
  return createPortal(modalContent, document.body);
};

export default ElementSelectorModal; 