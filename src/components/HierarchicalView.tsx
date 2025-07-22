import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, Tag } from 'lucide-react';
import { HierarchicalElement } from '../utils/scraper';

interface HierarchicalViewProps {
  elements: HierarchicalElement[];
  onElementSelect?: (element: HierarchicalElement) => void;
}

const HierarchicalView: React.FC<HierarchicalViewProps> = ({ 
  elements, 
  onElementSelect 
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderElement = (element: HierarchicalElement, depth: number = 0) => {
    const nodeId = `${element.tag}-${element.text?.substring(0, 20)}-${depth}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = element.children && element.children.length > 0;
    const isContainer = element.isContainer || hasChildren;

    return (
      <div key={nodeId} className="select-none">
        <div 
          className={`
            flex items-center space-x-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer
            ${depth > 0 ? 'ml-' + (depth * 4) : ''}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleNode(nodeId);
            }
            if (onElementSelect) {
              onElementSelect(element);
            }
          }}
        >
          {/* Indent based on depth */}
          <div style={{ width: `${depth * 16}px` }} />
          
          {/* Expand/Collapse icon */}
          {hasChildren && (
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
            </div>
          )}
          
          {/* Element icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {isContainer ? (
              <Folder className="w-3 h-3 text-blue-500" />
            ) : (
              <FileText className="w-3 h-3 text-green-500" />
            )}
          </div>
          
          {/* Tag name */}
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">
            {element.tag}
          </span>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 truncate">
              {element.text || (isContainer ? `Container (${element.children?.length || 0} children)` : 'No text')}
            </div>
            {element.selector && (
              <div className="text-xs text-gray-500 font-mono truncate">
                {element.selector}
              </div>
            )}
          </div>
          
          {/* Attributes indicator */}
          {element.attributes && Object.keys(element.attributes).length > 0 && (
            <div className="text-xs text-gray-400">
              {Object.keys(element.attributes).length} attr
            </div>
          )}
        </div>
        
        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {element.children.map((child, index) => 
              renderElement(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Page Structure</h3>
        <p className="text-xs text-gray-500">
          Click to expand/collapse sections. Shows parent-child relationships.
        </p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {elements.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No hierarchical data available
          </div>
        ) : (
          <div className="p-2">
            {elements.map((element, index) => renderElement(element))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalView; 