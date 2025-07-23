import React, { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Layers, List, Target, Monitor, TreePine, Grid } from 'lucide-react';
import { ScrapingResult, ScrapedElement } from '../utils/scraper';
import HierarchicalView from './HierarchicalView';
import ElementSelectorModal from './ElementSelectorModal';
import VisualDOMView from './VisualDOMView';
import HierarchicalDOMView from './HierarchicalDOMView';
import { useHierarchicalScraper } from '../hooks/useHierarchicalScraper';

interface ScrapingResultsProps {
  result: ScrapingResult | null;
  onClose: () => void;
}

const ScrapingResults: React.FC<ScrapingResultsProps> = ({ result, onClose }) => {
  const [viewMode, setViewMode] = useState<'categorized' | 'hierarchical' | 'visual' | 'dom-tree'>('visual');
  const [isElementSelectorOpen, setIsElementSelectorOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { scrapingResult: hierarchicalResult, isScraping: isScrapingHierarchical, scrapeUrl: scrapeHierarchical } = useHierarchicalScraper();
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match the slide-down animation duration
  };
  
  // Trigger hierarchical scraping when DOM tree view is selected
  useEffect(() => {
    if (viewMode === 'dom-tree' && result?.url && !hierarchicalResult && !isScrapingHierarchical) {
      scrapeHierarchical(result.url);
    }
  }, [viewMode, result?.url, hierarchicalResult, isScrapingHierarchical, scrapeHierarchical]);
  
  if (!result) return null;

  const categorizedElements = result.data ? categorizeElements(result.data) : null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />
      
      {/* Bottom Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-50 ${
        isClosing ? 'animate-slide-down' : 'animate-slide-up'
      }`}>
        <div className="bg-white shadow-2xl max-h-[92vh] overflow-hidden border-t border-gray-200">
          {/* Handle Bar */}
          <div className="flex justify-center py-3 px-4 border-b border-gray-100 cursor-pointer" onClick={handleClose}>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full bottom-sheet-handle"></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
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
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(92vh-140px)] custom-scrollbar">
            <div className="max-w-5xl mx-auto">
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
                    onClick={() => setViewMode('visual')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'visual'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Visual Layout</span>
                  </button>
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
                  <button
                    onClick={() => setViewMode('dom-tree')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === 'dom-tree'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <TreePine className="w-4 h-4" />
                    <span>DOM Tree</span>
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

              {/* Visual DOM View */}
              {viewMode === 'visual' && result.data && (
                <VisualDOMView 
                  elements={result.data}
                  onElementSelect={(element, selector) => {
                    console.log('Selected element:', element);
                    console.log('Selected selector:', selector);
                    // You can integrate this with your workflow system
                    setIsElementSelectorOpen(true);
                  }}
                />
              )}

              {/* Hierarchical View */}
              {viewMode === 'hierarchical' && result.hierarchy && (
                <HierarchicalView 
                  elements={result.hierarchy}
                  onElementSelect={(element) => {
                    console.log('Selected element:', element);
                  }}
                />
              )}

              {/* DOM Tree View */}
              {viewMode === 'dom-tree' && (
                <div className="space-y-4">
                  {isScrapingHierarchical ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <TreePine className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Building DOM Tree</h3>
                        <p className="text-gray-500">Analyzing website structure...</p>
                      </div>
                    </div>
                  ) : hierarchicalResult?.success && hierarchicalResult.data ? (
                    <HierarchicalDOMView 
                      elements={hierarchicalResult.data}
                      onElementSelect={(element, selector) => {
                        console.log('Selected hierarchical element:', element);
                        console.log('Selected selector:', selector);
                        // Removed the setIsElementSelectorOpen(true) to prevent opening modal on row click
                      }}
                    />
                  ) : hierarchicalResult && !hierarchicalResult.success ? (
                    <div className="text-center py-12">
                      <div className="text-red-500 text-6xl mb-4">🌳</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Build DOM Tree</h3>
                      <p className="text-gray-500">{hierarchicalResult.error}</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">🌳</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No DOM Tree Data</h3>
                      <p className="text-gray-500">Try refreshing or selecting this view again.</p>
                    </div>
                  )}
                </div>
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
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                                  {element.tag}
                                </span>
                                {(element as any).duplicateGroup && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-mono">
                                    {(element as any).nthPosition}/{(element as any).totalSimilar}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">
                                  {element.text}
                                </p>
                                {element.selector && (
                                  <p className="text-xs text-gray-500 font-mono">
                                    {element.selector}
                                  </p>
                                )}
                                {(element as any).duplicateGroup && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    📍 Duplicate {(element as any).nthPosition} of {(element as any).totalSimilar}
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
    </>
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