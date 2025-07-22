import React, { useState } from 'react';
import { X, ExternalLink, FileText, Layers, List, Target } from 'lucide-react';
import { ScrapingResult, ScrapedElement } from '../utils/scraper';
import HierarchicalView from './HierarchicalView';
import ElementSelectorModal from './ElementSelectorModal';

interface ScrapingResultsProps {
  result: ScrapingResult | null;
  onClose: () => void;
}

const ScrapingResults: React.FC<ScrapingResultsProps> = ({ result, onClose }) => {
  const [viewMode, setViewMode] = useState<'categorized' | 'hierarchical'>('hierarchical');
  const [isElementSelectorOpen, setIsElementSelectorOpen] = useState(false);
  
  if (!result) return null;

  const categorizedElements = result.data ? categorizeElements(result.data) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Scraping Results
              </h3>
              <p className="text-sm text-gray-500">
                {result.url} • {result.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {!result.success ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Scraping Failed
              </h3>
              <p className="text-gray-600">{result.error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">
                    Successfully scraped {result.data?.length || 0} elements
                  </span>
                </div>
                {result.debugInfo && (
                  <div className="mt-2 text-xs text-green-700">
                    <p>HTML length: {result.debugInfo.htmlLength.toLocaleString()} chars</p>
                    <p>Main content: {result.debugInfo.mainContentSelector}</p>
                    <p>Total elements: {result.debugInfo.totalElements} → {result.debugInfo.filteredElements} unique</p>
                  </div>
                )}
              </div>

              {/* View Mode Toggle and Element Selector */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('hierarchical')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'hierarchical'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Structure</span>
                  </button>
                  <button
                    onClick={() => setViewMode('categorized')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'categorized'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Categories</span>
                  </button>
                </div>
                
                {/* Element Selector Button */}
                <button
                  onClick={() => setIsElementSelectorOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Target className="w-4 h-4" />
                  <span>Select Element</span>
                </button>
              </div>

              {/* Hierarchical View */}
              {viewMode === 'hierarchical' && result.hierarchy && (
                <HierarchicalView 
                  elements={result.hierarchy}
                  onElementSelect={(element) => {
                    console.log('Selected element:', element);
                  }}
                />
              )}

              {/* Categorized View */}
              {viewMode === 'categorized' && categorizedElements && (
                <div className="space-y-4">
                  {Object.entries(categorizedElements).map(([category, elements]) => {
                    if (elements.length === 0) return null;
                    
                    return (
                      <div key={category} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {category} ({elements.length})
                          </h4>
                        </div>
                        <div className="p-4 space-y-2">
                          {elements.slice(0, 5).map((element, index) => (
                            <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                                {element.tag}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">
                                  {element.text}
                                </p>
                                {element.selector && (
                                  <p className="text-xs text-gray-500 font-mono">
                                    {element.selector}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          {elements.length > 5 && (
                            <p className="text-xs text-gray-500 text-center py-2">
                              ... and {elements.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Raw Data Toggle */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100">
                  <span className="font-medium text-gray-900">View Raw Data</span>
                </summary>
                <div className="p-4">
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
      
      {/* Element Selector Modal */}
      {result.data && (
        <ElementSelectorModal
          elements={result.data}
          isOpen={isElementSelectorOpen}
          onClose={() => setIsElementSelectorOpen(false)}
          onElementSelect={(element, selector) => {
            console.log('Selected element:', element);
            console.log('Selected selector:', selector);
            // Here you can integrate with your workflow system
            // For now, we'll just log the selection
            alert(`Selected element: ${element.text}\nSelector: ${selector}`);
          }}
        />
      )}
    </div>
  );
};

// Helper function to categorize elements (same as in scraper.ts)
function categorizeElements(elements: ScrapedElement[]) {
  const categories = {
    headers: elements.filter(el => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tag)),
    paragraphs: elements.filter(el => el.tag === 'p'),
    buttons: elements.filter(el => el.tag === 'button' || (el.tag === 'a' && el.attributes?.class?.includes('btn'))),
    links: elements.filter(el => el.tag === 'a' && el.attributes?.href),
    inputs: elements.filter(el => ['input', 'textarea', 'select'].includes(el.tag)),
    lists: elements.filter(el => ['ul', 'ol', 'li'].includes(el.tag)),
    other: elements.filter(el => !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'input', 'textarea', 'select', 'ul', 'ol', 'li'].includes(el.tag))
  };

  return categories;
}

export default ScrapingResults; 