import React, { useState, useMemo } from 'react';
import { CategoryMetadata } from '../types/category';
import { useGameStore } from '../store';
import { DEFAULT_CATEGORY_GROUPS, groupCategoriesByGroup, CategoryGroup, getCategoryIcon } from '../types/category';
import { analytics } from '../services/analytics';
import './CategorySelector.css';

type SortKey = 'name' | 'count';

interface Props {
  defaultCategories: CategoryMetadata[];
  customCategories: CategoryMetadata[];
  selected: string[];
  onChange: (selected: string[]) => void;
  loading?: boolean;
}

interface AccordionGroupProps {
  group: CategoryGroup;
  categories: CategoryMetadata[];
  selected: string[];
  onToggleCategory: (name: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  pinnedCategories: string[];
  onTogglePin: (category: string) => void;
  sortKey: SortKey;
}

const AccordionGroup: React.FC<AccordionGroupProps> = ({
  group,
  categories,
  selected,
  onToggleCategory,
  isExpanded,
  onToggleExpanded,
  pinnedCategories,
  onTogglePin,
  sortKey
}) => {
  const sortedCategories = useMemo(() => {
    const pinned = categories.filter(c => pinnedCategories.includes(c.name));
    const others = categories.filter(c => !pinnedCategories.includes(c.name));
    const sortFn = sortKey === 'name'
      ? (a: CategoryMetadata, b: CategoryMetadata) => a.name.localeCompare(b.name)
      : (a: CategoryMetadata, b: CategoryMetadata) => b.phraseCount - a.phraseCount;
    
    return [
      ...pinned.sort(sortFn),
      ...others.sort(sortFn)
    ];
  }, [categories, pinnedCategories, sortKey]);

  const selectedInGroup = categories.filter(cat => selected.includes(cat.name)).length;
  const totalInGroup = categories.length;

  return (
    <div className="accordion-group">
      <button 
        className="accordion-header"
        onClick={onToggleExpanded}
        aria-expanded={isExpanded}
        aria-label={`${group.name} category group, ${selectedInGroup} of ${totalInGroup} selected`}
      >
        <div className="accordion-header-content">
          <span className="accordion-icon">{group.emoji}</span>
          <span className="accordion-title">{group.name}</span>
          <span className="accordion-count">({selectedInGroup}/{totalInGroup})</span>
        </div>
        <span className={`accordion-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="accordion-content">
          <div className="category-grid">
            {sortedCategories.map(({ name, phraseCount }) => (
              <label key={name} className={`category-tile ${selected.includes(name) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(name)}
                  onChange={() => onToggleCategory(name)}
                />
                <button
                  type="button"
                  className={`pin-btn ${pinnedCategories.includes(name) ? 'pinned' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onTogglePin(name); }}
                  aria-label={pinnedCategories.includes(name) ? 'Unpin' : 'Pin'}
                >★</button>
                <span className="category-icon">{getCategoryIcon(name)}</span>
                <span className="name">{name}</span>
                <span className="count">({phraseCount})</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const CategorySelector: React.FC<Props> = ({
  defaultCategories,
  customCategories,
  selected,
  onChange,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default');
  const [search, setSearch] = useState('');
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  const { 
    pinnedCategories, 
    togglePinnedCategory, 
    expandedGroups, 
    toggleGroupExpanded,
    expandAllGroups,
    collapseAllGroups
  } = useGameStore();
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const rawList = activeTab === 'default' ? defaultCategories : customCategories;
  
  // Optimized filtering with search - memoized for performance with large datasets
  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    if (activeTab === 'default') {
      const grouped = groupCategoriesByGroup(defaultCategories);
      
      // If no search, return all groups
      if (!searchLower) {
        return { groupedCategories: grouped, flatList: [] };
      }
      
      // Filter categories within each group based on search
      const filteredGrouped: Record<string, CategoryMetadata[]> = {};
      Object.entries(grouped).forEach(([groupId, categories]) => {
        const filtered = categories.filter(cat => 
          cat.name.toLowerCase().includes(searchLower)
        );
        if (filtered.length > 0) {
          filteredGrouped[groupId] = filtered;
        }
      });
      
      return { groupedCategories: filteredGrouped, flatList: [] };
    } else {
      // Custom categories - filter and sort
      let filtered = rawList;
      if (searchLower) {
        filtered = rawList.filter(cat => 
          cat.name.toLowerCase().includes(searchLower)
        );
      }
      
      const pinned = filtered.filter(c => pinnedCategories.includes(c.name));
      const others = filtered.filter(c => !pinnedCategories.includes(c.name));
      const sortFn = sortKey === 'name'
        ? (a: CategoryMetadata, b: CategoryMetadata) => a.name.localeCompare(b.name)
        : (a: CategoryMetadata, b: CategoryMetadata) => b.phraseCount - a.phraseCount;
      
      return {
        groupedCategories: {},
        flatList: [
          ...pinned.sort(sortFn),
          ...others.sort(sortFn)
        ]
      };
    }
  }, [activeTab, defaultCategories, rawList, pinnedCategories, sortKey, search]);

  const { groupedCategories, flatList } = filteredData;

  const toggleCategory = (name: string) => {
    const exists = selected.includes(name);
    const next = exists ? selected.filter((n) => n !== name) : [...selected, name];
    onChange(next);
    
    // Track category selection
    if (!exists) { // Only track when selecting, not deselecting
      // Find category for validation (currently unused but may be needed for future validation)
      // const category = rawList.find(c => c.name === name);
      const categoryGroup = activeTab === 'default' 
        ? DEFAULT_CATEGORY_GROUPS.find(group => group.categoryNames.includes(name))?.name
        : undefined;
      
      analytics.track('category_selected', {
        categoryName: name,
        source: 'grid',
        categoryGroup,
        selectionIndex: rawList.findIndex(c => c.name === name),
        isMultiSelect: selected.length > 0 || next.length > 1
      });
    }
  };

  // Bulk operations
  const selectAll = () => onChange(rawList.map(l => l.name));
  const clearAll = () => onChange([]);
  const invertSelection = () => {
    const next = rawList.map(l => l.name).filter(name => !selected.includes(name));
    onChange(next);
  };

  const hasAllExpanded = DEFAULT_CATEGORY_GROUPS.every(group => expandedGroups.has(group.id));

  return (
    <div className="category-selector">
      <div className="tabs">
        <button
          className={activeTab === 'default' ? 'active' : ''}
          onClick={() => setActiveTab('default')}
        >
          Default
        </button>
        <button
          className={activeTab === 'custom' ? 'active' : ''}
          onClick={() => setActiveTab('custom')}
        >
          Custom
        </button>
      </div>

      <div className="compact-toolbar">
        {/* Essential controls - always visible */}
        <div className="essential-controls">
          <button onClick={clearAll} type="button" className="clear-btn" title="Clear all selections">
            🗑️ Clear
          </button>
          
          {activeTab === 'default' && (
            <button 
              onClick={hasAllExpanded ? collapseAllGroups : expandAllGroups} 
              type="button"
              className="expand-toggle-btn"
              title={hasAllExpanded ? 'Collapse all groups' : 'Expand all groups'}
            >
              {hasAllExpanded ? '📁' : '📂'}
            </button>
          )}
          
          <button 
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            type="button" 
            className="advanced-toggle"
            title="Show advanced controls"
          >
            ⚙️ {showAdvancedControls ? 'Less' : 'More'}
          </button>
        </div>

        {/* Advanced controls - collapsible */}
        {showAdvancedControls && (
          <div className="advanced-controls">
            <select 
              value={sortKey} 
              onChange={(e) => setSortKey(e.target.value as SortKey)} 
              aria-label="Sort categories"
              className="sort-select"
            >
              <option value="name">A→Z</option>
              <option value="count">By Count</option>
            </select>
            
            <button onClick={selectAll} type="button" className="select-all-btn">
              ✅ Select All
            </button>
            
            <button onClick={invertSelection} type="button" className="invert-btn">
              🔄 Invert
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        placeholder="Search categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {loading ? (
        <p>Loading categories...</p>
      ) : (
        <div className="category-content">
                     {activeTab === 'default' ? (
             // Accordion grouping for default categories
             <div className="accordion-container">
               {DEFAULT_CATEGORY_GROUPS.map(group => {
                 const groupCategories = (groupedCategories as Record<string, CategoryMetadata[]>)[group.id] || [];
                 // Skip empty groups
                 if (groupCategories.length === 0) return null;
                 
                 return (
                   <AccordionGroup
                     key={group.id}
                     group={group}
                     categories={groupCategories}
                     selected={selected}
                     onToggleCategory={toggleCategory}
                     isExpanded={expandedGroups.has(group.id)}
                     onToggleExpanded={() => toggleGroupExpanded(group.id)}
                     pinnedCategories={pinnedCategories}
                     onTogglePin={togglePinnedCategory}
                     sortKey={sortKey}
                   />
                 );
               })}
               
               {/* Show ungrouped categories if any */}
               {activeTab === 'default' && 
                (groupedCategories as Record<string, CategoryMetadata[]>).ungrouped && 
                (groupedCategories as Record<string, CategoryMetadata[]>).ungrouped.length > 0 && (
                 <AccordionGroup
                   key="ungrouped"
                   group={{
                     id: 'ungrouped',
                     name: 'Other Categories',
                     emoji: '📂',
                     categoryNames: (groupedCategories as Record<string, CategoryMetadata[]>).ungrouped.map((c: CategoryMetadata) => c.name),
                     description: 'Categories not in any group'
                   }}
                   categories={(groupedCategories as Record<string, CategoryMetadata[]>).ungrouped}
                   selected={selected}
                   onToggleCategory={toggleCategory}
                   isExpanded={expandedGroups.has('ungrouped')}
                   onToggleExpanded={() => toggleGroupExpanded('ungrouped')}
                   pinnedCategories={pinnedCategories}
                   onTogglePin={togglePinnedCategory}
                   sortKey={sortKey}
                 />
               )}
             </div>
          ) : (
            // Flat grid for custom categories
            <div className="category-grid">
              {flatList.map(({ name, phraseCount }) => (
                <label key={name} className={`category-tile ${selected.includes(name) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggleCategory(name)}
                  />
                  <button
                    type="button"
                    className={`pin-btn ${pinnedCategories.includes(name) ? 'pinned' : ''}`}
                    onClick={(e) => { e.stopPropagation(); togglePinnedCategory(name); }}
                    aria-label={pinnedCategories.includes(name) ? 'Unpin' : 'Pin'}
                  >★</button>
                  <span className="category-icon">{getCategoryIcon(name)}</span>
                  <span className="name">{name}</span>
                  <span className="count">({phraseCount})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 