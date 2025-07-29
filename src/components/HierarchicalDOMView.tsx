import React, { useState, useMemo } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Eye, 
  Code, 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  FileText, 
  Square,
  Circle,
  Triangle,
  Hash,
  Type,
  Zap,
  Link,
  Copy,
  Check
} from 'lucide-react';
import { optimizeSelectorForExecution, createClipboardData } from '../utils/selectorOptimizer';

// Updated interface for hierarchical elements
interface SelectorStrategy {
  selector: string;
  type: 'id' | 'class' | 'attribute' | 'path' | 'nth-child' | 'nth-of-type' | 'unique-path' | 'context';
  reliability: number;
  description: string;
  isUnique: boolean;
}

interface HierarchicalElement {
  id: string;
  tag: string;
  text: string;
  directText: string;
  selector: string;
  selectorStrategies?: SelectorStrategy[];
  uniqueSelector?: string;
  attributes?: Record<string, string>;
  children: HierarchicalElement[];
  parent?: string;
  depth: number;
  isContainer: boolean;
  hasContent: boolean;
  elementType: 'container' | 'content' | 'interactive' | 'media' | 'structure';
  position?: {
    indexInParent: number;
    indexOfType: number;
    totalSiblings: number;
    totalSiblingsOfType: number;
  };
}

interface HierarchicalDOMViewProps {
  elements: HierarchicalElement[];
  onElementSelect?: (element: HierarchicalElement, selector: string) => void;
}

