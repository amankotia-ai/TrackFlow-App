import React, { useMemo, useState, useRef } from 'react';
import { Copy, Eye, BookTemplate, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Workflow, WorkflowTemplate } from '../types/workflow';
import * as Icons from 'lucide-react';
import TemplatePreviewModal from './TemplatePreviewModal';

interface TemplatesProps {
  templates: WorkflowTemplate[];
  onTemplateUse: (template: Workflow) => void;
}

const Templates: React.FC<TemplatesProps> = ({ templates, onTemplateUse }) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = (template: WorkflowTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewTemplate(null);
  };

  // Featured templates for carousel (show first 6-9 templates)
  const featuredTemplates = useMemo(() => {
    return templates.slice(0, 9);
  }, [templates]);

  // Templates per carousel view (responsive)
  const templatesPerView = 3;
  const maxIndex = Math.max(0, Math.ceil(featuredTemplates.length / templatesPerView) - 1);

  const handlePrevious = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCarouselIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Get visible templates for current carousel index
  const visibleTemplates = featuredTemplates.slice(
    carouselIndex * templatesPerView,
    (carouselIndex + 1) * templatesPerView
  );

  // Helper to get icon component
  const getIconComponent = (template: WorkflowTemplate) => {
    const triggerNode = template.nodes.find(node => node.type === 'trigger');
    if (triggerNode?.icon) {
      const IconComponent = Icons[triggerNode.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
      return IconComponent || BookTemplate;
    }
    return BookTemplate;
  };

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Featured Templates Carousel */}
        {featuredTemplates.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Featured Templates</h2>
                <p className="text-xs text-zinc-500 mt-1">Popular templates to get you started</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={carouselIndex === 0}
                  className="inline-flex items-center justify-center size-9 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={carouselIndex >= maxIndex}
                  className="inline-flex items-center justify-center size-9 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
            
            <div 
              ref={carouselRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {visibleTemplates.map((template) => {
                const IconComponent = getIconComponent(template);
                const category = template.templateMeta?.categoryLabel || 'General';
                const estimatedTime = template.templateMeta?.estimatedTime;
                const summary = template.templateMeta?.summary || template.description;
                const tags = template.templateMeta?.tags || [];

                return (
                  <div 
                    key={template.id} 
                    className="border border-zinc-200 rounded-md bg-white flex flex-col"
                  >
                    <div className="p-4 border-b border-zinc-100">
                      <IconComponent className="size-5 text-zinc-900 mb-3" />
                      <h3 className="text-sm font-medium text-zinc-900 mb-1">{template.name}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2">{template.description}</p>
                    </div>
                    
                    <div className="p-4 flex-1">
                      {summary && summary !== template.description && (
                        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{summary}</p>
                      )}
                      
                      {estimatedTime && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mb-3">
                          <Clock className="size-3" />
                          <span>{estimatedTime}</span>
                        </div>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.slice(0, 3).map((tag, idx) => (
                            <span 
                              key={idx}
                              className="inline-block text-xs px-2 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="inline-block text-xs px-2 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded">
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-600">{category}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(template)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors font-medium text-xs rounded-md"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => onTemplateUse(template)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium text-xs rounded-md"
                        >
                          <Copy className="size-3.5" />
                          <span>Use</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Carousel Indicators */}
            {maxIndex > 0 && (
              <div className="flex items-center justify-end gap-1.5 mt-4">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === carouselIndex 
                        ? 'w-8 bg-zinc-900' 
                        : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Section */}
        {templates.length === 0 ? (
          <div className="py-20 text-center border border-zinc-200 rounded-md bg-white">
            <BookTemplate className="size-6 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium mb-1">No templates available</h3>
            <p className="text-xs text-zinc-500">Check back later or create your own playbooks from scratch</p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-medium mb-1">All Templates</h2>
              <p className="text-xs text-zinc-500">{templates.length} pre-built templates ready to use</p>
            </div>
            
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                <div className="col-span-2">Template</div>
                <div>Category</div>
                <div className="col-span-2">Use Case</div>
                <div className="text-right">Actions</div>
              </div>
              {templates.map((template) => {
                  const IconComponent = getIconComponent(template);
                  const category = template.templateMeta?.categoryLabel || 'General';
                  const tags = template.templateMeta?.tags || [];
                  const useCase = tags.length > 0 ? tags.join(', ') : template.templateMeta?.summary || '';

                  return (
                    <div 
                      key={template.id} 
                      className="grid grid-cols-6 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center"
                    >
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <IconComponent className="size-4 text-zinc-700 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{template.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{template.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-zinc-600 text-xs">{category}</div>
                      <div className="col-span-2 text-xs text-zinc-500 truncate">{useCase}</div>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handlePreview(template)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors font-medium text-xs rounded-md"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => onTemplateUse(template)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium text-xs rounded-md"
                        >
                          <Copy className="size-3.5" />
                          <span>Use</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onUseTemplate={onTemplateUse}
      />
    </div>
  );
};

export default Templates;