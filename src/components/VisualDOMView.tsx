import React, { useState, useMemo } from 'react';
import { Monitor, Smartphone, Eye, Code, MousePointer, ChevronDown, ChevronRight, Hash, Type, Square, Link, Zap } from 'lucide-react';
import { ScrapedElement } from '../utils/scraper';

interface VisualDOMViewProps {
  elements: ScrapedElement[];
  onElementSelect?: (element: ScrapedElement, selector: string) => void;
}

interface CleanElement {
  element: ScrapedElement;
  count: number; // How many similar elements this represents
  isImportant: boolean; // Whether this element is semantically important
  category: 'navigation' | 'header' | 'content' | 'action' | 'footer' | 'form' | 'misc';
}

const VisualDOMView: React.FC<VisualDOMViewProps> = ({ elements, onElementSelect }) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ScrapedElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Intelligent deduplication and categorization
  const cleanedElements = useMemo(() => {
    const elementMap = new Map<string, CleanElement>();
    const seenTexts = new Map<string, number>();

    elements.forEach(element => {
      const text = element.text?.trim() || '';
      
      // Skip elements with no meaningful content
      if (!text || text.length < 5) return;
      
      // Skip script/style content
      if (['script', 'style', 'meta', 'link'].includes(element.tag)) return;

      // Normalize text for comparison
      const normalizedText = text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();

      // Determine category based on element characteristics
      const category = categorizeElement(element);
      
      // Determine importance
      const isImportant = isElementImportant(element);
      
      // Create a key for grouping similar elements
      const key = createElementKey(element, normalizedText);
      
      // Count similar texts
      const textCount = (seenTexts.get(normalizedText) || 0) + 1;
      seenTexts.set(normalizedText, textCount);
      
      if (!elementMap.has(key)) {
        elementMap.set(key, {
          element,
          count: 1,
          isImportant,
          category
        });
      } else {
        // Update count and potentially upgrade the element if this one is better
        const existing = elementMap.get(key)!;
        existing.count += 1;
        
        // Use element with better selector or more attributes
        if (isElementBetter(element, existing.element)) {
          existing.element = element;
        }
      }
    });

    return Array.from(elementMap.values())
      .filter(cleanElement => {
        // Filter out elements that appear too many times (likely noise)
        const textCount = seenTexts.get(
          cleanElement.element.text?.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim() || ''
        ) || 1;
        
        // Keep important elements even if repeated, but limit noise
        return cleanElement.isImportant || textCount <= 3 || cleanElement.count <= 2;
      })
      .sort((a, b) => {
        // Sort by importance, then by category order
        if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
        return getCategoryOrder(a.category) - getCategoryOrder(b.category);
      });
  }, [elements]);

  // Categorize elements by their semantic meaning
  function categorizeElement(element: ScrapedElement): CleanElement['category'] {
    const tag = element.tag.toLowerCase();
    const text = element.text?.toLowerCase() || '';
    const selector = element.selector?.toLowerCase() || '';
    const className = element.attributes?.class?.toLowerCase() || '';

    // Navigation elements
    if (tag === 'nav' || 
        selector.includes('nav') || 
        className.includes('nav') ||
        (tag === 'a' && (text.match(/^(home|about|contact|products|services|menu)$/i) || 
                        element.attributes?.href === '/' || 
                        element.attributes?.href === '#'))) {
      return 'navigation';
    }

    // Header elements
    if (tag.match(/^h[1-6]$/) || 
        selector.includes('header') || 
        className.includes('header') ||
        (tag === 'header')) {
      return 'header';
    }

    // Footer elements
    if (selector.includes('footer') || 
        className.includes('footer') ||
        tag === 'footer' ||
        text.includes('copyright') || 
        text.includes('©') || 
        text.includes('privacy') || 
        text.includes('terms')) {
      return 'footer';
    }

    // Action elements (buttons, CTAs)
    if (tag === 'button' || 
        (tag === 'a' && className.includes('btn')) ||
        className.includes('button') ||
        text.match(/^(get started|sign up|learn more|contact|download|buy now|subscribe)$/i)) {
      return 'action';
    }

    // Form elements
    if (['input', 'textarea', 'select', 'form', 'label'].includes(tag)) {
      return 'form';
    }

    // Content elements
    if (['p', 'div', 'span', 'article', 'section'].includes(tag) && text.length > 20) {
      return 'content';
    }

    return 'misc';
  }

  function isElementImportant(element: ScrapedElement): boolean {
    const tag = element.tag.toLowerCase();
    const text = element.text || '';
    const selector = element.selector || '';

    // Always important: headings, navigation, buttons, forms
    if (tag.match(/^h[1-6]$/) || 
        tag === 'button' || 
        tag === 'nav' ||
        ['input', 'textarea', 'select', 'form'].includes(tag)) {
      return true;
    }

    // Important if it's a meaningful link
    if (tag === 'a' && element.attributes?.href) {
      return true;
    }

    // Important if it's in header/footer/nav
    if (selector.includes('header') || 
        selector.includes('footer') || 
        selector.includes('nav')) {
      return true;
    }

    // Important if it's long content
    if (text.length > 50 && ['p', 'div'].includes(tag)) {
      return true;
    }

    // Important if it has an ID
    if (element.attributes?.id) {
      return true;
    }

    return false;
  }

  function createElementKey(element: ScrapedElement, normalizedText: string): string {
    const tag = element.tag;
    const hasAttributes = element.attributes && Object.keys(element.attributes).length > 0;
    
    // For headings and important elements, use more specific keys
    if (tag.match(/^h[1-6]$/) || element.attributes?.id) {
      return `${tag}-${normalizedText}-${element.attributes?.id || 'no-id'}`;
    }
    
    // For elements with meaningful attributes, include them
    if (hasAttributes) {
      const attrKey = Object.entries(element.attributes || {})
        .filter(([key, value]) => ['class', 'id', 'href'].includes(key))
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      return `${tag}-${normalizedText.substring(0, 50)}-${attrKey}`;
    }
    
    // For simple elements, group by tag and text
    return `${tag}-${normalizedText.substring(0, 100)}`;
  }

  function isElementBetter(newElement: ScrapedElement, existing: ScrapedElement): boolean {
    // Prefer elements with IDs
    if (newElement.attributes?.id && !existing.attributes?.id) return true;
    if (!newElement.attributes?.id && existing.attributes?.id) return false;
    
    // Prefer elements with more attributes
    const newAttrs = Object.keys(newElement.attributes || {}).length;
    const existingAttrs = Object.keys(existing.attributes || {}).length;
    if (newAttrs !== existingAttrs) return newAttrs > existingAttrs;
    
    // Prefer shorter, more specific selectors
    const newSelectorLen = newElement.selector?.length || 999;
    const existingSelectorLen = existing.selector?.length || 999;
    return newSelectorLen < existingSelectorLen;
  }

  function getCategoryOrder(category: CleanElement['category']): number {
    const order = { navigation: 1, header: 2, content: 3, action: 4, form: 5, footer: 6, misc: 7 };
    return order[category] || 999;
  }

  const groupedElements = useMemo(() => {
    const groups = new Map<string, CleanElement[]>();
    
    cleanedElements.forEach(cleanElement => {
      const category = cleanElement.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cleanElement);
    });

    return groups;
  }, [cleanedElements]);

  const handleElementClick = (element: ScrapedElement) => {
    setSelectedElement(element);
    if (onElementSelect) {
      onElementSelect(element, element.selector || element.tag);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return <Hash className="w-4 h-4" />;
      case 'header': return <Type className="w-4 h-4" />;
      case 'content': return <Square className="w-4 h-4" />;
      case 'action': return <Zap className="w-4 h-4" />;
      case 'form': return <Square className="w-4 h-4" />;
      case 'footer': return <Link className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'header': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'content': return 'bg-green-50 border-green-200 text-green-800';
      case 'action': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'form': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'footer': return 'bg-gray-50 border-gray-200 text-gray-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getElementTypeIcon = (tag: string) => {
    if (tag.match(/^h[1-6]$/)) return '📰';
    if (tag === 'button') return '🔘';
    if (tag === 'a') return '🔗';
    if (['input', 'textarea', 'select'].includes(tag)) return '📝';
    if (tag === 'p') return '📄';
    if (['div', 'section', 'article'].includes(tag)) return '📦';
    return '📋';
  };

  const filteredGroups = useMemo(() => {
    if (activeCategory === 'all') return groupedElements;
    
    const filtered = new Map();
    if (groupedElements.has(activeCategory)) {
      filtered.set(activeCategory, groupedElements.get(activeCategory));
    }
    return filtered;
  }, [groupedElements, activeCategory]);

  return (
    <div className="visual-dom-view bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header Controls */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Clean DOM Structure</span>
            </h3>
            <span className="text-sm text-gray-500">
              {cleanedElements.length} unique elements
              {elements.length !== cleanedElements.length && 
                <span className="text-gray-400"> (from {elements.length} scraped)</span>
              }
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCode(!showCode)}
              className={`p-2 rounded ${showCode ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({cleanedElements.length})
          </button>
          {Array.from(groupedElements.entries()).map(([category, elements]) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                activeCategory === category 
                  ? getCategoryColor(category) 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category} ({elements.length})
            </button>
          ))}
        </div>
      </div>

      {/* Clean Element Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className={`
          p-6 min-h-full
          ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'max-w-5xl mx-auto'}
        `}>
          {Array.from(filteredGroups.entries()).map(([categoryName, categoryElements]) => (
            <div key={categoryName} className="mb-8">
              {/* Category Header */}
              <div className={`flex items-center space-x-3 p-4 rounded-lg border mb-4 ${getCategoryColor(categoryName)}`}>
                {getCategoryIcon(categoryName)}
                <h3 className="font-semibold capitalize">{categoryName}</h3>
                <span className="text-sm opacity-75">
                  {categoryElements.length} elements
                </span>
              </div>

              {/* Elements Grid */}
              <div className="grid gap-3">
                                 {categoryElements.map((cleanElement: CleanElement, index: number) => {
                  const element = cleanElement.element;
                  const isSelected = selectedElement === element;
                  
                  return (
                    <div
                      key={`${categoryName}-${index}`}
                      className={`
                        group relative p-4 rounded-lg border cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? 'border-blue-300 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }
                        ${cleanElement.isImportant ? 'ring-2 ring-blue-100' : ''}
                      `}
                      onClick={() => handleElementClick(element)}
                    >
                      {/* Element Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getElementTypeIcon(element.tag)}</span>
                          <div>
                            <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                              {element.tag}
                            </span>
                            {cleanElement.count > 1 && (
                              <span className="ml-2 inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                ×{cleanElement.count}
                              </span>
                            )}
                            {cleanElement.isImportant && (
                              <span className="ml-2 inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                                ⭐ Important
                              </span>
                            )}
                          </div>
                        </div>
                        <MousePointer className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Element Content */}
                      <div className="mb-3">
                        <p className={`
                          text-gray-900 line-clamp-2
                          ${element.tag.startsWith('h') ? 'font-semibold text-lg' : ''}
                          ${element.tag === 'button' ? 'font-medium text-blue-600' : ''}
                          ${element.tag === 'a' ? 'text-blue-600' : ''}
                        `}>
                          {element.text || '<No text content>'}
                        </p>
                      </div>

                      {/* Element Details */}
                      {showCode && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          {element.selector && (
                            <div className="text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded">
                              {element.selector}
                            </div>
                          )}
                          {element.attributes && Object.keys(element.attributes).length > 0 && (
                            <div className="text-xs text-gray-500">
                              <strong>Attributes:</strong>{' '}
                              {Object.entries(element.attributes)
                                .filter(([key]) => ['id', 'class', 'href'].includes(key))
                                .map(([key, value]) => `${key}="${value}"`)
                                .join(', ')
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {cleanedElements.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No elements found</h3>
              <p className="text-gray-500">Try scraping a different URL or check your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Element Details */}
      {selectedElement && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
            <span>{getElementTypeIcon(selectedElement.tag)}</span>
            <span>Selected Element</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div><strong>Tag:</strong> {selectedElement.tag}</div>
              <div><strong>Text:</strong> {selectedElement.text}</div>
            </div>
            <div>
              {selectedElement.selector && (
                <div><strong>Selector:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{selectedElement.selector}</code></div>
              )}
              {selectedElement.attributes && Object.keys(selectedElement.attributes).length > 0 && (
                <div>
                  <strong>Attributes:</strong>
                  <div className="ml-4 mt-1 space-y-1">
                    {Object.entries(selectedElement.attributes).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <code>{key}:</code> <span className="text-gray-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualDOMView; 