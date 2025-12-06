import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { 
  Eye, 
  Copy, 
  Search,
  Zap,
  Clock,
  Layers,
  BookTemplate
} from 'lucide-react';
import { 
  WorkflowTemplate, 
  TemplateCategoryGroupDefinition,
  TemplateCategoryGroup 
} from '../types/workflow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateGalleryProps {
  templates: WorkflowTemplate[];
  categoryGroups: TemplateCategoryGroupDefinition[];
  onTemplatePreview: (template: WorkflowTemplate) => void;
  onTemplateUse: (template: WorkflowTemplate) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  categoryGroups,
  onTemplatePreview,
  onTemplateUse,
}) => {
  const [activeGroup, setActiveGroup] = useState<TemplateCategoryGroup>('generic');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get current group definition
  const currentGroup = useMemo(
    () => categoryGroups.find(g => g.id === activeGroup),
    [categoryGroups, activeGroup]
  );

  // Filter templates based on active group, category, and search
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter(t => t.templateMeta.group === activeGroup);

    // Filter by category if one is selected
    if (activeCategory) {
      filtered = filtered.filter(t => t.templateMeta.categoryId === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.templateMeta.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, activeGroup, activeCategory, searchQuery]);

  // Group templates by category for display
  const templatesByCategory = useMemo(() => {
    if (!currentGroup) return {};

    const grouped: Record<string, WorkflowTemplate[]> = {};

    currentGroup.categories.forEach(cat => {
      grouped[cat.id] = filteredTemplates.filter(
        t => t.templateMeta.categoryId === cat.id
      );
    });

    return grouped;
  }, [currentGroup, filteredTemplates]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalTemplates: filteredTemplates.length,
      byDifficulty: {
        beginner: filteredTemplates.filter(t => t.templateMeta.difficulty === 'Beginner').length,
        intermediate: filteredTemplates.filter(t => t.templateMeta.difficulty === 'Intermediate').length,
        advanced: filteredTemplates.filter(t => t.templateMeta.difficulty === 'Advanced').length,
      },
      avgNodes: filteredTemplates.length > 0 
        ? Math.round(filteredTemplates.reduce((sum, t) => sum + t.nodes.length, 0) / filteredTemplates.length)
        : 0,
      categories: Object.keys(templatesByCategory).filter(cat => templatesByCategory[cat].length > 0).length
    };
  }, [filteredTemplates, templatesByCategory]);

  const getTriggerCount = (template: WorkflowTemplate) =>
    template.nodes.filter(n => n.type === 'trigger').length;

  const getActionCount = (template: WorkflowTemplate) =>
    template.nodes.filter(n => n.type === 'action').length;

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Intermediate':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Advanced':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-zinc-50 text-zinc-700 border border-zinc-200';
    }
  };

  return (
    <div className="flex-1 bg-white">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Grid - Matching Analytics Style */}
        <div className="grid grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-md mb-6 overflow-hidden">
          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <BookTemplate className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Templates</span>
            </div>
            <div className="text-3xl font-light mb-1">{stats.totalTemplates}</div>
            <div className="text-xs text-zinc-500">{stats.categories} categories</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Avg Nodes</span>
            </div>
            <div className="text-3xl font-light mb-1">{stats.avgNodes}</div>
            <div className="text-xs text-zinc-500">per template</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Beginner</span>
            </div>
            <div className="text-3xl font-light mb-1">{stats.byDifficulty.beginner}</div>
            <div className="text-xs text-zinc-500">easy to start</div>
          </div>

          <div className="bg-white p-6 hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Advanced</span>
            </div>
            <div className="text-3xl font-light mb-1">{stats.byDifficulty.advanced}</div>
            <div className="text-xs text-zinc-500">power users</div>
          </div>
        </div>

        {/* Group Tabs & Search Bar */}
        <div className="border border-zinc-200 bg-white rounded-md overflow-hidden mb-6">
          {/* Tabs */}
          <div className="border-b border-zinc-100">
            <div className="flex px-6">
              {categoryGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroup(group.id);
                    setActiveCategory(null);
                  }}
                  className={`py-4 px-4 text-sm font-medium transition-colors relative ${
                    activeGroup === group.id
                      ? 'text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {group.label}
                  {activeGroup === group.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Group Description & Filters */}
          <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
            <p className="text-xs text-zinc-600 mb-3">{currentGroup?.description}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {currentGroup && currentGroup.categories.length > 0 && (
                <Select value={activeCategory || 'all'} onValueChange={(value) => setActiveCategory(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-[200px] h-10 text-sm border-zinc-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-200">
                    <SelectItem value="all" className="text-sm">All Categories</SelectItem>
                    {currentGroup.categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Templates Display */}
        {filteredTemplates.length === 0 ? (
          <div className="py-20 text-center border border-zinc-200 rounded-md bg-white">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
              <Search className="size-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium mb-1">No templates found</h3>
            <p className="text-xs text-zinc-500">
              {searchQuery
                ? 'Try a different search term'
                : 'No templates available in this category'}
            </p>
          </div>
        ) : activeCategory ? (
          // Single Category View
          <div className="border border-zinc-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
              <div className="col-span-2">Template</div>
              <div>Difficulty</div>
              <div>Nodes</div>
              <div>Time</div>
              <div className="text-right">Actions</div>
            </div>
            {filteredTemplates.map((template) => {
              const IconComponent = template.templateMeta.icon
                ? (Icons as any)[template.templateMeta.icon]
                : Zap;

              return (
                <div key={template.id} className="grid grid-cols-6 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center">
                  <div className="col-span-2 flex items-center gap-3 min-w-0">
                    <div className="size-10 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
                      {IconComponent && <IconComponent className="size-5 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{template.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{template.description}</div>
                    </div>
                  </div>
                  <div>
                    {template.templateMeta.difficulty && (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded ${getDifficultyColor(template.templateMeta.difficulty)}`}>
                        {template.templateMeta.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600 text-xs">
                    <span>{getTriggerCount(template)}T</span>
                    <span>•</span>
                    <span>{getActionCount(template)}A</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {template.templateMeta.estimatedTime || '—'}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onTemplatePreview(template)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors font-medium text-xs rounded-md"
                    >
                      <Eye className="size-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => onTemplateUse(template)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium text-xs rounded-md"
                    >
                      <Copy className="size-3.5" />
                      <span>Use</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // All Categories View
          <div className="space-y-6">
            {currentGroup?.categories.map(category => {
              const categoryTemplates = templatesByCategory[category.id] || [];
              if (categoryTemplates.length === 0) return null;

              const CategoryIcon = category.icon
                ? (Icons as any)[category.icon]
                : null;

              return (
                <div key={category.id}>
                  <div className="mb-4 flex items-center gap-3">
                    {CategoryIcon && (
                      <div className="size-8 rounded-md bg-blue-50 flex items-center justify-center">
                        <CategoryIcon className="size-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-medium">{category.label}</h2>
                      {category.description && (
                        <p className="text-xs text-zinc-500">{category.description}</p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-zinc-500">
                      {categoryTemplates.length} templates
                    </span>
                  </div>
                  
                  <div className="border border-zinc-200 rounded-md overflow-hidden">
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                      <div className="col-span-2">Template</div>
                      <div>Difficulty</div>
                      <div>Nodes</div>
                      <div>Time</div>
                      <div className="text-right">Actions</div>
                    </div>
                    {categoryTemplates.map((template) => {
                      const IconComponent = template.templateMeta.icon
                        ? (Icons as any)[template.templateMeta.icon]
                        : Zap;

                      return (
                        <div key={template.id} className="grid grid-cols-6 gap-4 px-4 py-3 text-sm border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors items-center">
                          <div className="col-span-2 flex items-center gap-3 min-w-0">
                            <div className="size-10 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
                              {IconComponent && <IconComponent className="size-5 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{template.name}</div>
                              <div className="text-xs text-zinc-500 truncate">{template.description}</div>
                            </div>
                          </div>
                          <div>
                            {template.templateMeta.difficulty && (
                              <span className={`inline-block text-xs px-2 py-0.5 rounded ${getDifficultyColor(template.templateMeta.difficulty)}`}>
                                {template.templateMeta.difficulty}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600 text-xs">
                            <span>{getTriggerCount(template)}T</span>
                            <span>•</span>
                            <span>{getActionCount(template)}A</span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {template.templateMeta.estimatedTime || '—'}
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onTemplatePreview(template)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors font-medium text-xs rounded-md"
                            >
                              <Eye className="size-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => onTemplateUse(template)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium text-xs rounded-md"
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;

