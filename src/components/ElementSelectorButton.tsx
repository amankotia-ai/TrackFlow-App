import React, { useState } from 'react';
import { Target, X } from 'lucide-react';
import { ScrapedElement } from '../utils/scraperEnhanced';
import ElementSelectorModal from './ElementSelectorModal';

interface ElementSelectorButtonProps {
  elements: ScrapedElement[];
  onElementSelect: (element: ScrapedElement, selector: string) => void;
  className?: string;
  disabled?: boolean;
}

const ElementSelectorButton: React.FC<ElementSelectorButtonProps> = ({
  elements,
  onElementSelect,
  className = '',
  disabled = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleElementSelect = (element: ScrapedElement, selector: string) => {
    onElementSelect(element, selector);
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || elements.length === 0}
        className={`
          relative flex items-center justify-center p-2 rounded-lg transition-colors
          ${disabled || elements.length === 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
          }
          ${className}
        `}
        title={elements.length === 0 ? 'No elements available' : 'Select target element'}
      >
        <Target className="w-4 h-4" />
        {elements.length > 0 && (
          <span className="absolute -top-1 -right-1 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
            {elements.length}
          </span>
        )}
      </button>

      <ElementSelectorModal
        elements={elements}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onElementSelect={handleElementSelect}
      />
    </>
  );
};

export default ElementSelectorButton; 