const HierarchicalDOMView: React.FC<HierarchicalDOMViewProps> = ({ elements, onElementSelect }) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HierarchicalElement | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'containers' | 'content' | 'interactive'>('all');
  const [copiedElementId, setCopiedElementId] = useState<string | null>(null);
  const [showSelectorStrategies, setShowSelectorStrategies] = useState(false);

  // Auto-expand important containers on mount
  useMemo(() => {
    const autoExpand = new Set<string>();
    
    function markForExpansion(elements: HierarchicalElement[]) {
      elements.forEach(element => {
        // Auto-expand important structural elements
        if (['header', 'nav', 'main', 'footer', 'section'].includes(element.tag) || 
            element.elementType === 'structure' ||
            (element.isContainer && element.children.length > 0 && element.children.length <= 10)) {
          autoExpand.add(element.id);
        }
        
        // Recursively check children
        if (element.children.length > 0) {
          markForExpansion(element.children);
        }
      });
    }
    
    markForExpansion(elements);
    setExpandedNodes(autoExpand);
  }, [elements]);

  const filteredElements = useMemo(() => {
    if (filterType === 'all') return elements;
    
    function filterRecursive(elements: HierarchicalElement[]): HierarchicalElement[] {
      return elements.map(element => {
        const filteredChildren = filterRecursive(element.children);
        
        // Determine if this element should be included
        const shouldInclude = 
          filterType === 'containers' && (element.isContainer || element.elementType === 'structure') ||
          filterType === 'content' && element.elementType === 'content' ||
          filterType === 'interactive' && element.elementType === 'interactive';
        
        // Include element if it matches filter or has matching children
        if (shouldInclude || filteredChildren.length > 0) {
          return {
            ...element,
            children: filteredChildren
          };
        }
        
        return null;
      }).filter(Boolean) as HierarchicalElement[];
    }
    
    return filterRecursive(elements);
  }, [elements, filterType]);

  const handleElementClick = (element: HierarchicalElement) => {
    setSelectedElement(element);
    if (onElementSelect) {
      onElementSelect(element, element.selector);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const copySelector = async (element: HierarchicalElement, selectorType: 'class' | 'id' | 'full' | 'unique' | 'strategy' | 'optimized' = 'class', strategyIndex?: number) => {
    let selectorToCopy = '';
    let selectorDescription = '';
    
    if (selectorType === 'class' && element.attributes?.class) {
      const classes = element.attributes.class.split(' ').filter((cls: string) => cls.trim());
      if (classes.length > 0) {
        if (classes.length === 1) {
          selectorToCopy = `.${classes[0]}`;
          selectorDescription = `Class selector (${classes[0]})`;
        } else {
          const stableClasses = classes.filter((cls: string) => !cls.match(/^(hover:|focus:|active:|disabled:|selected:)/));
          if (stableClasses.length > 0) {
            const selectedClasses = stableClasses.slice(0, 3);
            selectorToCopy = `.${selectedClasses.join('.')}`;
            selectorDescription = `Combined class selector (${selectedClasses.join(', ')})`;
          } else {
            selectorToCopy = `.${classes[0]}`;
            selectorDescription = `Class selector (${classes[0]}) - Warning: May be dynamic`;
          }
        }
      }
    } else if (selectorType === 'id' && element.attributes?.id) {
      selectorToCopy = `#${element.attributes.id}`;
      selectorDescription = `ID selector (unique)`;
    } else if (selectorType === 'full') {
      selectorToCopy = element.selector;
      selectorDescription = `Primary selector`;
    } else if (selectorType === 'unique' && element.uniqueSelector) {
      selectorToCopy = element.uniqueSelector;
      selectorDescription = `Guaranteed unique selector`;
    } else if (selectorType === 'strategy' && element.selectorStrategies && strategyIndex !== undefined) {
      const strategy = element.selectorStrategies[strategyIndex];
      if (strategy) {
        selectorToCopy = strategy.selector;
        selectorDescription = `${strategy.type} selector (${Math.round(strategy.reliability * 100)}% reliable)`;
      }
    } else if (selectorType === 'optimized') {
      const metadata = optimizeSelectorForExecution(element, {
        includePosition: true,
        maxComplexity: 5
      });
      selectorToCopy = metadata.selector;
      selectorDescription = metadata.description;
    }
    
    if (selectorToCopy) {
      try {
        await navigator.clipboard.writeText(selectorToCopy);
        
        // Store enhanced metadata for configuration panel integration
        if (selectorType === 'optimized') {
          const metadata = optimizeSelectorForExecution(element, {
            includePosition: true,
            maxComplexity: 5
          });
          const clipboardData = createClipboardData(metadata, 'DOM Tree - Optimized');
          (window as any).trackflowClipboard = { lastCopiedSelector: clipboardData };
        } else {
          // Store basic metadata for other selector types
          const clipboardData = {
            selector: selectorToCopy,
            description: selectorDescription,
            elementInfo: {
              tag: element.tag,
              text: element.text?.substring(0, 50) || '',
              hasId: !!element.attributes?.id,
              hasClass: !!element.attributes?.class,
              elementType: element.elementType,
              isUnique: selectorType === 'id' || selectorType === 'unique'
            },
            reliability: selectorType === 'id' ? 0.95 : selectorType === 'unique' ? 0.9 : 0.7,
            executionHints: ['Consider using originalText for text-based actions'],
            source: 'DOM Tree'
          };
          (window as any).trackflowClipboard = { lastCopiedSelector: clipboardData };
        }
        
        setCopiedElementId(element.id);
        setTimeout(() => setCopiedElementId(null), 2000);
        
        console.log(`📋 Copied selector: ${selectorToCopy}`);
        
      } catch (err) {
        console.error('Failed to copy selector:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = selectorToCopy;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopiedElementId(element.id);
          setTimeout(() => setCopiedElementId(null), 2000);
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  const getElementIcon = (element: HierarchicalElement) => {
    const hasChildren = element.children.length > 0;
    const isExpanded = expandedNodes.has(element.id);
    
    // Container elements
    if (element.isContainer || element.elementType === 'structure') {
      if (hasChildren) {
        return isExpanded ? <FolderOpen className="w-4 h-4 text-blue-600" /> : <Folder className="w-4 h-4 text-blue-500" />;
      }
      return <Square className="w-4 h-4 text-blue-400" />;
    }
    
    // Interactive elements
    if (element.elementType === 'interactive') {
      return <Zap className="w-4 h-4 text-orange-500" />;
    }
    
    // Content elements
    if (element.tag.match(/^h[1-6]$/)) {
      return <Type className="w-4 h-4 text-purple-600" />;
    }
    
    if (element.tag === 'p') {
      return <FileText className="w-4 h-4 text-green-600" />;
    }
    
    if (element.tag === 'a') {
      return <Link className="w-4 h-4 text-blue-600" />;
    }
    
    // Default
    return <Circle className="w-3 h-3 text-gray-400" />;
  };

  const getElementTypeColor = (element: HierarchicalElement) => {
    switch (element.elementType) {
      case 'structure': return 'bg-blue-100 text-blue-800';
      case 'container': return 'bg-gray-100 text-gray-800';
      case 'content': return 'bg-green-100 text-green-800';
      case 'interactive': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const renderElement = (element: HierarchicalElement): React.ReactNode => {
    const hasChildren = element.children.length > 0;
    const isExpanded = expandedNodes.has(element.id);
    const isSelected = selectedElement?.id === element.id;

    return (
      <div key={element.id} className="select-none">
        {/* Element Row */}
        <div
          className={`
            flex items-center py-1 px-2 rounded-md cursor-pointer transition-all duration-150
            hover:bg-gray-100 group
            ${isSelected ? 'bg-blue-100 border border-blue-300' : ''}
            ${element.depth > 0 ? `ml-${Math.min(element.depth * 4, 20)}` : ''}
          `}
          style={{ marginLeft: `${element.depth * 20}px` }}
          onClick={() => handleElementClick(element)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(element.id);
              }}
              className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded mr-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </button>
          )}
          
          {/* Icon */}
          <div className="w-4 h-4 flex items-center justify-center mr-2">
            {getElementIcon(element)}
          </div>
          
          {/* Element Info */}
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">
                {element.tag}
              </span>
              
              {element.attributes?.id && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">
                  #{element.attributes.id}
                </span>
              )}
              
              {element.attributes?.class && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono max-w-xs truncate">
                  .{element.attributes.class.split(' ')[0]}
                  {element.attributes.class.split(' ').length > 1 && '...'}
                </span>
              )}
            </div>
            
            {element.text && (
              <div className="text-sm text-gray-900 truncate mt-1">
                {element.text.substring(0, 100)}
                {element.text.length > 100 && '...'}
              </div>
            )}
          </div>
          
          {/* Targeting Information */}
          {element.selectorStrategies && (
            <div className="flex items-center space-x-1">
              {element.selectorStrategies.some(s => s.isUnique) ? (
                <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center space-x-1" title="Has unique targeting options">
                  <Check className="w-3 h-3" />
                  <span>Unique</span>
                </div>
              ) : (
                <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center space-x-1" title="Multiple targeting strategies available">
                  <Triangle className="w-3 h-3" />
                  <span>Multi</span>
                </div>
              )}
              
              {element.position && element.position.totalSiblingsOfType > 1 && (
                <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full" title={`Position ${element.position.indexOfType + 1} of ${element.position.totalSiblingsOfType} similar elements`}>
                  {element.position.indexOfType + 1}/{element.position.totalSiblingsOfType}
                </div>
              )}
            </div>
          )}
          
          {/* Copy Selector Buttons */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1">
            {element.attributes?.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copySelector(element, 'id');
                }}
                className="p-1 hover:bg-blue-100 rounded-md flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200"
                title={`Copy ID selector: #${element.attributes.id}`}
              >
                {copiedElementId === element.id ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Hash className="w-3 h-3" />
                    <span>ID</span>
                  </>
                )}
              </button>
            )}
            
            {element.attributes?.class && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copySelector(element, 'class');
                }}
                className="p-1 hover:bg-gray-200 rounded-md flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800"
                title={`Copy class selector: .${element.attributes.class.split(' ')[0]}`}
              >
                {copiedElementId === element.id ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Class</span>
                  </>
                )}
              </button>
            )}
            
            {element.uniqueSelector && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copySelector(element, 'unique');
                }}
                className="p-1 hover:bg-green-100 rounded-md flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 border border-green-200"
                title={`Copy unique selector: ${element.uniqueSelector}`}
              >
                {copiedElementId === element.id ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Hash className="w-3 h-3" />
                    <span>Unique</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                copySelector(element, 'full');
              }}
              className="p-1 hover:bg-gray-200 rounded-md flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800"
              title={`Copy primary selector: ${element.selector}`}
            >
              {copiedElementId === element.id ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Hash className="w-3 h-3" />
                  <span>Primary</span>
                </>
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                copySelector(element, 'optimized');
              }}
              className="p-1 hover:bg-green-100 rounded-md flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 border border-green-200"
              title="Copy optimized selector for workflow execution"
            >
              {copiedElementId === element.id ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  <span>Optimized</span>
                </>
              )}
            </button>
          </div>
          
          {/* Element Type Badge */}
          <span className={`text-xs px-2 py-1 rounded-full ${getElementTypeColor(element)} text-gray-700`}>
            {element.elementType}
          </span>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {element.children.map(child => renderElement(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Code className="w-5 h-5 text-blue-600" />
          <span>DOM Structure</span>
          <span className="text-sm text-gray-500 font-normal">
            ({filteredElements.length} root elements)
          </span>
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Filter Buttons */}
          <div className="flex items-center space-x-1 bg-white rounded-lg border border-gray-200 p-1">
            {[
              { key: 'all', label: 'All', icon: Square },
              { key: 'containers', label: 'Containers', icon: Folder },
              { key: 'content', label: 'Content', icon: FileText },
              { key: 'interactive', label: 'Interactive', icon: Zap }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center space-x-1 ${
                  filterType === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          {/* View Toggle */}
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center space-x-2 ${
              showCode
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{showCode ? 'Hide Details' : 'Show Details'}</span>
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-1">
          {filteredElements.map(element => renderElement(element))}
        </div>
      </div>

      {/* Selected Element Details */}
      {selectedElement && showCode && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            {getElementIcon(selectedElement)}
            <span>Selected: &lt;{selectedElement.tag}&gt;</span>
            {selectedElement.selectorStrategies?.some(s => s.isUnique) && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Uniquely Targetable</span>
            )}
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div><strong>Element Type:</strong> {selectedElement.elementType}</div>
              <div><strong>Depth:</strong> {selectedElement.depth}</div>
              <div><strong>Children:</strong> {selectedElement.children.length}</div>
              <div><strong>Has Content:</strong> {selectedElement.hasContent ? 'Yes' : 'No'}</div>
              {selectedElement.position && (
                <>
                  <div><strong>Position in Parent:</strong> {selectedElement.position.indexInParent + 1} of {selectedElement.position.totalSiblings}</div>
                  <div><strong>Position of Type:</strong> {selectedElement.position.indexOfType + 1} of {selectedElement.position.totalSiblingsOfType}</div>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <div><strong>Primary Selector:</strong></div>
              <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                {selectedElement.selector}
              </code>
              
              {selectedElement.uniqueSelector && selectedElement.uniqueSelector !== selectedElement.selector && (
                <>
                  <div><strong>Guaranteed Unique Selector:</strong></div>
                  <code className="block bg-green-50 border border-green-200 p-2 rounded text-xs break-all">
                    {selectedElement.uniqueSelector}
                  </code>
                </>
              )}
              
              {selectedElement.attributes && Object.keys(selectedElement.attributes).length > 0 && (
                <>
                  <div><strong>Attributes:</strong></div>
                  <div className="bg-gray-100 p-2 rounded text-xs space-y-1">
                    {Object.entries(selectedElement.attributes).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-purple-700">{key}</span>=
                        <span className="text-green-700">"{value}"</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Selector Strategies */}
          {selectedElement.selectorStrategies && selectedElement.selectorStrategies.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">Available Targeting Strategies</div>
                <button
                  onClick={() => setShowSelectorStrategies(!showSelectorStrategies)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showSelectorStrategies ? 'Hide' : 'Show'} ({selectedElement.selectorStrategies.length})
                </button>
              </div>
              
              {showSelectorStrategies && (
                <div className="space-y-3">
                  {selectedElement.selectorStrategies.map((strategy, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            strategy.isUnique 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {strategy.type}
                          </span>
                          <span className="text-xs text-gray-600">
                            Reliability: {Math.round(strategy.reliability * 100)}%
                          </span>
                          {strategy.isUnique && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">UNIQUE</span>
                          )}
                        </div>
                        <button
                          onClick={() => copySelector(selectedElement, 'strategy', index)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">{strategy.description}</div>
                      <code className="block bg-white p-2 rounded text-xs break-all border">
                        {strategy.selector}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HierarchicalDOMView; 