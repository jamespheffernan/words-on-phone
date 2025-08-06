import React, { useMemo } from 'react';
import { CategoryMetadata } from '../types/category';
import { getCategoryIcon } from '../types/category';

interface VirtualizedCategoryGridProps {
  categories: CategoryMetadata[];
  selected: string[];
  onToggle: (name: string) => void;
  onTogglePin: (name: string) => void;
  pinnedCategories: string[];
  itemHeight?: number;
  maxVisibleItems?: number;
}

export const VirtualizedCategoryGrid: React.FC<VirtualizedCategoryGridProps> = ({
  categories,
  selected,
  onToggle,
  onTogglePin,
  pinnedCategories,
  itemHeight = 100,
  maxVisibleItems = 20
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Calculate visible range for virtual scrolling
  const visibleRange = useMemo(() => {
    const containerHeight = maxVisibleItems * itemHeight;
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.min(Math.ceil(containerHeight / itemHeight) + 1, categories.length - start);
    
    return {
      start: Math.max(0, start),
      end: Math.min(categories.length, start + visibleCount),
      visibleCount
    };
  }, [scrollTop, itemHeight, maxVisibleItems, categories.length]);
  
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  const visibleCategories = categories.slice(visibleRange.start, visibleRange.end);
  const totalHeight = categories.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  // Don't use virtualization for small datasets
  const shouldVirtualize = categories.length > maxVisibleItems;
  
  if (!shouldVirtualize) {
    return (
      <div className="category-grid">
        {categories.map(({ name, phraseCount }) => (
          <CategoryTile
            key={name}
            name={name}
            phraseCount={phraseCount}
            selected={selected.includes(name)}
            pinned={pinnedCategories.includes(name)}
            onToggle={onToggle}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className="virtualized-category-container"
      style={{ 
        height: Math.min(totalHeight, maxVisibleItems * itemHeight),
        overflowY: 'auto'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <div className="category-grid">
            {visibleCategories.map(({ name, phraseCount }) => (
              <CategoryTile
                key={name}
                name={name}
                phraseCount={phraseCount}
                selected={selected.includes(name)}
                pinned={pinnedCategories.includes(name)}
                onToggle={onToggle}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryTileProps {
  name: string;
  phraseCount: number;
  selected: boolean;
  pinned: boolean;
  onToggle: (name: string) => void;
  onTogglePin: (name: string) => void;
}

const CategoryTile: React.FC<CategoryTileProps> = React.memo(({
  name,
  phraseCount,
  selected,
  pinned,
  onToggle,
  onTogglePin
}) => {
  const handleToggle = React.useCallback(() => onToggle(name), [name, onToggle]);
  const handleTogglePin = React.useCallback(() => onTogglePin(name), [name, onTogglePin]);
  
  return (
    <label className={`category-tile ${selected ? 'selected' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={handleToggle}
      />
      <button
        aria-label={pinned ? "Unpin" : "Pin"}
        className={`pin-btn ${pinned ? 'pinned' : ''}`}
        onClick={handleTogglePin}
        type="button"
      >
        {pinned ? '★' : '☆'}
      </button>
      <span className="category-icon">
        {getCategoryIcon(name)}
      </span>
      <span className="name">{name}</span>
      <span className="count">({phraseCount})</span>
    </label>
  );
});

CategoryTile.displayName = 'CategoryTile';